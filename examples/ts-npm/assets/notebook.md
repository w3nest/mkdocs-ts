# Notebook

Notebook feature is brought by the `@mkdocs-ts/notebook` plugin.

This example demonstrates a **simple JavaScript cell**:

<js-cell>
display('Hello World')
</js-cell>

Click the <i class='fas fa-play text-success'></i> button to run the cell, or press <kbd>Ctrl</kbd>+<kbd>Enter</kbd>
inside the cell.

---

### **Different Cell Types**

In addition to JavaScript cells, notebooks support multiple interactive cell types:

- **\`md-cell\`** → Markdown for rich text and formatting
- **\`py-cell\`** → In-Browser Python execution
- **\`interpreter-cell\`** → Custom interpreters for other languages
- **\`worker-cell\`** → Background task execution

---

### **Reactive from the Ground Up**

Built-in **reactivity** using <a target="_blank" href="https://reactivex.io/">ReactiveX</a> ensures seamless updates
and dynamic content.

<note level='hint'>
Want to explore more? Check the dedicated <ext-link target="NotebookDoc">Notebook Documentation</ext-link>. 
</note>
