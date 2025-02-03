"""
Module gathering the definition of endpoints.
"""

import io
import time
from contextlib import redirect_stderr, redirect_stdout
from typing import Any

from fastapi import APIRouter, Depends
from starlette.requests import Request
from starlette.responses import Response

from pyrun_backend.environment import Configuration, Environment
from pyrun_backend.schemas import RunBody, RunResponse

router = APIRouter()
"""
The router object.
"""


class ScopeStore:
    """
    Store the current global scope.
    """

    global_scope: dict[str, Any] = {}
    """
    The value of the scope.
    """


async def exec_and_capture_new_vars(code: str, scope: dict[str, Any]) -> dict[str, Any]:
    """
    Execute the provided code.

    Parameters:
        code: Code to interpret.
        scope: Entering scope.

    Returns:
        Exiting scope.
    """
    # This function was used to determine which variables were created or modified in a code cell.
    # It turns out that it is not really possible to determine which variables were modified in a code cell.
    # We keep a simple approach here using a single global state.
    to_async_code = (
        "\nasync def __exec(): "
        + "".join(f"\n {l}" for l in code.split("\n"))
        + "\n return locals()"
    )

    exec(to_async_code, scope)
    new_scope = await scope["__exec"]()
    return {**scope, **new_scope}


@router.get("/")
async def home() -> Response:
    """
    When proxied through py-youwol, this end point is always triggered, when testing weather a backend
    is listening. The line is `if not self.is_listening():` in `RedirectSwitch`
    """
    return Response(status_code=200)


@router.post("/run")
async def run_code(
    request: Request,
    body: RunBody,
    config: Configuration = Depends(Environment.get_config),
) -> RunResponse:
    """
    Run the provided code, optionally given captured input variables and returning the values of captured output.

    Parameters:
        request: Incoming request.
        body: Body specification.
        config: Injected configuration.

    Returns:
        Std outputs and eventual value of captured outputs.
    """
    code = body.code
    async with config.context(request).start(action="/run") as ctx:

        entering_scope = ScopeStore.global_scope
        try:
            scope = {**entering_scope, **body.capturedIn, "ctx": ctx}
            await ctx.info("Input scope prepared")

            start = time.time()
            cell_stdout = io.StringIO()
            cell_stderr = io.StringIO()
            with redirect_stdout(cell_stdout), redirect_stderr(cell_stderr):
                print(f"Execute cell {body.cellId}")
                new_scope = await exec_and_capture_new_vars(code, scope)

            end = time.time()
            output = cell_stdout.getvalue()
            error = cell_stderr.getvalue()
            await ctx.info(
                f"'exec(code, scope)' done in {int(1000*(end-start))} ms",
                data={"output": output, "error": error},
            )
            ScopeStore.global_scope = new_scope
            captured_out = {k: new_scope[k] for k in body.capturedOut if k}

            await ctx.info("Output scope persisted")
            return RunResponse(output=output, capturedOut=captured_out, error=error)
        except RuntimeError as e:
            return RunResponse(output="", capturedOut={}, error=str(e))
