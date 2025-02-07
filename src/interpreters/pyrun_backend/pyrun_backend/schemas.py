"""
Module gathering the schemas of bodies and responses of the end points.
"""

from typing import Any, Literal

from pydantic import BaseModel


class RunBody(BaseModel):
    """
    Body for the endpoint `/run`.
    """

    cellId: str
    """
    Cell's ID
    """
    code: str
    """
    Code to run.
    """
    capturedIn: dict[str, Any]
    """
    Captured input variables.
    """
    capturedOut: list[str]
    """
    Name of the captured output variables.
    """


class ScriptError(BaseModel):
    """
    Represents error generated when interpreting the script.
    """

    kind: Literal["AST", "Runtime"]
    """
    `AST` is an exception generated when compiling the script.
    `Runtime` is an exception generated when executing the script.
    """
    message: str
    """
    Exception's message.
    """
    stackTrace: list[str] | None = None
    """
    Stack trace.
    """
    lineNumber: int | None = None
    """
    Line number within the script.
    """


class RunResponse(BaseModel):
    """
    Response for the endpoint `/run`.
    """

    output: str
    """
    Std output.
    """
    error: ScriptError | None = None
    """
    Std error.
    """
    capturedOut: dict[str, Any]
    """
    Value of the capture output.
    """
