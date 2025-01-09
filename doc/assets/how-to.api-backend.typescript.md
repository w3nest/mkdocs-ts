# Typescript

---

## Requirements:

Parsing the documentation of a typescript project to generate its API files is using the TypeScript compiler as well as 
<a target="_blanck" href="https://typedoc.org/">TypeDoc</a>: `typedoc` and `typescript` must be available in the
`node_modules` folder of the documented project. 

Also, The `typedoc` configuration file `typedoc.js` is expected in this 
folder.

<note level='hint'>
Before moving forward,  make sure `typedoc` is running successfully in your documented project using `yarn doc --conf=`
</note>

--- 

## Usage:

In your documentation project
You can use the following node script to generate API data:

```shell
(cd $docAppPath/node_modules/@youwol/mkdocs-ts/ \
&& node ./bin/index.js \
    --project $apiPath \
    --nav /api \
    --out $docAppPath/assets/api)
```

Where:

- **$docAppPath**: Path of the documenting application.
- **$apiPath**: Path of the API project.
- **--project**: Specifies the API project path.
- **--nav**: Specifies the base path where the API is served in the documentation application.
- **--out**: Specifies the output directory for the generated API data.

