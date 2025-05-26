"""
Module gathering implementation facilitating starting the server within a container.
"""

import os
import socket

from pyrun_backend.app import start
from pyrun_backend.environment import Configuration


def main():
    """
    Starts the server in a container.

    The host name and port should be provided as environment variables
    (using `HOST_NAME` and `HOST_PORT` respectively).

    This function is used as script `run_pyrun_backend` entry point within the `project.toml` file.
    """
    start(
        configuration=Configuration(
            host="0.0.0.0",
            port=8080,  # Port must be 8080 when running within a container.
            host_port=int(os.getenv("HOST_PORT")),
            host_name=os.getenv("HOST_NAME"),
            instance_name=socket.gethostname(),  # Map to container ID by default.
            log_level="debug",
        )
    )
