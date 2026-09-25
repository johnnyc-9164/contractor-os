# Contractor OS — facts

> This file is **facts**: what this repository is. Verifiable layout, commands,
> modules, APIs, and conventions. How we work lives in `CLAUDE.md`;
> product/experience design lives in `DESIGN.md`.

## Project overview

Contractor OS: an operating system for a contracting business — leads → jobs
→ invoices. Monorepo (pnpm workspaces + turbo): Next.js 16 frontend
(`apps/web`), Convex backend (`packages/backend`), shared UI (`packages/ui`).

## Entry docs

- `AGENTS.md` (this file) — facts
- `CLAUDE.md` — protocol: decision priority, gates, collaboration
- `DESIGN.md` — experience design: what the product should feel like
- Scoped facts: `apps/web/AGENTS.md`, `apps/web/src/app/AGENTS.md`,
  `apps/web/src/components/AGENTS.md`, `apps/web/src/lib/AGENTS.md`,
  `packages/backend/AGENTS.md`, `packages/ui/AGENTS.md`,
  `packages/config/AGENTS.md`, `scripts/AGENTS.md`
- No `steering/` overrides exist. `docs/` does not exist; human long-form
  background is not AI truth.

## Workspace layout

- `apps/web` — Next.js 16 App Router frontend (Clerk auth, Tailwind, shadcn/ui)
- `packages/backend` — Convex functions; thin facade over the vendored
  `@johnnyc2026/contractor-os-core` component (107 live functions: 20 record
  types × CRUD, 15 workflows, 6 operations)
- `packages/ui` — shared React components, hooks, styles (shadcn/ui based)
- `packages/config` — shared `tsconfig.base.json`
- `scripts/` — ops scripts (`sync-vercel-env.ts`)
- `vendor/` — vendored tarballs (TEMPORARY; npm publish blocked — see
  `vendor/README.md`)
- `graft/` — repo context graph (see Orientation)

## Key technologies

- Languages: TypeScript. Runtimes: Node 22 (CI), Bun not used.
- Frameworks: Next.js 16 (App Router), React 19, Convex, Tailwind CSS v4.
- Auth: Clerk (`src/proxy.ts` runs `clerkMiddleware`); Convex via the Clerk
  **"convex" JWT template** (`convex/auth.config.ts`).
- Package manager: pnpm (workspace). Validation: Zod. Lint/format: Biome.
  Tests: Vitest. Git hooks: lefthook.

## Commands (repo root)

| Task | Command |
| --- | --- |
| Install | `pnpm install` (operator shell only — the Codex sandbox cannot; SQLite store EPERM) |
| Typecheck (web) | `pnpm --filter web exec tsc --noEmit` |
| Lint | `pnpm --filter web exec biome check src` |
| Tests (web) | `pnpm --filter web exec vitest run` |
| Production build (web) | `pnpm --filter web build` — the authoritative gate; `tsc` does not catch typed-routes errors |
| Convex codegen | `convex dev` / `convex codegen` (never edit `convex/_generated/`) |

CI (`.github/workflows/`): `ci.yml` runs typecheck, lint, test, build on every
PR. `cd.yml` runs on push to `master`: Convex production deploy → Vercel
deploy hook → smoke (homepage reachable, then `/api/health` polled until
observed SHA equals `GITHUB_SHA` and Convex reports healthy).

## Key modules and APIs

- `apps/web/src/app/dashboard/` — auth-gated dashboard; live leads/jobs from
  `api.backend.listLeads` / `listJobs`
- `apps/web/src/app/api/health/route.ts` — `GET` → `{ sha, convex, ts }`;
  `sha` is `VERCEL_GIT_COMMIT_SHA`, `convex` is a live `healthCheck` query.
  `force-dynamic`. Polled by the CD smoke step.
- `apps/web/src/components/` — `CreateLeadForm` → `co_create_lead`,
  `CreateJobForm` → `co_create_job`, `CreateInvoiceForm` → `co_create_invoice`
- `packages/backend/convex/schema.ts` — domain schema (backend crew file claim)
- `packages/backend/convex/cms.ts` — CMS mount; **known tenant-isolation hole**
  (any authenticated user can touch any site) — tracked, do not paper over in
  the frontend
- Production: `https://contractoros-ten.vercel.app`, Convex `posh-cobra-868`

## Conventions (facts, not philosophy)

- Typed routes are strict: `Link` `to` must stay in the generated `Route`
  union. Conditional spreads widen it to `string` silently — build link arrays
  imperatively or annotate. Only the production build catches this.
- No emoji in UI, code, or markup (see `DESIGN.md` for the voice rules).
- `pnpm install` and all git writes happen in an operator shell, never in a
  Codex sandbox (read-only git metadata, no pnpm).
- One git worktree per worker; no two active branches modify the same file
  (claims registered in the command log).

## Orientation

For ANY task — understanding, locating code, scoping a change — query the
repo graph before grepping: `graft ask "<question>" --source` (ranked nodes
with code spans; top node is the answer for understand/edit tasks),
`graft grep "<literal>"` for exhaustive searches, `graft map` for cold
orientation. For current library docs use the Context7 MCP: resolve the exact
library ID first, verify examples against installed versions, never send
credentials or proprietary code.
