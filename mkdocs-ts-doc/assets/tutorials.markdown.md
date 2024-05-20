# Markdown

When creating documents, it is usual to extensively use Markdown format. You can include Markdown content by 
using the [parseMd](@nav/api/MainModule.parseMd) or [fetchMd](@nav/api/MainModule.fetchMd) functions
(parsing from source or from URL respectively).

The Markdown engine support most of the standard elements of Markdown, a recap is provided in the next section.
The [Extended syntax](@nav/tutorials/markdown.extended-synthax) section covers some specifics of the engine.

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

## Extended synthax

### Enabling Latex

To enable parsing latex:
*  Make the <a href="https://www.mathjax.org/" target="_blank">MathJax</a> module available.
*  Provide the options `latex:true` to the [parseMd](@nav/api/MainModule.parseMd) or 
   [fetchMd](@nav/api/MainModule.fetchMd) functions.

<md-cell>
When \\(a \ne 0 \\), there are two solutions to \\\\(ax^2 + bx + c = 0\\\\),
and they are:
$$
x = {-b \pm \sqrt{b^2-4ac} \over 2a}.
$$
</md-cell>

### Custom views

You can create custom HTML views within your JavaScript/TypeScript code and reference them within Markdown sources.
A custom view is defined as a function that takes a DOM element declared in the Markdown source as an argument and 
returns a Virtual DOM (from the library **@youwol/rx-vdom**).

For instance, the following snippet defines a clock view. This view expects an introduction text (retrieved from 
the DOM element's `textContent`) and a `tickPeriod` attribute:

<js-cell>

const clockView = (declaration) => {
    const delta = parseInt(declaration.getAttribute('tickPeriod'))
    const introduction = declaration.textContent
    return {
        tag: 'div',
        children:[
            {
                tag: 'div',
                innerText: introduction
            },
            {
                tag: 'div',
                innerText: {
                    source$: rxjs.timer(0, delta),
                    vdomMap: (_tick) => new Date().toLocaleString()
                }
            }
        ],
    }
}
</js-cell>

To use the custom view within Markdown, declare the DOM element with the expected attributes:

<js-cell>
const { MkDocs } = await webpm.install({
    modules:['@youwol/mkdocs-ts#0.3.5-wip as MkDocs']
})
let src = `
# Custom view 

<clockView tickPeriod='1000'>clock-view introduction</clockView>
`
display(MkDocs.parseMd({
    src,
    views: {clockView}
}))
</js-cell>


**Global declarations**

You can define custom views globally so that they don't need to be included with the views attribute of 
`parseMd` or `fetchMd`.

<js-cell>
Object.assign(MkDocs.GlobalMarkdownViews.factory, {clockView})

src = `
# Global custom view 

<clockView tickPeriod='1000'>clock-view introduction</clockView>
`
display(MkDocs.parseMd({
    src
}))
</js-cell>

By using this approach, the clockView custom view is globally available for use in Markdown sources without needing 
to specify it in the views attribute every time.
