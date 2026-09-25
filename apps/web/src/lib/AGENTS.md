# apps/web/src/lib — shared helpers

Zod validators and small pure helpers for the frontend. Co-locate tests as
`<name>.test.ts`. No React components here, no Convex imports — this package
must stay importable anywhere, including non-component contexts.
