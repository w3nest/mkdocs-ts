# mkdocs-ts

<code-badges version="{{mkdocs-version}}" npm="mkdocs-ts" github="w3nest/mkdocs-ts" license="mit">
</code-badges>

---

## 🗺️ Overview

{{mkdocs-ts}} empowers you to create flexible, hierarchical document-based applications with ease. 
Whether you're building living technical docs, rich knowledge bases, or interactive educational content, 
{{mkdocs-ts}} gives you the tools to move fast — without sacrificing structure or power.

Of course, this very application is built using {{mkdocs-ts}}.

---

## ✨ Key Features

*  **Declarative Navigation Structure**
   
   Model your site's structure as a simple, nested JavaScript object. Unlike many solutions where navigation is
   static (fixed after the page loads), {{mkdocs-ts}} supports dynamic navigation updates at runtime.

*  **Flexible Layout System**
   
   Compose layouts from modular views. Mix and match templates across your project to 
   adapt any design or UX need.

*  **Markdown as First-Class Citizen**
  
   Write views in Markdown and extend them with custom components effortlessly. 
   Our enhanced Markdown engine lets you blend content and interactivity without friction.

*  **Powered by TypeScript**

   Get full type safety, rich IDE support, and confident scaling.  {{mkdocs-ts}} leverages the TypeScript compiler 
   for error detection, parameter validation, and smarter development workflows.

*  **Modular by Design**
  
   Extend your project with purpose-built plugins. See for instance our **Notebook plugin** 
   for interactive documents, or **Code-API plugin** for integrated API documentation.

---

## 🧩 Native Plugins

{{mkdocs-ts}} ships with two native plugins, described below.
They illustrate the extensibility of the library — developers can easily create additional plugins as JavaScript 
libraries to fulfill a wide range of needs.

### 📓 Notebook 

Turn your documentation into a live playground:
the `Notebook` module lets you build dynamic, computation-ready content. Ideal for technical walkthroughs, experiments, 
and interactive storytelling.

**Key features include**:

- **Multiple Cell Types**  
  Write and run JavaScript, Python (in-browser via Pyodide), Web Workers, and more — all within your app.  
  Hosting with <ext-link target="w3nest">w3nest</ext-link>? Unlock even more possibilities with custom interpreters 
  for a variety of languages.

- **Reactive Execution Model**  
  Build dynamic, reactive notebooks where cells automatically update based on changes — powered by the robustness of 
  <ext-link target="reactivex">ReactiveX</ext-link>.

Dive deeper into all the capabilities in our <cross-link target="notebook">interactive tutorials</cross-link>.

---

### 🧾 Code Api

Seamlessly embed API documentation for one or multiple libraries directly into your site.
For example, you can explore the documentation of the (TypeScript) library from
<api-link target="API"></api-link>, which even includes Python module
(like <api-link target="mkapi_python"></api-link>) — all in one unified experience.

<note level="hint" title="Extending Language Support"> 
Out of the box, {{mkdocs-ts}} supports generating API documentation for Python and TypeScript projects.
Looking to support another language? New API backends can be developed — we'd love to hear what you're building! 
</note>


---

## 🚀 Getting Started

To begin using {{mkdocs-ts}}, consider the following resources:

*  <cross-link target="tutorials">Tutorials</cross-link>: Ideal for newcomers, offering a step-by-step & 
   interactive introduction.

*  <cross-link target="how-to">How-to</cross-link>: Detailed, task-oriented instructions for specific use cases. 

*  <cross-link target="API">API Reference</cross-link>:  Comprehensive technical documentation for advanced users.

---

## 🌟 Love what you're seeing?

- ⭐ Give us a star on <github-link target="github">GitHub</github-link>.
- 🐦 Share it with friends, colleagues, or on your favorite platform.
- 💬 Feedback, ideas, or contributions are always welcome!

Every bit of support keeps the project growing — and helps remind us that we’re not building in the dark. 🚀  
Thank you for being part of the journey!
