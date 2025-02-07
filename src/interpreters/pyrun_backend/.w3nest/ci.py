# Youwol application
from w3nest.app.environment import Environment
from w3nest.app.projects import IPipelineFactory, Pipeline

# Youwol utilities
from w3nest_client.context import Context

# Youwol pipelines
from w3nest.ci.py_backend import PipelineConfig, pipeline


class PipelineFactory(IPipelineFactory):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    async def get(self, _env: Environment, context: Context) -> Pipeline:
        config = PipelineConfig(with_tags=["python", "backend", "fastAPI"])
        return await pipeline(config, context)
