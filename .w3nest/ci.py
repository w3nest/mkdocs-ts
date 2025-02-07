from w3nest.app.environment import Environment
from w3nest.app.projects import IPipelineFactory, JsBundle, Link, Pipeline
from w3nest.ci.ts_frontend import pipeline, PipelineConfig, PublishConfig
from w3nest_client.context import Context


class PipelineFactory(IPipelineFactory):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    async def get(self, env: Environment, context: Context) -> Pipeline:
        publish_conf = PublishConfig(
            packagedFolders=["assets"],
            ignore=[
                "mkdocs-ts-doc/*",
                "src/interpreters/*",
                "src/mkapi-backends/*",
                "**/.mypy_cache/*",
                "**/__pycache__/*",
                "**/*.egg-info/*",
                "**/mkdocs_py_griffe/build/*",
            ],
        )
        config = PipelineConfig(
            target=JsBundle(
                links=[
                    Link(name="doc", url="dist/docs/index.html"),
                    Link(name="coverage", url="coverage/lcov-report/index.html"),
                    Link(name="bundle-analysis", url="dist/bundle-analysis.html"),
                ]
            ),
            publishConfig=publish_conf,
        )
        return await pipeline(config, context)
