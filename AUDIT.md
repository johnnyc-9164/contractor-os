# Current State Audit

Audit date: 2026-09-24

## Repository state

- Graft navigation (`graft map`, `graft ask`) responded successfully (exit 0); it is the repo's navigation source.
- `git status --short --branch`: clean local branch `master` tracking `origin/master` after the baseline push.
- Baseline commit `7bac8d6 chore: establish audited baseline` exists on `origin/master` at `https://github.com/johnnyc-9164/contractor-os` (private repository).
- The baseline contains 100 tracked files. It excludes `.env` value files, `.vercel`, `node_modules`, the Graft cache, key/certificate files, and local skill installation directories. It includes `apps/web/.env.schema`.
- Repository areas include `apps/web/` (Next.js app), `packages/backend/` (Convex), `packages/ui/`, `packages/config/`, root tooling, and `scripts/`.
- `.agents/skills/` and `.claude/skills/` are locally installed upstream skill content whose hashes were altered by the authorized Biome write pass. Those local directories are excluded from version control; `skills-lock.json` remains tracked. `graft/` and generated `apps/web/src/env.ts` are excluded from the baseline.
- Root `AGENTS.md` includes Context7 instructions, and the Context7 MCP was used to query TypeScript documentation. Jev tools responded and selected a read-only browser inspection as the next safe step.

## Integrations

| Integration | Classification | Evidence and limit |
|---|---|---|
| Clerk | CONFIGURED | Dependencies, proxy/provider, and Convex auth configuration exist; no live sign-in was run. |
| Convex | CONFIGURED | Schemas, functions, and generated bindings exist; no deployed health query was run. |
| Vercel CLI/project | VERIFIED | `vercel whoami` (exit 0) reports `johnnyc-9164`; `vercel project ls` (exit 0) lists `contractoros`, and `.vercel/project.json` links this checkout to that project. No deployment was run. |
| Vercel Git connection | BROKEN | `vercel git connect https://github.com/johnnyc-9164/contractor-os.git` (exit 1) could not connect the private repository. Project Git settings state it is not connected; Vercel's GitHub App must be installed with access to the repository. User authorized that access, but the browser is currently signed in to the wrong GitHub account for this repository. |
| Varlock | VERIFIED | `pnpm install --frozen-lockfile` completed code generation successfully (exit 0). |
| PWA | CONFIGURED | Manifest, service worker, offline page, and icons exist; browser install/offline behavior is unverified. |
| Graft CLI/MCP | VERIFIED | `graft map` / `graft ask ... --source` returned context (exit 0); `graft mcp .` completed MCP initialize, `tools/list`, and `graft_repo_map` smoke requests (exit 0). |
| Context7 | VERIFIED | Resolved `/microsoft/typescript` and queried `verbatimModuleSyntax`; no matching TypeScript 6.0.3 docs version was available. |
| Jev | VERIFIED | Jev gate/choice tools responded; selected read-only inspection of existing GitHub browser sessions. |
| GitHub remote | VERIFIED | `gh auth status` and `gh api user` (exit 0) identify active user `johnnyc-9164`; `gh repo create johnnyc-9164/contractor-os --private --source . --remote origin --push` (exit 0) created the private repo and pushed `master`. User confirmed this is the account associated with `johnnyc@agentmail.to`. |
| GitHub planning | VERIFIED | Milestone `Ship Cycle 2026-09-24` and issues #1–#4 were created successfully in the private repository. |

## Checks on the baseline

| Check | Command | Exit | Result |
|---|---|---:|---|
| Install | `pnpm install --frozen-lockfile` | 0 | Lockfile current; Varlock generated `apps/web/src/env.ts`. |
| TypeScript | `pnpm check-types` | 0 | Two Turbo tasks succeeded. |
| Biome write pass | `pnpm exec biome check --write .` | 1 | Authorized once; initially fixed 79 files and reported 15 errors/4 warnings, leading to scoped cleanup/exclusions. |
| Biome final | `pnpm exec biome check .` | 0 | Fresh baseline check: 68 files checked, no fixes needed. |
| Git whitespace | `git diff --check` | 0 | Fresh check on documentation changes. |
| Tests | `pnpm test` | 1 | No test script. Accepted gap until first feature lands, per user instruction. |

## Secret handling

- `.env.local` was inspected under the user's authorization; it contains a set `VERCEL_OIDC_TOKEN`. The value was never emitted or committed.
- `apps/web/.env` and `apps/web/.env.local` are ignored; values were not emitted or committed.
- `git check-ignore -v` confirmed env value files are excluded. `apps/web/.env.schema` is included as a non-secret schema.
- `git ls-tree -r --name-only HEAD` contains `apps/web/.env.schema` but no `.env` value files, private key, or certificate paths. `git check-ignore -v .env.local apps/web/.env apps/web/.env.local` confirms local value files are ignored.

## GitHub identity gate

- `gh auth status` and `gh api user` (exit 0) identify active login `johnnyc-9164`; the user confirmed this is the intended GitHub account associated with `johnnyc@agentmail.to`.
- `gh api user/emails` remains unavailable (exit 1) because the token does not include GitHub's `user` scope; email ownership is confirmed by the user, not independently read from the API.
- The prior audit records a user-supplied attachment visibly contained a GitHub personal access token. The token was not copied or used; treat it as exposed and revoke it in GitHub token settings.
- The Vercel GitHub App install page opened under a browser session signed in as `mplsjohnnycage`, so installation was not approved for the wrong account. User authorization to grant Vercel access to `contractor-os` was received; the user must complete the account handoff/sign-in as `johnnyc-9164` before installation can continue.

## Remaining gaps by leverage

1. Complete Vercel GitHub App installation while signed in as `johnnyc-9164`, grant access only to `contractor-os`, connect the repository to Vercel project `contractoros`, and verify Git-triggered preview behavior.
2. Revoke the previously exposed GitHub personal access token; the user must perform credential revocation.
3. With approved non-production credentials, verify Clerk sign-in, Convex health, and PWA offline behavior.
4. At the first feature, add a test script and automated coverage; absent tests are an accepted gap until then.

## Stage status

Stage 0 is complete: audit exists, secret paths are excluded, baseline `7bac8d6` is pushed, and install/typecheck/Biome checks passed; tests remain an accepted missing-script gap. Stage 1 is complete: the private repository and origin exist, the plan is pushed, and milestone `Ship Cycle 2026-09-24` contains issues #1–#4. Stage 2–4 artifacts for issue #1 are written in `SPEC.md`, `TASKS.md`, and `CONTRACT.md`; the user's approval gate is cleared. Stage 5 is blocked until the user completes GitHub sign-in as `johnnyc-9164` in the open Vercel App install page. No PR, review, or merge exists.
