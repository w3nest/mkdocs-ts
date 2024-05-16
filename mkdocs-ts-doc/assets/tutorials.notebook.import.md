# Notebook

This page is to test imports.

## Importing from another notebook page


<js-cell>
const {timer1s} = await load("/tutorials/notebook/import/from-page")

</js-cell>

You can then reference the variables imported, eventually reactives one:

<js-cell reactive='true'>
const div = document.createElement('div')
div.innerText = `Tick : ${timer1s}`
display(div)
</js-cell>

<note level='warning' label='Important'>
Only symbols included within `js-cell` or `py-cell` are exported.

</note>