/* eslint-env node -- eslint-comment add exception because the running context is node environment */
module.exports = {
    entryPoints: ['./src/index.ts'],
    exclude: ['src/tests'],
    out: 'tooling/typedoc-html',
    theme: 'default',
    categorizeByGroup: false,
}
