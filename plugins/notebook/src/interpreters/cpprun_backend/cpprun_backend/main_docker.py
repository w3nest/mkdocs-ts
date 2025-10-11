"""
Module gathering implementation facilitating starting the server within a container.
"""

import os
import socket

from cpprun_backend.app import start
from cpprun_backend.environment import Configuration


def main():
    """
    Starts the server in a container.

    The host name and port should be provided as environment variables
    (using `HOST_NAME` and `HOST_PORT` respectively).

    This function is used as script `run_cpprun_backend` entry point within the `project.toml` file.
    """
    host_port = os.getenv("HOST_PORT")
    host_name = os.getenv("HOST_NAME")
    if not host_port:
        raise RuntimeError("Env. variable 'HOST_PORT' needs to be provided")
    if not host_name:
        raise RuntimeError("Env. variable 'HOST_NAME' needs to be provided")
    start(
        configuration=Configuration(
            host="0.0.0.0",
            port=8080,  # Port must be 8080 when running within a container.
            host_port=int(host_port),
            host_name=host_name,
            instance_name=socket.gethostname(),  # Map to container ID by default.
            log_level="debug",
            cling_start="cling -std=c++17",
            allow_redefinition_cmd="gCling->allowRedefinition();\n",
        )
    )
