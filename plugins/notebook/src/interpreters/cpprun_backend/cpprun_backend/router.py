import json
import asyncio
from pathlib import Path
from typing import Any
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from asyncio.subprocess import PIPE, Process

router = APIRouter()
"""
The router object.
"""

# Directory for variable files
VAR_DIR = Path("scope")
VAR_DIR.mkdir(exist_ok=True)

# Persistent Cling process
cling: Process | None = None
cling_lock = asyncio.Lock()  # serialize access


async def read_stream(stream, name):
    while True:
        line = await stream.readline()
        if not line:
            break
        print(f"[{name}] {line.decode().strip()}")


async def start_cling():
    global cling
    cling = await asyncio.create_subprocess_exec(
        "/home/greinisch/Projects/cling-build/bin/cling",
        "-std=c++17",
        stdin=PIPE,
        stdout=PIPE,
        stderr=PIPE,
    )
    if not cling or not cling.stdin:
        raise RuntimeError("cling not initialized")
    # preload json library
    # launch readers
    asyncio.create_task(read_stream(cling.stdout, "stdout"))
    asyncio.create_task(read_stream(cling.stderr, "stderr"))

    preload = (
        "#include <nlohmann/json.hpp>\n"
        '#include "cling/Interpreter/Interpreter.h"\n'
        "#include <iostream>\n"
        "using json = nlohmann::json;\n"
        'std::cout << "hello from cling" << std::endl;\n'
    )
    cling.stdin.write(preload.encode())
    await cling.stdin.drain()


@router.on_event("startup")
async def startup_event():
    await start_cling()


# ----------------------
# File-based scope utils
# ----------------------
def save_variable(cell_id: str, varname: str, value, is_output: bool):
    suffix = "OUT" if is_output else "IN"
    filename = VAR_DIR / f"{cell_id}_{suffix}_{varname}.json"
    with open(filename, "w") as f:
        json.dump(value, f)


def load_input_variables(cell_id: str):
    result = {}
    pattern = f"{cell_id}_IN_"
    for file in VAR_DIR.glob(f"{pattern}*.json"):
        varname = file.name.split("_", 2)[-1].rsplit(".json", 1)[0]
        with open(file) as f:
            result[varname] = json.load(f)
    return result


# ----------------------
# FastAPI endpoint
# ----------------------
@router.post("/run")
async def run_code(request: Request):
    global cling
    if not cling or not cling.stdin or not cling.stdout:
        raise RuntimeError("Cling is not initialized")

    body = await request.json()
    code = body.get("code", "")
    capture = body.get("capture", [])  # list of variable names
    cell_id = body.get("cellId", "default")

    # Load inputs from files
    input_scope = load_input_variables(cell_id)

    async with cling_lock:
        # Inject input variables into Cling
        for varname, value in input_scope.items():
            cmd = f'{varname} = json::parse(R"({json.dumps(value)})");\n'
            cling.stdin.write(cmd.encode())

        # Inject user code
        cling.stdin.write((code + "\n").encode())

        # Inject output capture commands with delimiters
        for varname in capture:
            cmd = (
                f'std::cout << "<<<CAPTURE_START>>>" << json({varname}).dump() '
                f'<< "<<<CAPTURE_END>>>" << std::endl;\n'
            )
            cling.stdin.write(cmd.encode())

        await cling.stdin.drain()

        # Read output lines until we have all captured variables
        captured_outputs: dict[str, Any] = {}
        stdout_text = ""
        stderr_text = ""

        for _ in range(len(capture)):
            try:
                line = await asyncio.wait_for(cling.stdout.readline(), timeout=2)
            except asyncio.TimeoutError:
                break
            text = line.decode(errors="ignore")
            stdout_text += text
            # Parse captured variable
            if "<<<CAPTURE_START>>>" in text and "<<<CAPTURE_END>>>" in text:
                start = text.index("<<<CAPTURE_START>>>") + len("<<<CAPTURE_START>>>")
                end = text.index("<<<CAPTURE_END>>>")
                json_str = text[start:end]
                varname = capture[len(captured_outputs)]
                try:
                    captured_outputs[varname] = json.loads(json_str)
                    # Save each output to a file
                    save_variable(
                        cell_id, varname, captured_outputs[varname], is_output=True
                    )
                except Exception:
                    captured_outputs[varname] = None

        return JSONResponse(
            {
                "stdout": stdout_text,
                "stderr": stderr_text,
                "results": captured_outputs,
                "status": "ok",
            }
        )
