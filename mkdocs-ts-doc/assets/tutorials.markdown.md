# Markdown

The markdown format is natively supported within `mkdocs-ts`, it is extended with non-standard features to increase
flexibility. Technical information can be found [here](@nav/api/MainModule.markdown.ts).

The most important feature we want to highhlight here is the ability to inject custom views defined in
typescript into Markdown content.

Here is an example:

<code-snippet language="javascript" highlightedLines="2 8 23-24">

const timerWidget = (declaration: HTMLElement) => {
    const delta = parseInt(declaration.getAttribute('delta'))
    return {
        tag: 'div',
        children:[
            {
                tag: 'div',
                innerText: declaration.textContent
            },
            {
                tag: 'div',
                innerText: {
                    source$: rxjs.timer(0, delta),
                    vdomMap: (_tick) => new Date().toLocalString()
                }
            }
        ],
    }
}
const page = parseMd({src:` # An example of custom widget in MD

    <timerWidget delta="1000">This text is an introduction</timerWidget>

`}, views:{timerWidget})

</code-snippet>

Explanation:

1. **`timerWidget` Function**:

   - The `timerWidget` function is defined to create a custom widget for displaying time updates.
   - It takes a parameter `declaration`, which is an HTMLElement representing the `<timerWidget>` element in the
     Markdown content.
   - It returns a virtual DOM structure representing the custom widget.
   - The widget consists of a `<div>` containing two child `<div>` elements:
     - The first child displays the text content of the `<timerWidget>` element (as defined in the Markdown).
     - The second child displays the current time, updated every specified interval (the `delta` attribute value).

2. **`page` Object**:
   - The `page` object is created by parsing Markdown content using the `parseMd` function.
   - The Markdown content contains an example usage of the custom `<timerWidget>` element.
   - The `views` parameter of `parseMd` is provided with a mapping for the `timerWidget` function,
     allowing it to be used as a custom element within the Markdown content.

In summary, the provided code snippet demonstrates how to define and use a custom widget (`<timerWidget>`)
within Markdown content. The `timerWidget` function defines the behavior and structure of the custom widget,
and it is integrated into the Markdown parsing process using the `views` parameter of the `parseMd` function.

To register custom views to be accessible whenever the `parseMd` function is used, it is possible to register them
globally:

<code-snippet language="javascript" highlightedLines="13-16">

const timerWidget = (declaration: HTMLElement) => {
    return {
        tag: 'div',
        innerText: {
            source$: rxjs.timer(0, parseInt(declaration.getAttribute('delta'))),
            vdomMap: (\_tick) => new Date().toLocalString()
        }
    }
}

GlobalMarkdownViews.factory = {
    ...GlobalMarkdownViews.factory,
    timerWidget
}
const page = parseMd({src:`    # An example of custom widget in MD
    <timerWidget delta="1000"></timerWidget>`})
</code-snippet>
