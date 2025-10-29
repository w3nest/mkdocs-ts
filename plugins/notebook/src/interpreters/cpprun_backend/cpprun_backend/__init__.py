"""

A C++ backend interpreter for Notebook pages in `mkdocs-ts`.

C++ code snippets are executed via the `POST /run` endpoint, which is handled by
:func:`cpprun_backend.router.run_code`.  This endpoint expects a :class:`cpprun_backend.schemas.RunBody` as input and
returns a :class:`cpprun_backend.schemas.RunResponse`.

It is usually installed and started using <a target="_blank" href="/apps/@webpm/doc/latest">WebPM</a>:

<code-snippet language="javascript">

const { cpp } = await webpm.install({
    backends:['cpprun_backend as cpp']
})
</code-snippet>

**Build Configuration**

The backend is deployed using a `Dockerfile` which specifies a container that can be configured to incorporate
system dependencies. They are provided using `apt` attributes to the `Dockerfile`.

Using `webpm`, they are defined using `configurations.${backend_name}.build`:

<code-snippet language="javascript">

const { cpp } = await webpm.install({
    backends: {
        modules:['cpprun_backend as cpp'],
        configurations: {
            cpprun_backend: {
                build: {
                    apt: 'libgomp1'
                }
            }
        }
    }
})
</code-snippet>

**Variable Exchange Frontend-JavaScript / Backend-C++**

Variables can be of the following types, with automatic serialization and deserialization:

| Frontend         | C++ type                   | Notes                                    |
| ---------------- | -------------------------- | ---------------------------------------- |
| `boolean`        | `bool`                     |                                          |
| `number`         | `double`                   |                                          |
| `string`         | `std::string`              | UTF-8 encoded                            |
| `list[number]`   | `std::vector<double>`      |                                          |
| `list[string]`   | `std::vector<std::string>` |                                          |
| `list[any]`      | `nlohmann::json`           |                                          |
| `json`           | `nlohmann::json`           | Complex objects automatically serialized |



**Main Entry Points**

There are two primary ways to run the backend service:

- **Local execution**: Use :func:`cpprun_backend.main_localhost.main` (from **main_localhost.py**) to run the service on
localhost. The user is in charge to provide a properly configured environment in terms of python modules required.
The command lines argument `--port` & `--host_port` should be provided.

- **Containerized execution**: Use :func:`cpprun_backend.main_docker.main` (from **main_docker.py**) to run the service
inside a container.  Starting the container requires the definition of the environment variables `HOST_PORT` &
`HOST_NAME` within the container.

Both entry points invoke :func:`cpprun_backend.app.start`, using a specific
:class:`cpprun_backend.environment.Configuration` for setup.
"""

__version__ = "0.1.1"
__default__port__ = 2010
