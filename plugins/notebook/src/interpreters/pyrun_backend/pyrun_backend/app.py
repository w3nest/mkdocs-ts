"""
Implementation regarding application creation & start.
"""

import logging
import traceback
from contextlib import asynccontextmanager

# third parties
import uvicorn
from fastapi import FastAPI

from pyrun_backend import __version__
from pyrun_backend.environment import Configuration, Environment
from pyrun_backend.router import router as root_router


def start(configuration: Configuration) -> None:
    """
    Start the backend server using the specified configuration:
    *  Create the application using :func:`pyrun_backend.app.create_app`.
    *  Run the application using `uvicorn`.

    Parameters:
        configuration: Server's configuration.
    """
    Environment.set_config(configuration)

    app = create_app(configuration=configuration)
    try:
        uvicorn.run(
            app,
            host=configuration.host,
            port=configuration.port,
            log_level=configuration.log_level,
        )
    except BaseException as e:
        print("".join(traceback.format_exception(type(e), value=e, tb=e.__traceback__)))
        raise e


def create_app(configuration: Configuration) -> FastAPI:
    """
    Create and configure the FastAPI application.

    Parameters:
        configuration: Configuration.

    Returns:
        The application.
    """

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        """
        Defines startup and shutdown procedures.

        Parameters:
            _app: Application.
        """
        logger = logging.getLogger("uvicorn.error")
        logger.info(Environment.get_config())
        yield

    root_base = "http://localhost"
    app: FastAPI = FastAPI(
        title="pyrun_backend",
        # Root path is always served from localhost (using the W3Nest server).
        root_path=f"{root_base}:{configuration.host_port}/backends/pyrun_backend/{__version__}",
        lifespan=lifespan,
    )
    app.include_router(root_router)

    return app
