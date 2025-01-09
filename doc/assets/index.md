# mkdocs-ts

<code-badges version="{{mkdocs-version}}" npm="mkdocs-ts" github="w3nest/mkdocs-ts" license="mit">
</code-badges>

---

## Overview

{{mkdocs-ts}} is a powerful library designed for creating hierarchical documents using JavaScript or TypeScript.
This document itself is an example of its capabilities.

Built on the foundation of [MkDocs](https://www.mkdocs.org/), it introduces two key distinctions:

*  **Dynamic Nature**: The navigation structure can evolve dynamically, adapting to the runtime state of your application.

*  **Native TypeScript Support**: Navigation is built using TypeScript, providing a robust environment that includes:

    *  Integration with JavaScript libraries for dynamic views.

    *  Type-safe coding with features like error detection and parameter suggestions.


<note level="hint">
While {{mkdocs-ts}} projects are written in TypeScript or JavaScript, **Markdown** is a first class citizen and typical 
use cases are mostly implemented using Markdown pages.
</note>

---

## Key Features

### Hierarchical Documents

With {{mkdocs-ts}}, you can create hierarchical document structures that are flexible and dynamic. 
The library enables you to adapt navigation in real-time, making it ideal for applications with evolving content or 
complex data-driven needs.

### Notebook Environment

{{mkdocs-ts}} includes features that resemble platforms like ObservableHQ, enabling the creation of notebook-like pages.
Supported functionalities include:

*  JavaScript cells for dynamic content.

*  Python-in-browser execution using Pyodide.

*  Cells' reactivity with ReactiveX.

*  Dynamic imports of dependencies via <a target='_blank' href="https://w3nest/apps/@webpm/doc">webpm</a>.

<note level="hint">
Should you chose to serve your application within <a target="_blank" href="https://w3nest.org">w3nest</a>,
**webpm** can also provide backends installation. It can for instance be leveraged to provide backend interpreters
in various languages.
</note>

---

### And More

{{mkdocs-ts}} is modular by design, adhering to a "you pay for what you use" philosophy. 

The Notebook environment previously presented is one example of it: it does not come with {{mkdocs-ts}} by itself, 
but is proposed as an additional module that can be consumed if needed. 

Another example of such extension is the **CodeApi** module, providing the ability to include Code API documentation
(for one or multiples libraries) within your project. For instance, you can find documentation of the (typescript)
{{mkdocs-ts}} library in this document [here](@nav/api/), itself featuring documentation of python modules 
(e.g. [here](@nav/api/Backends/mkdocs_py_griffe)).

<note level="hint">
While {{mkdocs-ts}} only support generating code API data for python and typescript libraries for now, new 
backends can be implemented to handle other languages.
</note>

---

## Getting Started

To begin using {{mkdocs-ts}}, consider the following resources:

*  [Tutorials](@nav/tutorials): Ideal for newcomers, offering a step-by-step & interactive introduction.

*  [How-to](@nav/how-to): Detailed, task-oriented instructions for specific use cases. 

*  [API Reference](@nav/api):  Comprehensive technical documentation for advanced users.

These sections provide a structured path for users to explore the full potential of mkdocs-ts.

