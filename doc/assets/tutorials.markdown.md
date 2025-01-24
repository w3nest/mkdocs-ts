# Markdown

Markdown is a lightweight and widely used markup language that allows you to format text in a simple and readable way.
Beyond the standard syntax, {{mkdocs-ts}} extends Markdown with additional features, which are documented in
<api-link target='MdParsingOptions'></api-link>.

This page focuses on custom views, which enable you to insert interactive, JavaScript-powered components within 
your Markdown content. 
It also briefly introduces LaTeX support, followed by a summary of key Markdown syntax elements.


## Custom Views

Custom views extend Markdown's capabilities by allowing you to include dynamic, JavaScript-generated widgets.
These widgets are referenced in Markdown as DOM elements, with input data provided through attributes or text content.

### Built-In Widgets

{{mkdocs-ts}} includes several built-in widgets:

<md-cell>
**Note**

<note level="hint" title="Note">
An example of note.
</note>

---

**Code Snippet**

<code-snippet language="javascript">
const foo = 42
</code-snippet>

---

**Badges**

<code-badges version="{{mkdocs-version}}" npm="mkdocs-ts" github="w3nest/mkdocs-ts" license="mit">
</code-badges>

</md-cell>

You can find a full list of available built-in widgets in <api-link target='MdWidgets'></api-link>.
In particular, there are multiple types of notes, which are illustrated in <api-link target='NoteView'></api-link>.

<note level='info'> 
Custom views can be as simple or complex as needed.
For instance, the **notebook cells** used on this page are themselves custom views 
(see <api-link target="JsCellView"></api-link>). 
</note>

### New Widgets

To create a new widget, implement a JavaScript function matching the
<api-link target='ViewGenerator'></api-link> signature.

**Example: A TODO Widget**

This widget displays a TODO item with the following properties:

*  **Title**: Retrieved from the title attribute of the HTMLElement.
*  **Status**: Retrieved from the status attribute (done or pending).
*  **Description**: Provided as Markdown inside the element’s text content.


**Implementation**

<js-cell>
const version = "{{mkdocs-version}}"

const { MkDocs } = await webpm.install({
    esm:[ `mkdocs-ts#${version} as MkDocs`]
})
const todoWidget = (elem) => {
    // elem is the associated HTMLElement as declared in the Markdown source. 
    const title = elem.getAttribute('title')
    const status = elem.getAttribute('status')
    return { 
        tag: 'div',
        class: 'border',
        children: [
            {
                tag: 'div',
                class: 'd-flex align-items-center bg-light p-1 px-2 rounded',
                children:[
                    {
                        tag: 'i', 
                        class: status === 'done' 
                            ? 'fas fa-check text-success' 
                            : 'fas fa-hourglass-half'
                    },
                    {   tag: 'div', class: 'mx-2' },
                    {   tag: 'div', innerText: title },
                ]           
            },
            {   
                tag: 'div', 
                class: 'p-2', 
                children: [
                    MkDocs.parseMd({src: elem.textContent})
                ]
            },
        ]
    }
}
</js-cell>

<note level="hint">
*  The <api-link target='ViewGenerator'></api-link> returned type is 
   <api-link target='AnyView'></api-link>: you can define a widget using your favorite UI library and return its 
   `HTMLElement`.
*  The second argument of <api-link target='ViewGenerator'></api-link> is 
   <api-link target='MdParsingOptions'></api-link>, which can be passed to further calls to 
   <api-link target='parseMd'></api-link>.
</note>

**Usage in Markdown**

To enable the `todo` element, pass it when calling <api-link target="parseMd"></api-link>:

<js-cell>
const src=`
An example displaying our custom \`TODO\` widget:

<todo title='Markdown Tuto' status='done'>
Provide a **Markdown** tutorial, focus on **non-standard** features.
</todo>
`
display(MkDocs.parseMd({
    src, 
    views: { 'todo': todoWidget }
}))
</js-cell>


### Global Registration

To avoid manually passing widgets each time, you can register them globally using
<api-link target="GlobalMarkdownViews"></api-link>:

<js-cell>
MkDocs.GlobalMarkdownViews.factory = {
   ...MkDocs.GlobalMarkdownViews.factory,
   todo: todoWidget
}
</js-cell>

Now, todo elements can be used anywhere in Markdown without needing explicit registration:

<md-cell>
This Markdown cell is parsed **without** manually providing custom views, yet we can still reference TODO items:

<todo title='Markdown Tuto' status='done'>
Provide a **Markdown** tutorial, focus on **non-standard** features.
</todo>

</md-cell>



## Enabling Latex

To enable LaTeX support in {{mkdocs-ts}}, follow these steps:

*  Ensure the <a href="https://www.mathjax.org/" target="_blank">MathJax</a> module is available.

*  Set the `latex: true` option in <api-link target='MdParsingOptions'></api-link>.

<md-cell>
When \\(a \ne 0 \\), there are two solutions to \\(ax^2 + bx + c = 0\\),
and they are:
$$
x = {-b \pm \sqrt{b^2-4ac} \over 2a}.
$$
</md-cell>

<note level="warning" title="Delimiters">
By default `MathJax` uses as delimiters:
- Block equations: `$$ ... $$`
- Inline equations: `\( ... \)`, **BUT** due to Markdown escaping backslashes, you must write them as `\\( ... \\)`.
  When calling `parseMd` from JavaScript, escaping becomes even trickier. To configure custom delimiters, see below.
</note>

### Customizing LaTeX Delimiters

To define custom delimiters (e.g., using `$...$` for inline math),
set the following configuration **before** loading `MathJax`:

<code-snippet language='javascript'>
window.MathJax = {
    tex: { inlineMath: [ ['$', '$'], ['\(', '\)'] ] },
}
</code-snippet>


## Standard synthax

### Headings
You can create a heading by adding one or more `#` symbols before your heading text.

<md-cell>
# H1
## H2
### H3
#### H4
##### H5
###### H6
</md-cell>

### Emphasis

You can add emphasis by making text italic or bold.

<md-cell>
*Italic* or _Italic_
**Bold** or __Bold__
***Bold and Italic*** or ___Bold and Italic___
</md-cell>


### Lists

**Unordered Lists**

You can create an unordered list by preceding list items with `-`, `*`, or `+`.

<md-cell>
- Item 1
- Item 2
  - Subitem 1
  - Subitem 2
* Item 3
* Item 4
+ Item 5
+ Item 6
</md-cell>

**Ordered Lists**

You can create an ordered list by preceding list items with numbers.

<md-cell>
1. First item
2. Second item
3. Third item
   1. Subitem 1
   2. Subitem 2
</md-cell>

### Links

You can create a link by wrapping the link text in brackets `[ ]`, and then wrapping the URL in parentheses `( )`.

<md-cell>
[Link text](https://en.wikipedia.org/wiki/Markdown)
</md-cell>

### Images

You can create an image by adding an exclamation mark `!` before the link.

<md-cell>
![Alt text](../assets/Markdown-mark.png)
</md-cell>

### Blockquotes

You can create a blockquote by preceding a line with the > character.

<md-cell>
> This is a blockquote.
> 
> This is the second paragraph in the blockquote.
</md-cell>

### Code

**Inline code**

You can create inline code by wrapping text in backticks \`.

<md-cell>
Here is some `inline code`.
</md-cell>

**Code Blocks**

You can create a code block by indenting lines with four spaces or one tab, or by wrapping text in triple backticks ```.

<md-cell>
```javascript
const foo = 42
```
</md-cell>

### Horizontal Rules

You can create a horizontal rule by using three or more dashes `---`, asterisks `***`, or underscores `___` on a line 
by themselves.
<md-cell>
A

---
B

***
C

___
D
</md-cell>

### Tables

You can create tables by using pipes `|` and dashes `-` to separate columns and rows.

<md-cell>
| Header 1 | Header 2 |
| -------- | -------- |
| Row 1 Col 1 | Row 1 Col 2 |
| Row 2 Col 1 | Row 2 Col 2 |
</md-cell>

### Task Lists

You can create a task list by preceding list items with `[ ]` for incomplete tasks or `[x]` for completed tasks.
<md-cell>
- [x] Completed task
- [ ] Incomplete task
</md-cell>

### Strikethrough

You can add strikethrough text by wrapping text in double tildes `~~`.
<md-cell>
~~Strikethrough~~
</md-cell>

### Inline HTML

You can also include HTML directly in your Markdown.

<md-cell>
<p>This is a paragraph in HTML.</p>
</md-cell>
