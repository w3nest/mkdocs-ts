# Markdown

Markdown is a lightweight and widely used markup language that allows you to format text in a simple and readable way.
Beyond the standard syntax, **`mkdocs-ts`** extends Markdown with additional features.

## Built-ins view

You can leverage various built-ins view.

**Notes**:

<note level="hint" title="Note">
An example of note.
</note>

<note level="warning" title="Warning">
An example of warning.
</note>

**Code Snippets**:

You can display code-snippets with syntax highlighting for various language:

<code-snippet language="javascript" highlightedLines="7">
function compute(p:{improbabilityFactor, babelFishCount, vogonPoetryExposure, towelAbsorbency }){
    console.log("Computation complete! The result is 42");
    const result =
        Math.log(improbabilityFactor + 42) +
        babelFishCount === 1 ? 1 : Math.sqrt(babelFishCount) +
        vogonPoetryExposure > 1000 ? -42 : vogonPoetryExposure / 100 +
        towelAbsorbency * (Math.random() + 0.42)
    return 42;
}
</code-snippet>

## Custom View

In your JavaScript application you can also define custom views:

<custom></custom>
