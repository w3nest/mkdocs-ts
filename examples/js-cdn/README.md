# Demo: JavaScript + CDN

This example demonstrates a typical **JavaScript + CDN** setup for building an
[**MkDocs-TS**](https://w3nest.org/apps/@mkdocs-ts/doc/latest) application—without the need for a bundler or build step.

It uses [**WebPM**](https://w3nest.org/apps/@webpm-client/doc/latest), a CDN-based package loader.
The WebPM client is included via a `<script>` tag in `index.html` and exposed globally as `webpm`.

---

## 🚀 Getting Started

To run the application locally:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

No installation steps or build tools are required.

---

## 📁 Project Structure

- **`main.js`** — Entry point that sets up the application and defines routes.
- **`markdown.config.js`** — Utilities for extending Markdown rendering.
- **`trex.view.js`** — Defines a custom Markdown component.
- **`assets/`** — Contains static resources, including Markdown content, images, and API models.

---

## 🎨 Styling

Custom styles are defined in `styles.css`.

In addition, external CSS dependencies are dynamically loaded via `main.js`, including:

- `mkdocs-light.css` — Base theme for MkDocs-TS.
- `notebook.css` — Styles for the Notebook plugin.
- `ts-typedoc.css` — Styles for Code API documentation.

---

## 📚 API Documentation

This demo includes an **API documentation** section rendered with the `code-api` plugin.

The JSON models are located in `/assets/api`. These models are from the
[**ts-npm**](https://github.com/w3nest/mkdocs-ts/tree/main/examples/ts-npm) project and serve as a working
example of `code-api` integration.
