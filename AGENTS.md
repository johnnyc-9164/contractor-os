# Contractor OS — agent guide

Monorepo: Next.js 16 frontend (`apps/web`) + Convex backend (`packages/backend`)
+ shared UI (`packages/ui`). pnpm workspaces + turbo.

## Map — read the deeper file before acting

- `design.md` — architecture, auth chain, CD pipeline, key decisions
- `apps/web/AGENTS.md` — frontend (App Router, Clerk, typed routes)
- `packages/backend/AGENTS.md` — Convex component (107 functions, vendored)
- `packages/ui/AGENTS.md` — shared components
- `packages/config/AGENTS.md`, `scripts/AGENTS.md` — shared tsconfig, ops scripts

## Universal rules

- One git worktree per worker. Never share a working tree between agents.
- Operators run `pnpm install` from a normal shell. The Codex sandbox cannot
  (SQLite store EPERM) — workers never run it themselves.
- Codex workers implement + verify only. Operators commit/push (the sandbox
  makes linked-worktree git metadata read-only).
- Consequential gates (dispatch, merge, collision) run through Jev on the
  supervisor side. Worker-side Jev is best-effort (credential socket EPERM
  in the sandbox) — never let it hard-block a worker.
- No emoji in UI, code, or markup. Design bar: a buyer gets it and wants to
  call within 3 seconds.
- File claims: register before dispatch. No two active branches modify the
  same file.
- Merge order respects a moving master: announce in the command log, rebase
  onto current master, rerun verification, require full CI + Vercel preview
  green before merging.

## Orientation

For ANY task here — understanding how something works, finding where code
lives, or scoping a change — get context from the repo graph before grepping
or opening source files. `graft/` holds small linked markdown nodes explaining
each system with exact file:line spans, kept in sync with the code through git.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). For understanding or editing, the
  top node IS the answer — cite its `covers:` file:line spans and edit
  straight from `--source`. For exhaustive tasks ("every occurrence / every
  caller"), ranked results are top-N, not complete — run
  `graft grep "<literal>"` instead, falling back to raw `grep -rn` only for
  unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file. `graft callers <symbol>` gives exact caller edges.
- New to this repo? Run `graft map` first — token-budgeted orientation, no LLM.
- After big code changes, refresh with `graft build` (deterministic, $0).

For current library/framework docs, use the Context7 MCP: resolve the exact
library ID first, ask one focused question, and verify examples against this
repo's installed versions. Never put credentials or proprietary code in
Context7 queries.
