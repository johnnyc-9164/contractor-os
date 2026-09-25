# TASKS.md — Contractor OS to production (parallel plan)

Planned 2026-09-25 by Bot (planner mode). Navigation: Graft graph built on this
repo — 160 nodes, 244 edges, 55 files (`graft build .`; cache in `graft/`,
git-ignored, regenerable).

## The finding that drives this plan

The deployed Convex project is `packages/backend` (its `dev` script runs
`convex dev`), but it is a hollow shell: empty schema (`defineSchema({})`),
no registered components, and its `package.json` lacks `@johnnyc2026/cms` and
`@johnnyc2026/contractor-os-core`.

The entire domain backend sits in `apps/web/convex/` — `backend.ts` (15
mutations covering leads → site visits → proposals → bids → contracts → jobs
→ invoices → payments → daily reports, plus 7 queries), `cms.ts` (CMS
component facade), `memberships.ts` (tenant/role model), `convex.config.ts`
(registering the `contractorOs` and `cms` components) — and that directory is
**never deployed and never imported** by the web app. The web app imports
`api` from `@contractor-os/backend`, which today only exposes `healthCheck`
and `privateData`.

T1 fixes this. Every product task depends on T1. Nothing here invents product
scope: the domain API already exists via `@johnnyc2026/contractor-os-core`
v0.5.1 — these tasks wire it up, secure it, and put real UI on it.

## Status values

`UNCLAIMED` → `IN_PROGRESS` → `REVIEW_READY` → `DONE`. Blocked work goes to
`BLOCKED` with the reason — no hacks around blockers.

## Task queue

| ID   | Title                                              | Deps      | Status     |
|------|----------------------------------------------------|-----------|------------|
| T1   | Unify Convex backend into packages/backend        | —         | REVIEW_READY |
| T2   | Biome: zero errors, zero warnings                 | —         | REVIEW_READY |
| T3   | Test harness (vitest) + CI workflow               | —         | REVIEW_READY |
| T4   | Tenant/role enforcement in the domain facade       | T1        | UNCLAIMED  |
| T5   | Leads pipeline UI                                  | T1        | UNCLAIMED  |
| T6   | Bids & proposals UI                                | T1        | UNCLAIMED  |
| T7   | Jobs UI (execution, daily reports, subs)           | T1        | UNCLAIMED  |
| T8   | Money UI (invoices, payments, balances)            | T1        | UNCLAIMED  |
| T9   | CMS site management UI                             | T1        | UNCLAIMED  |
| T10  | Real dashboard home (pipeline summary)             | T1        | UNCLAIMED  |
| T11  | PWA verification (installable + offline)           | T12       | UNCLAIMED  |
| T12  | Vercel Git connection (human-gated)                | —         | UNCLAIMED  |
| T13  | Integration verification in preview                | T12       | UNCLAIMED  |
| FIX  | Vendor @johnnyc2026 tarballs (unblock pnpm install)| —         | REVIEW_READY |

> FIX (unplanned, 2026-09-25): `apps/web` depended on the two
> `@johnnyc2026` packages via `file:E:/Downloads/*.tgz` (absolute Windows
> paths) — `pnpm install` failed on every non-PC machine, blocking T1/T3
> verification and CI. Fixed by vendoring the known-good tarballs under
> `vendor/` with relative `file:` paths (PR #7, draft). Reversible when the
> npm account clears publishing — see `vendor/README.md`. T2's draft PR is
> #6 (baseline already Biome-clean, verified independently).
> T1's draft PR is #9 (rebased onto #7; all 8 contract verifications pass).
> T3's draft PR is #8 (20/20 tests pass, rebased onto #7; CI build step
> conditional on repo secrets — needs 3 secrets from the human to activate).

## Parallelism map

- **Wave 1 (now):** T1, T2, T3, T12 run in parallel. T1 touches
  `packages/backend/convex/*`; T2 touches whatever Biome flags (no logic
  changes — formatting/lint only, coordinate with T1's moved files by running
  T2 after T1's move if both are in flight); T3 adds new files only; T12 is
  mostly a human step (GitHub App install as `johnnyc-9164`).
- **Wave 2 (after T1):** T4, T5, T6, T7, T8, T9, T10 run in parallel. Each
  owns its own route directory under `apps/web/src/app/`; shared additions to
  `packages/ui` must be additive (no edits to existing primitives).
- **Wave 3 (after T12):** T11, T13.

## Human-gated items (not tasks)

- **Issue #2 — revoke the exposed GitHub token.** The audit records a
  user-supplied attachment visibly contained a PAT. Only Johnny can revoke it
  (GitHub Settings → Developer settings → Personal access tokens). If it is
  the `contractor-os-codex` token, Codex loses push access until a
  replacement is minted. Blocks nothing else, but do it promptly.
- **Merge calls.** Every task opens one PR; nothing merges without Johnny's
  word (or a recorded PASS under the ship loop's conditional-merge rule).
- **Production deploy.** No `deploy:prod` in any task. Preview only.

## Worker rules (from the build loop)

One task per session. Max 8 touched files and 5 verification commands per
task — split the task if it doesn't fit. Read only the contract + files the
Graft map points to. No speculative refactors. If context pressure appears,
checkpoint to `HANDOFF.md`, commit, stop. Blockers become `BLOCKED` here.
