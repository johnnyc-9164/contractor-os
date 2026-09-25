# packages/ui — shared components

shadcn/ui-based shared React components, hooks, and styles consumed by
`apps/web`. Put anything used by more than one app surface here; keep
single-use components local to the app.

- `src/components/` — primitives
- `src/hooks/`, `src/lib/`, `src/styles/` — shared logic and styling

No app-specific imports (no Convex API, no Clerk, no route knowledge) —
this package must stay consumable by any frontend.
