"""

A python backend interpreter for Notebook pages in `mkdocs-ts`.

Python code snippets are executed via the `POST /run` endpoint, which is handled by
:func:`pyrun_backend.router.run_code`.  This endpoint expects a :class:`pyrun_backend.schemas.RunBody` as input and
returns a :class:`pyrun_backend.schemas.RunResponse`.

It is usually installed and started using <a target="_blank" href="/apps/@webpm/doc/latest">WebPM</a>:

<code-snippet language="javascript">

const {pyrun} = await webpm.install({
    backends:['pyrun_backend as pyrun']
})
</code-snippet>

**Build Configuration**

The backend is deployed using a `Dockerfile` which specifies a container that can be configured to incorporate
a given python interpreter, python modules as well as system dependencies.
They are provided respectively using `modules` and `apt` attributes to the `Dockerfile`.

Using `webpm`, they are defined using ̀configurations.${backend_name}.build`:

<code-snippet language="javascript">

const {pyrun} = await webpm.install({
    backends: {
        modules:['pyrun_backend as pyrun'],
        configurations: {
            pyrun_backend: {
                build: {
                    python: '3.12',
                    modules: 'numpy pandas',
                    apt: 'libgomp1'
                }
            }
        }
    }
})
</code-snippet>



**Main Entry Points**

There are two primary ways to run the backend service:

- **Local execution**: Use :func:`pyrun_backend.main_localhost.main` (from **main_localhost.py**) to run the service on
localhost. The user is in charge to provide a properly configured environment in terms of python modules required.
The command lines argument `--port` & `--host_port` should be provided.

- **Containerized execution**: Use :func:`pyrun_backend.main_docker.main` (from **main_docker.py**) to run the service
inside a container.  Starting the container requires the definition of the environment variables `HOST_PORT` &
`HOST_NAME` within the container.

Both entry points invoke :func:`pyrun_backend.app.start`, using a specific
:class:`pyrun_backend.environment.Configuration` for setup.
"""

__version__ = "0.1.0"
__default__port__ = 2010
