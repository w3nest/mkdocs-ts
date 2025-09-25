import asyncio
from pathlib import Path
from typing import Any
import uuid
from asyncio.subprocess import PIPE, Process

from cpprun_backend.environment import Configuration
from cpprun_backend.shared_memory import SharedMemory, wait_for_stdout


class ClingHandle:
    configuration: Configuration
    process: Process | None
    stdin: asyncio.StreamWriter
    stdout: asyncio.StreamReader
    stderr: asyncio.StreamReader
    queue: asyncio.Queue

    shared_memory: SharedMemory
    reader_tasks: list[asyncio.Task]

    cling_lock = asyncio.Lock()

    def __init__(self, configuration: Configuration) -> None:
        self.configuration = configuration
        self.queue = asyncio.Queue()
        self.reader_tasks = []

    async def __aenter__(self) -> "ClingHandle":
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.stop()

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

        async def enqueue_out(prefix: str, stream: asyncio.StreamReader):
            while True:
                line = await stream.readline()
                if not line:
                    break

                print(f"[{prefix}] {line.decode().strip()}")
                await self.queue.put([prefix, line])

        self.reader_tasks.append(
            asyncio.create_task(enqueue_out("stdout", self.stdout))
        )
        self.reader_tasks.append(
            asyncio.create_task(enqueue_out("stderr", self.stderr))
        )
        block = (
            (Path(__file__).parent / "preload.cpp").read_text()
            + "\n"
            + self.configuration.allow_redefinition_cmd
        )
        await wait_for_stdout(
            sentinel_end="[cpp]: Cling initialized",
            queue=self.queue,
            block=block,
            stdin=self.stdin,
        )
        self.shared_memory = SharedMemory(self.queue, self.stdin)

    async def execute_block(
        self,
        block: str,
        captured_in: dict[str, Any] | None = None,
        captured_out: list[str] | None = None,
    ) -> tuple[dict[str, Any], str, str]:

        captured_in = captured_in or {}
        captured_out = captured_out or []
        run_id = uuid.uuid4().__str__()

        print("[py] execute_block:", run_id, captured_in.keys())

        async with self.cling_lock:
            await self.__init_captured_in(captured_in=captured_in, run_id=run_id)

            std_outs, std_errs = await wait_for_stdout(
                sentinel_start=f"__start_run_{run_id}",
                sentinel_end=f"__end_run_{run_id}",
                queue=self.queue,
                block=block,
                stdin=self.stdin,
            )
            outputs = await self.__get_captured_outputs(captured_out=captured_out)
            return outputs, std_outs, std_errs

    async def __init_captured_in(self, captured_in: dict[str, Any], run_id: str):
        for varname, value in captured_in.items():
            await self.shared_memory.write(varname, value, run_id)

    async def __get_captured_outputs(self, captured_out: list[str]) -> dict[str, Any]:
        results = {}

        for varname in captured_out:
            results[varname] = await self.shared_memory.read(varname)
        return results

    async def stop(self):

        if not self.process:
            return
        # Usually the process is already dead
        try:
            if self.process.returncode is None:  # still running
                self.process.terminate()
                await self.process.wait()
                print("[py]: Cling process stopped")
        except ProcessLookupError:
            # Already dead
            pass

        for task in self.reader_tasks:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        self.reader_tasks.clear()
        self.process = None
