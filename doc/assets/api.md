# API Documentation

Welcome to the API documentation for the `{{project}}` project.

The project consists of several independent modules:

- [MainModule](@nav/api/MainModule): This module forms the core of the project, facilitating the creation of
  hierarchical documents based on defined navigation structures.
  The navigation can either be static, known in advance, or dynamic, subject to changes over time.

- [CodeApi](@nav/api/CodeApi): This auxiliary module offers implementations to seamlessly integrate code API
  documentation into your project. Notably, the pages under the 'API' node in the navigation are rendered using this
  module.

- [Backends](@nav/api/Backends): This module is responsible for aggregating data generators used for code
  API documentation. The generated data are subsequently rendered by the [CodeApi](@nav/api/CodeApi) module.
