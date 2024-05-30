def std_links() -> dict[str, str]:
    """
    Returns typical links for standard python symbols from `https://docs.python.org`.

    Returns:
        Dictionary `symbol-path` -> `URL`
    """

    typing_url = "https://docs.python.org/3/library/typing.html"
    return {
        "Exception": "https://docs.python.org/3/tutorial/errors.html",
        "bytes": "https://docs.python.org/3/library/stdtypes.html#bytes-and-bytearray-operations",
        "str": "https://docs.python.org/fr/3/library/string.html",
        "bool": "https://docs.python.org/fr/3/library/stdtypes.html#boolean-type-bool",
        "int": "https://docs.python.org/fr/3/library/stdtypes.html#numeric-types-int-float-complex",
        "float": "https://docs.python.org/fr/3/library/stdtypes.html#numeric-types-int-float-complex",
        "list": "https://docs.python.org/3/library/stdtypes.html#lists",
        "dict": "https://docs.python.org/3/library/stdtypes.html#mapping-types-dict",
        "set": "https://docs.python.org/3/library/stdtypes.html#set",
        "tuple": "https://docs.python.org/3/library/stdtypes.html#tuple",
        "asyncio.subprocess.Process": "https://docs.python.org/3/library/asyncio-subprocess.html",
        "collections.abc.Mapping": "https://docs.python.org/3/library/collections.abc.html#collections.abc.Mapping",
        "io.BytesIO": "https://docs.python.org/3/library/io.html#io.BytesIO",
        "enum.Enum": "https://docs.python.org/3/library/enum.html",
        "abc.ABC": "https://docs.python.org/3/library/abc.html",
        "collections.abc.Awaitable": "https://docs.python.org/3/library/collections.abc.html#collections.abc.Awaitable",
        "pathlib.Path": "https://docs.python.org/fr/3/library/pathlib.html#pathlib.Path",
        "typing.List": f"{typing_url}#typing.List",
        "typing.Dict": f"{typing_url}#typing.Dict",
        "typing.Tuple": f"{typing_url}#typing.Tuple",
        "typing.Optional": f"{typing_url}#typing.Optional",
        "typing.Union": f"{typing_url}#typing.Union",
        "typing.Any": f"{typing_url}#typing.Any",
        "typing.Mapping": f"{typing_url}#typing.Mapping",
        "typing.Awaitable": f"{typing_url}#typing.Awaitable",
        "typing.Callable": f"{typing_url}#typing.Callable",
        "typing.Set": f"{typing_url}#typing.Set",
        "typing.NamedTuple": f"{typing_url}#typing.NamedTuple",
        "typing.Literal": f"{typing_url}#typing.Literal",
        "typing.Generic": "https://mypy.readthedocs.io/en/stable/generics.html",
        "asyncio.Future": "https://docs.python.org/3/library/asyncio-future.html",
        "dataclasses": "https://docs.python.org/3/library/dataclasses.html#",
        "dataclasses.dataclass": "https://docs.python.org/3/library/dataclasses.html#",
    }
