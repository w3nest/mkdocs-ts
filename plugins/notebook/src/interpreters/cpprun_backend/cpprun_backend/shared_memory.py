from abc import ABC, abstractmethod
import asyncio
import json
from multiprocessing import shared_memory
import struct
from typing import Any

DOUBLE_SIZE = struct.calcsize("d")
UINT32_SIZE = struct.calcsize("I")
HEADER_SIZE = UINT32_SIZE * 2

# Type codes (should match C++)
TYPE_BOOL = 0
TYPE_INT = 1
TYPE_DOUBLE = 2
TYPE_STRING = 3
TYPE_VECTOR_DOUBLE = 4
TYPE_VECTOR_STRING = 5
TYPE_JSON = 6


class ParserBase(ABC):
    @abstractmethod
    def read(self, data: bytes) -> Any:
        pass

    @abstractmethod
    def write(self, varname: str, value: Any) -> tuple[int, bytes, str]:
        pass


class IntParser(ParserBase):

    def read(self, data: bytes) -> int:
        return struct.unpack("i", data)[0]

    def write(self, varname: str, value: int) -> tuple[int, bytes, str]:
        return TYPE_INT, struct.pack("i", value), f"int {varname};\n"


class BoolParser(ParserBase):

    def read(self, data: bytes) -> bool:
        return struct.unpack("?", data)[0]

    def write(self, varname: str, value: bool) -> tuple[int, bytes, str]:
        return TYPE_BOOL, struct.pack("?", value), f"bool {varname};\n"


class DoubleParser(ParserBase):

    def read(self, data: bytes) -> float:
        return struct.unpack("d", data)[0]

    def write(self, varname: str, value: float) -> tuple[int, bytes, str]:
        return TYPE_DOUBLE, struct.pack("d", value), f"double {varname};\n"


class StringParser(ParserBase):

    def read(self, data: bytes) -> str:
        return data.decode("utf-8")

    def write(self, varname: str, value: str) -> tuple[int, bytes, str]:
        return TYPE_STRING, value.encode("utf-8"), f"std::string {varname};\n"


class JsonParser(ParserBase):

    def read(self, data: bytes) -> str:
        return json.loads(data.decode("utf-8"))

    def write(self, varname: str, value: dict) -> tuple[int, bytes, str]:
        return (
            TYPE_JSON,
            json.dumps(value).encode("utf-8"),
            f"nlohmann::json {varname};\n",
        )


class VectorDoubleParser(ParserBase):
    def read(self, data: bytes) -> list[float]:
        n = len(data) // DOUBLE_SIZE
        return list(struct.unpack(f"{n}d", data))

    def write(self, varname: str, value: list[float]) -> tuple[int, bytes, str]:
        payload = struct.pack(f"{len(value)}d", *(float(v) for v in value))
        return TYPE_VECTOR_DOUBLE, payload, f"std::vector<double> {varname};\n"


class VectorStringParser(ParserBase):
    def read(self, data: bytes) -> list[str]:
        result = []
        offset = 0
        payload_size = len(data)
        while offset < payload_size:
            (strlen,) = struct.unpack("I", data[offset : offset + UINT32_SIZE])
            offset += UINT32_SIZE
            s = data[offset : offset + strlen].decode("utf-8")
            result.append(s)
            offset += strlen
        return result

    def write(self, varname: str, value: list[str]) -> tuple[int, bytes, str]:
        payload_bytes = bytearray()
        for s in value:
            encoded = s.encode("utf-8")
            payload_bytes += struct.pack("I", len(encoded)) + encoded
        payload = bytes(payload_bytes)
        return TYPE_VECTOR_STRING, payload, f"std::vector<std::string> {varname};\n"


async def wait_for_stdout(
    sentinel_end: str,
    queue: asyncio.Queue,
    block: str,
    stdin: asyncio.StreamWriter,
    sentinel_start=None,
) -> tuple[str, str]:

    if sentinel_start:
        block = f'std::cout << "{sentinel_start}" << std::endl;\n{block}\n'
    block += f'std::cout << "{sentinel_end}" << std::endl;\n'

    std_outs = ""
    std_errs = ""
    stdin.write(block.encode())
    await stdin.drain()
    started = False if sentinel_start else True

    while True:
        [kind, content] = await queue.get()
        if kind == "stdout" and content.decode().startswith(sentinel_end):
            break
        if started and kind == "stdout":
            std_outs += content.decode()
        if kind == "stderr":
            std_errs += content.decode() + "\n"

        if (
            sentinel_start
            and kind == "stdout"
            and content.decode().startswith(sentinel_start)
        ):
            started = True
    return std_outs, std_errs


class SharedMemory:
    shm_name: str = "/cling_py_shared"

    parsers = {
        TYPE_BOOL: BoolParser(),
        TYPE_INT: IntParser(),
        TYPE_DOUBLE: DoubleParser(),
        TYPE_STRING: StringParser(),
        TYPE_JSON: JsonParser(),
        TYPE_VECTOR_DOUBLE: VectorDoubleParser(),
        TYPE_VECTOR_STRING: VectorStringParser(),
    }

    stdout_queue: asyncio.Queue
    stdin: asyncio.StreamWriter

    def __init__(
        self, stdout_queue: asyncio.Queue, stdin: asyncio.StreamWriter
    ) -> None:
        self.stdout_queue = stdout_queue
        self.stdin = stdin

    async def read(self, varname: str) -> Any:
        block = f"export_to_shm({varname});"
        await wait_for_stdout(
            sentinel_end=f"Variable {varname} exported to shm",
            queue=self.stdout_queue,
            block=block,
            stdin=self.stdin,
        )

        shm = shared_memory.SharedMemory(name=SharedMemory.shm_name)
        buf = shm.buf

        header_bytes = bytes(buf[:HEADER_SIZE])
        type_code = struct.unpack("I", header_bytes[0:UINT32_SIZE])[0]
        payload_size = struct.unpack("I", header_bytes[UINT32_SIZE : 2 * UINT32_SIZE])[
            0
        ]
        payload_bytes = bytes(buf[HEADER_SIZE : HEADER_SIZE + payload_size])

        shm.close()
        shm.unlink()

        parser = SharedMemory.parsers.get(type_code)
        if parser is None:
            raise ValueError(f"Unsupported type code: {type_code}")

        return parser.read(payload_bytes)

    async def write(self, varname: str, value: Any, run_id: str) -> str:
        shm_name = SharedMemory.shm_name
        parser = self.select_parser(value)
        type_code, payload, init_cmd = parser.write(varname, value)
        size = len(payload)

        try:
            old = shared_memory.SharedMemory(name=shm_name)
            old.close()
            old.unlink()
        except FileNotFoundError:
            pass

        # create new block with exact size
        shm = shared_memory.SharedMemory(
            name=shm_name, create=True, size=HEADER_SIZE + size
        )
        buf = shm.buf
        struct.pack_into("I", buf, 0, type_code)
        struct.pack_into("I", buf, UINT32_SIZE, size)
        buf[HEADER_SIZE : HEADER_SIZE + size] = payload
        shm.close()

        block = f"{init_cmd}read_from_shm({varname});"
        await wait_for_stdout(
            sentinel_end=f"__cp_{varname}_run_{run_id}_",
            queue=self.stdout_queue,
            block=block,
            stdin=self.stdin,
        )

        return init_cmd

    def select_parser(self, value: Any) -> ParserBase:

        type_map = {
            bool: TYPE_BOOL,
            int: TYPE_INT,
            float: TYPE_DOUBLE,
            str: TYPE_STRING,
            dict: TYPE_JSON,
        }
        t = type(value)
        if t in type_map:
            return self.parsers[type_map[t]]

        if isinstance(value, list):
            if not value:
                raise ValueError("Cannot determine element type of empty list")
            if all(isinstance(v, (int, float)) for v in value):
                return self.parsers[TYPE_VECTOR_DOUBLE]
            elif all(isinstance(v, str) for v in value):
                return self.parsers[TYPE_VECTOR_STRING]
            else:
                return self.parsers[TYPE_JSON]

        raise ValueError(f"Unsupported type: {type(value)}")
