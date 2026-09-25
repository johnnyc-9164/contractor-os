# Contractor OS — design

## What it is

Operating system for a contracting business: leads → jobs → invoices, with
Convex as the backend and a Next.js dashboard as the frontend.

## Layout

```
apps/web            Next.js 16 App Router frontend (Clerk auth, Tailwind, shadcn/ui)
packages/backend    Convex functions — thin facade over the vendored component
packages/ui         Shared React components, hooks, styles
packages/config     Shared tsconfig base
scripts/            Ops scripts (Vercel env sync)
vendor/             Vendored tarballs (TEMPORARY — see vendor/README.md)
graft/              Repo context graph (see root AGENTS.md)
```

## Backend: Convex component, not hand-written CRUD

The domain backend is the `@johnnyc2026/contractor-os-core` Convex component:
**107 live functions** (20 record types × CRUD, 15 workflows, 6 operations).
`packages/backend/convex/` is a thin facade (`backend.ts`, `schema.ts`,
`healthCheck.ts`) that mounts it via `convex.config.ts`.

The component is **vendored** (`vendor/*.tgz`, consumed via `file:` paths)
because npm publishing is blocked by an account policy review. Do not "fix"
this by hand-editing the tarballs — when the registry versions exist, switch
the dependency source and delete `vendor/`.

Never edit `packages/backend/convex/_generated/` — it is produced by
`convex dev` / `convex deploy`.

Known issue: `cms.ts` has a tenant-isolation hole (any authenticated user can
touch any site). Tracked for a backend contract; do not paper over it in the
frontend.

## Auth chain

Clerk (frontend) → `proxy.ts` (`clerkMiddleware`) → Clerk **"convex" JWT
template** → Convex `auth.config.ts`. The JWT template lives on the Clerk
instance and is the load-bearing piece: without it, every authenticated
Convex call fails. It is created once per Clerk instance, not per deploy.

## Frontend composition

The dashboard composes live Convex data; creation forms call workflow
mutations directly:

- `/dashboard` — auth-gated; live leads/jobs lists
- `CreateLeadForm` → `co_create_lead`, `CreateJobForm` → `co_create_job`,
  `CreateInvoiceForm` → `co_create_invoice`
- `/api/health` — `force-dynamic`; returns `{ sha, convex, ts }` where `sha`
  is `VERCEL_GIT_COMMIT_SHA` and `convex` is the result of a live
  `healthCheck` query. This is what the CD pipeline polls.

## CD pipeline (`.github/workflows/`)

Push to `master` → CI (typecheck, lint, test, build) → `cd.yml`:
Convex production deploy → Vercel deploy hook → smoke. The smoke step polls
production until the homepage is reachable, then polls `/api/health` until
the observed SHA equals `GITHUB_SHA` **and** Convex reports healthy. A deploy
is not done until the pushed commit is provably live.

## Decisions (the why)

- **Compose, don't build.** The backend component already exists and is live;
  frontend work assembles forms and lists over it. New CRUD is a bug, not a
  feature.
- **Clerk first.** Agent-driven builds work best with Clerk; no WorkOS here.
- **Typed routes are strict.** Next 16 types `Link` hrefs against the
  generated route union. Conditional spreads widen `to` to `string` — build
  link arrays imperatively (`links.push({ to: "/dashboard" })`) so the
  argument is contextually typed, or annotate `{ to: Route; label: string }[]`.
  `tsc --noEmit` does not catch this; the production build does.
- **No emoji in UI/code/markup.** No generic marketing phrasing. Three-second
  buyer test.
- **Evidence-first changes.** Diagnose before editing; narrowest change the
  evidence supports; cite commands/exit codes or file:line references.
