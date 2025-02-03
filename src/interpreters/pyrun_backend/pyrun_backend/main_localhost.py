"""
Module gathering implementation to start the server in localhost.
"""

import argparse

from pyrun_backend import __default__port__
from pyrun_backend.app import start
from pyrun_backend.environment import Configuration

parser = argparse.ArgumentParser()

parser.add_argument("--port", help="Specify the port on which the service is running")
parser.add_argument(
    "--yw_port", help="Specify the port on which the youwol server is running"
)


def main() -> None:
    """
    Starts the server on localhost.

    The serving port and youwol's server port should be provided as command line arguments
    (using `--port` and `--yw_port` respectively).
    """

    args = parser.parse_args()
    localhost = "localhost"
    start(
        configuration=Configuration(
            host=localhost,
            port=int(args.port) if args.port else __default__port__,
            yw_port=int(args.yw_port) if args.yw_port else 2000,
            yw_host=localhost,
            instance_name=localhost,
            log_level="debug",
        )
    )


if __name__ == "__main__":
    main()
