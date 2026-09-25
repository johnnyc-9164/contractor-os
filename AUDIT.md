# Current State Audit

Audit date: 2026-09-24

## Repository state

- Graft navigation (`graft map`, `graft ask`) responded successfully (exit 0); it is the repo's navigation source.
- `git status --short --branch`: clean local branch `master` after the audit/plan edits are staged for baseline amendment.
- Local root commit `b2a8b68 chore: establish audited baseline` exists; no remote is configured.
- The baseline contains 100 tracked files. It excludes `.env` value files, `.vercel`, `node_modules`, the Graft cache, key/certificate files, and local skill installation directories. It includes `apps/web/.env.schema`.
- Repository areas include `apps/web/` (Next.js app), `packages/backend/` (Convex), `packages/ui/`, `packages/config/`, root tooling, and `scripts/`.
- `.agents/skills/` and `.claude/skills/` are locally installed upstream skill content whose hashes were altered by the authorized Biome write pass. Those local directories are excluded from version control; `skills-lock.json` remains tracked. `graft/` and generated `apps/web/src/env.ts` are excluded from the baseline.
- Root `AGENTS.md` includes Context7 instructions, and the Context7 MCP was used to query TypeScript documentation. Jev tools responded and selected a read-only browser inspection as the next safe step.

## Integrations

| Integration | Classification | Evidence and limit |
|---|---|---|
| Clerk | CONFIGURED | Dependencies, proxy/provider, and Convex auth configuration exist; no live sign-in was run. |
| Convex | CONFIGURED | Schemas, functions, and generated bindings exist; no deployed health query was run. |
| Vercel | CONFIGURED | `vercel.json`, scripts, and local state exist; no deployment was run. |
| Varlock | VERIFIED | `pnpm install --frozen-lockfile` completed code generation successfully (exit 0). |
| PWA | CONFIGURED | Manifest, service worker, offline page, and icons exist; browser install/offline behavior is unverified. |
| Graft | VERIFIED | `graft map` and `graft ask ... --source` returned context (exit 0). |
| Context7 | VERIFIED | Resolved `/microsoft/typescript` and queried `verbatimModuleSyntax`; no matching TypeScript 6.0.3 docs version was available. |
| Jev | VERIFIED | Jev gate/choice tools responded; selected read-only inspection of existing GitHub browser sessions. |
| GitHub remote | MISSING | `git remote -v` returned no remote. No repository was created. |

## Checks on the baseline

| Check | Command | Exit | Result |
|---|---|---:|---|
| Install | `pnpm install --frozen-lockfile` | 0 | Lockfile current; Varlock generated `apps/web/src/env.ts`. |
| TypeScript | `pnpm check-types` | 0 | Two Turbo tasks succeeded. |
| Biome write pass | `pnpm exec biome check --write .` | 1 | Authorized once; initially fixed 79 files and reported 15 errors/4 warnings, leading to scoped cleanup/exclusions. |
| Biome final | `pnpm exec biome check .` | 0 | Clean final check before this audit-only amendment; rerun against amended commit. |
| Git whitespace | `git diff --cached --check` | 0 | Clean before initial baseline commit; rerun for amendment. |
| Tests | `pnpm test` | 1 | No test script. Accepted gap until first feature lands, per user instruction. |

## Secret handling

- `.env.local` was inspected under the user's authorization; it contains a set `VERCEL_OIDC_TOKEN`. The value was never emitted or committed.
- `apps/web/.env` and `apps/web/.env.local` are ignored; values were not emitted or committed.
- `git check-ignore -v` confirmed env value files are excluded. `apps/web/.env.schema` is included as a non-secret schema.
- The initial commit-path audit found no env-value paths or key/certificate files among its 100 files. Repeat the path audit after the amendment.

## GitHub identity gate

- `gh auth status` (exit 0) showed active login `mplsjohnnycage` and an inactive login `skysthelimitpainting1779-collab`.
- GitHub settings in the active browser session showed primary verified email `mplsjohnnycage@makeithappenentllc.com`; `johnnyc@agentmail.to` was not listed. Another listed address was unverified.
- `gh api user/emails` requires a `user` scope not present on the active token. The user authorized refresh; GitHub's device flow requires user entry of its one-time code, which the agent did not enter. Read-only browser inspection found no second signed-in GitHub session.
- A later user attachment visibly contains a GitHub personal access token. It is not used or copied. Revoke it in GitHub token settings; treat it as exposed.
- No repository was created under an unverified account, and no remote push occurred. The local commit author used the user-provided `johnnyc@agentmail.to` only as commit metadata.

## Remaining gaps by leverage

1. Authenticate and verify the account whose verified email is exactly `johnnyc@agentmail.to`; create private `contractor-os`, set `origin`, push the baseline, and verify the remote commit.
2. After the remote exists, create a cycle milestone and issues with acceptance criteria and verification commands.
3. At the first feature, add a test script and automated coverage; absent tests are an accepted gap until then.
4. With approved non-production credentials, verify Clerk sign-in, Convex health, Vercel preview, and PWA offline behavior.

## Stage status

Stage 0 is complete locally: audit exists, secrets are excluded, checks were run, and a baseline commit exists. Stage 1 remains incomplete because the correct GitHub account is not authenticated. No remote, issues, Stage 2 spec, task contract, PR, review, or merge exists.
