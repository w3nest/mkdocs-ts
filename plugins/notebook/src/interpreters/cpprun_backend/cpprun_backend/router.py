from fastapi import APIRouter, Depends, Request, Response
from cpprun_backend.environment import Configuration, Environment
from cpprun_backend.schemas import RunBody, RunResponse, ScriptError
from cpprun_backend.cling import ClingHandle

router = APIRouter()
"""
The router object.
"""


# ----------------------
# FastAPI endpoint
# ----------------------
@router.get("/")
async def healthz() -> Response:
    """
    When proxied through W3Nest, this end point is triggered to ensure a backend
    is listening.
    """
    return Response(status_code=200)


@router.post("/run")
async def run_code(
    request: Request,
    body: RunBody,
    config: Configuration = Depends(Environment.get_config),
) -> RunResponse:
    cling: ClingHandle = request.app.state.cling
    if not cling:
        raise RuntimeError("Cling is not initialized")

    code = body.code

    [captured_out, stdout, stderr] = await cling.execute_block(
        block=code, captured_in=body.capturedIn, captured_out=body.capturedOut
    )
    if stderr:
        return RunResponse(
            output=stdout,
            error=ScriptError(kind="AST", message=stderr),
            capturedOut=captured_out,
        )

    return RunResponse(
        output=stdout,
        capturedOut=captured_out,
    )
