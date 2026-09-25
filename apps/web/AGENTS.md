<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/web — frontend (project notes)

Next.js 16 App Router + React + TypeScript + Tailwind + shadcn/ui. Auth via
Clerk (`src/proxy.ts` runs `clerkMiddleware` on all non-static routes).

## Layout

- `src/app/` — routes; see `src/app/AGENTS.md`
- `src/components/` — client components and creation forms; see `src/components/AGENTS.md`
- `src/lib/` — validators and shared helpers; see `src/lib/AGENTS.md`

## Rules

- **Typed routes are strict.** `Link` hrefs are checked against the generated
  route union. Never let `to` widen to `string` — conditional spreads do this
  silently. Build link arrays imperatively (`links.push({ to: "/dashboard" })`)
  so the argument is contextually typed, or annotate
  `{ to: Route; label: string }[]` with `Route` from `next`.
  `tsc --noEmit` does NOT catch this; the production build does. Every
  contract touching links must include a production build in verification.
- Forms call Convex workflow mutations directly (`api.backend.co_create_lead`
  etc.) — no intermediate API routes except `/api/health`.
- No emoji anywhere. No generic marketing phrasing.
- Env is validated at build time (varlock): `NEXT_PUBLIC_CONVEX_URL`,
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` must be set or the
  build fails before compiling.

## Commands (run from repo root)

- `pnpm --filter web exec tsc --noEmit` — typecheck
- `pnpm --filter web exec biome check src` — lint/format
- `pnpm --filter web exec vitest run` — tests
- `pnpm --filter web build` — production build (the authoritative gate)
