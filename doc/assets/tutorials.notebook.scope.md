# Scope & Mutations

All kinds of executable cells ensure proper scope management.
Each time a cell runs, it starts with an initial scope defined by the entering scope rather than a global scope.
This feature helps maintain consistency across runs.

This is illustrated in what follows using `js-cell`, but it also applies to the other types
(`py-cell`, `interpreter-cell`, *etc.*).

## Example: Immutable Variable

Let’s initialize a variable:

<js-cell>
let foo = 42
</js-cell>

Now, mutate it:

<js-cell>
foo *= 2
display(foo)
</js-cell>

Each time you run the above cell, the output remains the same (84) because foo is reinitialized to 42 in the entering
scope every time. This ensures predictable and reproducible results.

## Example: Mutable Object

Consider a scenario involving a mutable object:

<js-cell>
let bar = { 'value': 42 }
</js-cell>

Now, mutate the value:

<js-cell>
bar['value'] *= 2
display(bar.value)
</js-cell>

Each time you run this cell, `bar['value']` is doubled, producing an updated value.
This occurs because `bar` retains its state between runs as a mutable object. Re-running the cell results in:

```
84
168
336
...
```

This illustrates a key distinction:

*  **Immutable Variables**: Are redefined with the same initial value each run, maintaining consistent behavior.
*  **Mutable Objects**: Retain and modify their state, potentially leading to different results on each run.

## Practical Implications

While mutable objects can be powerful, they can introduce challenges:

*  **Reproducibility**: Results may differ between runs due to retained state changes, complicating debugging and validation.
*  **Subtle Bugs**: Mutations can lead to hard-to-trace issues, especially when objects are shared across cells or modules.

<note level='hint'>
To avoid pitfalls associated with mutable state:

*  **Minimize Mutation**: Prefer immutable data structures where possible, especially in scenarios requiring consistent,
   reproducible results.
*  **Explicit Initialization**: Reinitialize mutable objects within cells if they must be reset to a known state for
   each run.
*  **Isolation**: Isolate mutable state changes within controlled scopes to prevent unintended side effects.

</note>

