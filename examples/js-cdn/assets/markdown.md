# Markdown

Markdown is a lightweight and human-friendly syntax for formatting content—and it’s at the core of `mkdocs-ts`.

But we don’t stop at the basics.

---

## 🚀 Enhanced Markdown Features

`mkdocs-ts` extends traditional Markdown with rich, interactive components that feel native to your documentation.

### 📝 Notes

Communicate clearly with visually styled notes:

<note level="hint" title="Hint">Need to emphasize helpful tips? Use a **hint** note like this.</note>

<note level="warning" title="Warning">Draw attention to potential issues with a warning.</note>

<note level="example" title="Customizable" icon="fas fa-rocket" expandable="true">
Notes are highly customizable—add icons, make them collapsible, or choose from multiple styles.
</note>

---

### 💻 Code Snippets

Present code with syntax highlighting, line numbers, and optional highlighting—out of the box:

<code-snippet language="javascript" highlightedLines="7" lineNumbers="true">
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

---

### And More

Visit the <ext-link target="MdBuiltInViews">builtin views</ext-link> documentation for the available widgets and
their options.

---

## 🧩 Custom Views

Go beyond built-ins—define your own interactive Markdown views powered by your app logic.

For example, the <api-link target="TRexView"></api-link> defines a simple animated component
easily included in Markdown using:

<code-snippet language='html'>
<TRex name="T-Rex"></TRex>
</code-snippet>

Which renders as:

<TRex name="T-Rex"></TRex>

---

## 🌱 Next Steps

Build your own JavaScript libraries with custom Markdown views—and reuse them across projects with zero boilerplate.
