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
from pyrun_backend.schemas import RunBody, RunResponse, ScriptError

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


async def exec_cell(
    cell_id: str, code: str, scope: dict[str, Any]
) -> dict[str, Any] | ScriptError:
    """
    Execute the provided code.

    Parameters:
        code: Code to interpret.
        scope: Entering scope.

    Returns:
        Exiting scope.
    """
    instrumented = f"""
import traceback
async def __exec():
    try:
        exec(compiled_src, globals())
        return locals()
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        for entry in reversed(tb):
            if entry.filename == "<{cell_id}>":
                error_line = entry.lineno  # Correct user script line number
                break
        else:
            error_line = None
            
        tb_list = traceback.format_exception(type(e), e, e.__traceback__)
        return ScriptError(kind='Runtime', message=str(e), stackTrace=tb_list, lineNumber=error_line)
"""
    try:
        scope["compiled_src"] = compile(code, f"<{cell_id}>", "exec")
    except (SyntaxError, IndentationError, TabError) as e:
        return ScriptError(kind="AST", message=str(e), lineNumber=e.lineno)
    scope["ScriptError"] = ScriptError
    exec(instrumented, scope)

    new_scope = await scope["__exec"]()
    if isinstance(new_scope, ScriptError):
        return new_scope

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
    Run the provided code, optionally given captured input variables and returning the values of captured outputs.

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
        scope = {**entering_scope, **body.capturedIn, "ctx": ctx}
        await ctx.info("Input scope prepared")

        start = time.time()
        cell_stdout = io.StringIO()
        cell_stderr = io.StringIO()
        with redirect_stdout(cell_stdout), redirect_stderr(cell_stderr):
            new_scope = await exec_cell(body.cellId, code, scope)
            if isinstance(new_scope, ScriptError):
                return RunResponse(
                    output=cell_stdout.getvalue(), capturedOut={}, error=new_scope
                )

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
        return RunResponse(output=output, capturedOut=captured_out)
