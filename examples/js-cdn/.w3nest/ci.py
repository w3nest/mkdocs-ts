from w3nest.app.projects import CIStep
from w3nest.ci.js_app import PackageStep

# W3Nest client
from w3nest_client import Context
from w3nest.app.projects.models_ci import CI


class SetupStep(CIStep):
    id: str = "setup"
    run: str = "yarn setup"


async def ci(context: Context) -> CI:
    async with context.start(action="ci"):
        return CI(
            tags=["javascript"],
            steps=[SetupStep(), PackageStep()],
            dag=["setup > package"],
        )
