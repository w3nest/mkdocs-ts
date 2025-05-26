"""
Module gathering elements regarding the configuration of the server.
"""

from dataclasses import dataclass

from starlette.requests import Request
from w3nest_client import Context, ContextFactory
from w3nest_client.context.models import ProxiedBackendCtxEnv


@dataclass(frozen=True)
class Configuration:
    """
    Holds configuration fields.
    """

    host: str
    """
    Server's host.
    """
    port: int
    """
    Server's port.
    """
    host_port: int
    """
    Host's port.
    """
    host_name: str
    """
    Host's name.
    """
    instance_name: str
    """
    Instance name.
    """
    log_level: str | int | None
    """
    Uvicorn log level.
    """

    def __str__(self):
        """
        Returns a string representation of the configuration.

        """
        return (
            f"Serving instance '{self.instance_name}' at '{self.host}:{self.port}', "
            f"connected to W3Nest host at '{self.host_name}:{self.host_port}'"
        )

    def context(self, request: Request) -> Context[ProxiedBackendCtxEnv]:
        """
        Returns an instance of context given an incoming request.
        It provides:
        *  Access to logging methods (`info`, `warning`, etc.) along with trace management.
        *  Access to W3Nest HTTP clients through its `.env` attribute.

        Parameters:
            request: Incoming request.

        Return:
            The context.
        """
        return ContextFactory.proxied_backend_context(
            request=request, host_url=f"http://{self.host_name}:{self.host_port}"
        )


class Environment:
    """
    Static class representing the running environment.
    """

    configuration: Configuration | None = None
    """
    Configuration instance.
    """

    @staticmethod
    def get_config():
        """
        Retrieves the configuration instance.
        It is injected in the various endpoints as a FastAPI dependency.
        """
        if not Environment.configuration:
            raise RuntimeError(
                "Configuration instance must be set before being accessed"
            )
        return Environment.configuration

    @staticmethod
    def set_config(configuration: Configuration):
        """
        Set the configuration singleton.
        """
        if Environment.configuration:
            raise RuntimeError("Configuration instance can only be set once.")
        Environment.configuration = configuration
