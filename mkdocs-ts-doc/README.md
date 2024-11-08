# @youwol/mkdocs-ts-doc

Documentation app for project @youwol/mkdocs-ts.

This library is part of the hybrid cloud/local ecosystem
[YouWol](https://platform.youwol.com/applications/@youwol/platform/latest).

## Links

[Running app.](https://platform.youwol.com/applications/@youwol/mkdocs-ts-doc/latest)

[Online user-guide](https://l.youwol.com/doc/@youwol/mkdocs-ts-doc)

[Developers documentation](https://platform.youwol.com/applications/@youwol/cdn-explorer/latest?package=@youwol/mkdocs-ts-doc&tab=doc)

[Package on npm](https://www.npmjs.com/package/@youwol/mkdocs-ts-doc)

[Source on GitHub](https://github.com/youwol/mkdocs-ts-doc)

# Installation, Build, Test

To install the required dependencies:

```shell
yarn
```

---

To build for development:

```shell
yarn build:dev
```

To build for production:

```shell
yarn build:prod
```

---

<!-- no specific test configuration documented -->

To run tests:

```shell
yarn test
```

Coverage can be evaluated using:

```shell
yarn test-coverage
```

---

To start the 'dev-server':

```shell
yarn start
```

In order to use the dev-server within Py-YouWol and to serve resources in place of the usual CDN database,
the Py-YouWol configuration needs to be updated to include a `WebpackDevServerSwitch` within a
`FlowSwitcherMiddleware`. For example:

```python
from w3nest.app.config import *
from w3nest.pipelines.pipeline_typescript_weback_npm import WebpackDevServerSwitch

Configuration(
    customization = Customization(
        middlewares = [
            FlowSwitcherMiddleware(
                name = 'front-end dev-servers',
                oneOf = [
                    WebpackDevServerSwitch(packageName="@youwol/mkdocs-ts-doc", port=3025),
                ]
            )
        ]
    )
)
```

Additional information on the `Configuration` class can be found in the "Configuration API" page of the
[Py-YouWol guide](https://l.youwol.com/doc/py-youwol).

Once Py-YouWol is running with the updated configuration,
the application can be accessed from [here](http://localhost:2000/applications/@youwol/mkdocs-ts-doc/latest)
(providing py-youwol running using the default port `2000`).

---

To generate code's documentation:

```shell
yarn doc
```
