# Imports

This page serves as an example to demonstrate the process of importing JavaScript symbols from one notebook page
into another. The actual import is initiated from [the parent page](@nav/tutorials/notebook/import).

Although this page is not designed to run independently, it is still recommended to import the required dependencies
for completeness:

<js-cell>
const { rxjs } = await webpm.install({
    modules:["rxjs#^7.5.6 as rxjs"]
})
</js-cell>

<note level="hint">
The previous installation step is optimized to skip execution if the required resources are already available on your 
system.
</note>

Below is a symbol imported from the parent page:

<js-cell>
const timer1s = rxjs.timer(0,1000)
</js-cell>

You can also import Python functions from Python cells, as illustrated in the
[Python page](@nav/tutorials/notebook/python).