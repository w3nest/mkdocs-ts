import json
import asyncio
from multiprocessing import shared_memory
from pathlib import Path
from typing import Any
import uuid
from asyncio.subprocess import PIPE, Process
import struct

# import posix_ipc
from cpprun_backend.environment import Configuration


# Persistent Cling process
cling_lock = asyncio.Lock()  # serialize access

# Same layout as your C++ Header
# uint32_t type, uint32_t count
HEADER_FMT = "II"  # two unsigned 32-bit integers
HEADER_SIZE = struct.calcsize(HEADER_FMT)

# Type codes (should match C++)
shm_size = 65536

TYPE_BOOL = 0
TYPE_INT = 1
TYPE_DOUBLE = 2
TYPE_STRING = 3
TYPE_VECTOR_DOUBLE = 4
TYPE_VECTOR_STRING = 5
TYPE_JSON = 6


def read_shm(shm_name="/cling_vars_out"):

    shm = shared_memory.SharedMemory(name=shm_name)
    buf = shm.buf

    header_bytes = bytes(buf[:HEADER_SIZE])
    type_code, count = struct.unpack(HEADER_FMT, header_bytes)

    payload_bytes = bytes(buf[HEADER_SIZE : HEADER_SIZE + count])

    shm.close()
    shm.unlink()

    if type_code == TYPE_INT:
        return struct.unpack("i", payload_bytes[:4])[0]
    elif type_code == TYPE_DOUBLE:
        return struct.unpack("d", payload_bytes[:8])[0]
    elif type_code == TYPE_STRING:
        return payload_bytes.decode("utf-8")
    elif type_code == TYPE_VECTOR_DOUBLE:
        return list(struct.unpack(f"{count}d", payload_bytes))
    elif type_code == TYPE_VECTOR_STRING:
        result = []
        offset = 0
        while offset < count:
            (strlen,) = struct.unpack("I", payload_bytes[offset : offset + 4])
            offset += 4
            s = payload_bytes[offset : offset + strlen].decode("utf-8")
            result.append(s)
            offset += strlen
        return result
    elif type_code == TYPE_JSON:
        json_str = payload_bytes.decode("utf-8")
        return json.loads(json_str)
    else:
        return None


def export_to_shm(varname: str, value: Any, shm_name="/cling_vars_in"):
    try:
        shm = shared_memory.SharedMemory(name=shm_name)
    except FileNotFoundError:
        shm = shared_memory.SharedMemory(name=shm_name, create=True, size=shm_size)

    buf = shm.buf

    offset = 0

    if isinstance(value, bool):
        payload = struct.pack("?", value)
        type_code = TYPE_BOOL
        init_cmd = f"bool {varname};\n"
    elif isinstance(value, int):
        payload = struct.pack("i", value)
        type_code = TYPE_INT
        init_cmd = f"int {varname};\n"
    elif isinstance(value, float):
        payload = struct.pack("d", value)
        type_code = TYPE_DOUBLE
        init_cmd = f"double {varname};\n"
    elif isinstance(value, str):
        payload = value.encode("utf-8")
        type_code = TYPE_STRING
        init_cmd = f"std::string {varname};\n"
    elif isinstance(value, list):
        if all(isinstance(v, (int, float)) for v in value):
            payload = struct.pack(f"{len(value)}d", *(float(v) for v in value))
            type_code = TYPE_VECTOR_DOUBLE
            init_cmd = f"std::vector<double> {varname};\n"
        elif all(isinstance(v, str) for v in value):
            # compute payload as concatenated length+data for each string
            payload_bytes = bytearray()
            for s in value:
                encoded = s.encode("utf-8")
                payload_bytes += struct.pack("I", len(encoded)) + encoded
            payload = bytes(payload_bytes)
            type_code = TYPE_VECTOR_STRING
            init_cmd = f"std::vector<std::string> {varname};\n"
        else:
            payload = json.dumps(value).encode("utf-8")
            type_code = TYPE_JSON
            init_cmd = f"nlohmann::json {varname};\n"
    elif isinstance(value, dict):
        payload = json.dumps(value).encode("utf-8")
        type_code = TYPE_JSON
        init_cmd = f"nlohmann::json {varname};\n"
    else:
        raise RuntimeError(f"Cannot serialize {varname}")

    size = len(payload)
    struct.pack_into(HEADER_FMT, buf, offset, type_code, size)
    offset += HEADER_SIZE
    buf[offset : offset + size] = payload
    offset += size
    shm.close()
    return init_cmd


class ClingHandle:
    configuration: Configuration
    process: Process
    stdin: asyncio.StreamWriter
    stdout: asyncio.StreamReader
    stderr: asyncio.StreamReader
    queue: asyncio.Queue

    def __init__(self, configuration: Configuration) -> None:
        self.configuration = configuration
        self.queue = asyncio.Queue()
        pass

    async def start(self):

        self.process = await asyncio.create_subprocess_exec(
            *self.configuration.cling_start.split(" "),
            stdin=PIPE,
            stdout=PIPE,
            stderr=PIPE,
        )
        if not self.process.stdin or not self.process.stdout or not self.process.stderr:
            raise RuntimeError("Failed to open Cling process pipes")

        self.stdin = self.process.stdin
        self.stdout = self.process.stdout
        self.stderr = self.process.stderr
        asyncio.create_task(self.__read_stdout())
        asyncio.create_task(self.__read_stderr())

        preload = (Path(__file__).parent / "preload.cpp").read_text()
        self.stdin.write(preload.encode())
        self.stdin.write(self.configuration.allow_redefinition_cmd.encode())
        while True:
            [kind, content] = await self.queue.get()
            if kind == "stdout" and content.decode().startswith(
                "cpprun_backend: Cling initialized"
            ):
                break

    async def execute_block(
        self,
        block: str,
        captured_in: dict[str, Any] | None = None,
        captured_out: list[str] | None = None,
    ) -> tuple[dict[str, Any], str, str]:

        captured_in = captured_in or {}
        captured_out = captured_out or []
        run_id = uuid.uuid4().__str__()
        block = f'std::cout << "__start_run_{run_id}" << std::endl;\n{block}\nstd::cout<<"__end_run_{run_id}"<<std::endl;\n'

        print("[py] execute_block:", run_id, captured_in.keys())

        async with cling_lock:
            await self.__init_captured_in(captured_in=captured_in, run_id=run_id)
            self.stdin.write(block.encode())
            await self.stdin.drain()
            outputs = await self.__get_captured_outputs(
                captured_out=captured_out, run_id=run_id
            )
            return outputs

    async def __init_captured_in(self, captured_in: dict[str, Any], run_id: str):
        for varname, value in captured_in.items():
            endline = f"__cp_{varname}_run_{run_id}_"

            init_cmd = export_to_shm(varname, value)

            self.stdin.write(
                f'{init_cmd}read_from_shm({varname});\nstd::cout<<"{endline}"<<std::endl;\n'.encode()
            )
            await self.stdin.drain()

            while True:
                kind, content = await self.queue.get()
                if kind == "stderr":
                    print("stderr:", content.decode())
                if content.decode().startswith(endline):
                    break

    async def __get_captured_outputs(
        self, captured_out: list[str], run_id: str
    ) -> tuple[dict[str, Any], str, str]:
        results = {}
        std_outs = ""
        std_errs = ""
        while True:
            [kind, content] = await self.queue.get()
            if content.decode().startswith(f"__start_run_{run_id}"):
                break

        while True:
            [kind, content] = await self.queue.get()
            if content.decode().startswith(f"__end_run_{run_id}"):
                break
            if kind == "stdout":
                std_outs += content.decode()
            if kind == "stderr":
                std_errs += content.decode() + "\n"

        for varname in captured_out:
            self.stdin.write(
                f'export_to_shm({varname});\nstd::cout << "Variable {varname} exported to shm" << std::endl;\n'.encode()
            )
            while True:
                [kind, content] = await self.queue.get()
                if content.decode().startswith(f"Variable {varname} exported to shm"):
                    break
            a = read_shm()
            results[varname] = a
        return results, std_outs, std_errs

    async def __read_stdout(self):
        while True:
            line = await self.stdout.readline()
            if not line:
                break

            print(f"[stdout] {line.decode().strip()}")
            await self.queue.put(["stdout", line])

    async def __read_stderr(self):
        while True:
            line = await self.stderr.readline()
            if not line:
                break

            print(f"[stdout] {line.decode().strip()}")
            await self.queue.put(["stderr", line])
