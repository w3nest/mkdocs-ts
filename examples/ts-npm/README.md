# Demo: TypeScript + NPM

This example demonstrates a typical setup for building an **MkDocs-TS** application using **TypeScript** and **NPM**.

---

## 🚀 Getting Started

You can run this application locally with a development server. Make sure you have either `yarn` or `npm` installed.

### Using Yarn or NPM

```bash
# Install dependencies
yarn           # or: npm install

# Start the development server (e.g. on port 3000)
yarn start --port 3000
# or: npm start -- --port 3000
```

Then open your browser at: [http://127.0.0.1:3000](http://127.0.0.1:3000)

---

## 📘 API Documentation

This demo includes generated API documentation for the project.

The JSON files required for rendering it are already included in the `assets/api` folder. If you need to regenerate them:

```bash
yarn doc       # or: npm run doc
```

---

## ⚠️ Required Configuration: `rx-vdom`

The project includes a required configuration file: `rx-vdom.config.ts`.

This file is mandatory when working with the [`rx-vdom`](https://w3nest.org/apps/@rx-vdom/doc/latest) library — a core dependency of `mkdocs-ts`.

If starting from scratch, generate it with:

```bash
yarn rx-vdom-init       # or: npx rx-vdom-init
```

---

## 📁 Project Structure

- **`src/app/`** — TypeScript source files for the application.
- **`assets/`** — Markdown content and other static resources.

---

## 🎨 Styling

Custom styles are defined in `src/app/styles.css`. It imports themes and plugin-specific styles:

```css
@import '../../node_modules/mkdocs-ts/assets/mkdocs-light.css'; /* MkDocs light theme */
@import '../../node_modules/@mkdocs-ts/notebook/assets/notebook.css'; /* Notebook plugin styles */
@import '../../node_modules/@mkdocs-ts/code-api/assets/ts-typedoc.css'; /* Code API plugin styles */
```

---

## 💡 Code Blocks & Syntax Highlighting

Markdown code blocks and code-snippet views support multiple languages
via [**WebPM**](https://w3nest.org/apps/@webpm-client/doc/latest) CDN by default.

To use **local** Prism.js grammars instead:

1. Copy the required grammar files from:

   ```
   /node_modules/prismjs/components
   ```

   to a local folder (e.g. `assets/prism`).

2. In your code, configure `CodeSnippetView` to use your local folder:

```ts
import { MdWidgets } from 'mkdocs-ts'

MdWidgets.CodeSnippetView.defaultLanguagesFolder = '/assets/prism/'
```
