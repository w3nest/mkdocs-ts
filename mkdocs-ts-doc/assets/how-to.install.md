# Installation

## From npm

You can install `@youwol/mkdocs-ts` using npm:

```shell
npm install @youwol/mkdocs-ts
```

Or using yarn:

```shell
yarn add @youwol/mkdocs-ts
```

## From CDN

If you prefer using a CDN, note that the library doesn't come bundled with its dependencies. However, you can easily include it in your webpage using `@youwol/webpm-client`:

<code-snippet language="htmlmixed">
<html lang="en">
<head>
    <script src="https://webpm.org/^3.0.0/webpm-client.js"></script>
</head>

<script type="module">
    const { mk } = await webpm.install({
        modules: ['@youwol/mkdocs-ts#latest as mk'],
        css: ['@youwol/mkdocs-ts#latest~assets/mkdocs-ts.css'],
        displayLoadingScreen: true
    });
    console.log(mk);
</script>
</html>
</code-snippet>

This script dynamically loads `@youwol/mkdocs-ts`, its direct and indirect dependencies as well as associated CSS file,
allowing you to integrate it seamlessly into your webpage.
