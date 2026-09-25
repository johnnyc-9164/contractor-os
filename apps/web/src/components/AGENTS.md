# apps/web/src/components — client components

Creation forms (`CreateLeadForm`, `CreateJobForm`, `CreateInvoiceForm`) call
Convex workflow mutations directly — no form ever writes via a custom API
route. Keep forms thin: field state, Zod validation from `src/lib`, one
mutation call, loading/error states.

- `header.tsx` — nav links. Typed-routes rule applies: build the link array
  imperatively so `to` stays in the `Route` union (see `apps/web/AGENTS.md`).
- Co-locate tests as `<Name>.test.ts(x)` next to the component.
- Use `Number.isNaN`, never the global `isNaN`.
- No emoji. shadcn/ui primitives from `@contractor-os/ui` where they exist;
  local components only for what the shared package lacks.
