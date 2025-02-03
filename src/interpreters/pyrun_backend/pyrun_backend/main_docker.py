"""
Module gathering implementation facilitating starting the server within a container.
"""

import os
import socket

from pyrun_backend.app import start
from pyrun_backend.environment import Configuration


def main():
    """
    Starts the server on localhost.

    The youwol server host and port should be provided as environment variables
    (using `YW_HOST` and `YW_PORT` respectively).

    This function is used as the script `run_demo_yw_backend` entry point within the
    `project.toml` file.
    """
    start(
        configuration=Configuration(
            host="0.0.0.0",
            port=8080,  # Port must be 8080 when running within a container.
            yw_port=int(os.getenv("YW_PORT")),
            yw_host=os.getenv("YW_HOST"),
            instance_name=socket.gethostname(),  # Map to container ID by default.
            log_level="debug",
        )
    )
