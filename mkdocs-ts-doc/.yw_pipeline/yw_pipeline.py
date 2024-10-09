import base64
from pathlib import Path

from youwol.app.environment import YouwolEnvironment
from youwol.app.routers.projects import IPipelineFactory, BrowserApp, Execution, Link, BrowserAppGraphics
from youwol.pipelines.pipeline_typescript_weback_npm import pipeline, PipelineConfig, PublishConfig
from youwol.utils.context import Context


class PipelineFactory(IPipelineFactory):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    async def get(self, _env: YouwolEnvironment, context: Context):

        img_path = Path(__file__).parent.parent / 'assets' / 'logo-raw.svg'
        svg_content = img_path.read_bytes()
        img_base64 = base64.b64encode(svg_content).decode('utf-8')

        config = PipelineConfig(target=BrowserApp(
            displayName="MkDocs-TS",
            execution=Execution(
                standalone=True
            ),
            graphics=BrowserAppGraphics(
                appIcon={
                    "tag":'img',
                    "src": f"data:image/svg+xml;base64,{img_base64}"
                },
                fileIcon={}
            ),
            links=[
                Link(name="doc", url="dist/docs/index.html"),
                Link(name="coverage", url="coverage/lcov-report/index.html"),
                Link(name="bundle-analysis", url="dist/bundle-analysis.html")
            ]
        ), publishConfig=PublishConfig(packagedFolders=["assets"]))
        return await pipeline(config, context)
