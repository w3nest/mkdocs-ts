from w3nest.app.projects import Artifact, CIStep, FileListing

# W3Nest client
from w3nest_client import Context
from w3nest.app.projects.models_ci import CI

default_files = FileListing(
    include=[
        "*",
        "*/**",
    ],
    ignore=[".w3nest", "node_modules"],
    gitignore=True,
)


class SetupStep(CIStep):
    id: str = "setup"
    run: str = "yarn setup"


class PackageStep(CIStep):
    id: str = "package"
    run: str = "echo 'Nothing to do'"
    sources: FileListing = default_files
    artifacts: list[Artifact] = [Artifact(id="package", files=default_files)]


async def ci(context: Context) -> CI:
    async with context.start(action="ci"):
        return CI(
            tags=["javascript"],
            steps=[SetupStep(), PackageStep()],
            dag=["setup > package"],
        )
