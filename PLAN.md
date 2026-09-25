# Ship Cycle Plan

Derived from [AUDIT.md](AUDIT.md). The private repository and baseline push are complete. Stage 1 is recorded under milestone [Ship Cycle 2026-09-24](https://github.com/johnnyc-9164/contractor-os/milestone/1).

## Completed Stage 1 prerequisite — publish the audited baseline

- **Audit finding:** No remote existed at the start of this cycle. Active GitHub login is `johnnyc-9164`; the user confirmed it is the account associated with `johnnyc@agentmail.to`.
- **Acceptance criteria:** Create private `johnnyc-9164/contractor-os`, set `origin`, push the audited baseline, and verify the pushed commit and clean checks.
- **Verification:** `gh auth status`; `gh api user`; `git status --short --branch`; `git log --oneline -1`; `git remote -v`; `git ls-remote --heads origin`; `pnpm install --frozen-lockfile`; `pnpm check-types`; `pnpm exec biome check .`; `pnpm test` (accepted missing-script gap); inspect committed paths for secret files.
- **Result:** Repository created and `master` pushed at baseline `7bac8d6`; install, typecheck, and Biome passed, while `pnpm test` confirmed no test script (accepted until the first feature).

## Remaining work, ordered by leverage

### 1. Connect the private repository to Vercel

- **Tracking issue:** [#1](https://github.com/johnnyc-9164/contractor-os/issues/1)

- **Audit finding:** Vercel project `contractoros` is configured and the CLI is authenticated, but its Git settings say it is not connected. `vercel git connect https://github.com/johnnyc-9164/contractor-os.git` exited 1 because Vercel lacks GitHub App access to the private repository.
- **Acceptance criteria:** Install/authorize Vercel's GitHub App for only `johnnyc-9164/contractor-os`; connect that repository to project `contractoros`; verify the Git connection in Vercel; trigger and verify a preview deployment from a non-production branch. Do not trigger a production deployment.
- **Verification:** Confirm the GitHub App installation repository selection; confirm Vercel Project Settings → Git shows `johnnyc-9164/contractor-os`; push a non-production branch and inspect its deployment state with `vercel ls` / `vercel inspect`.

### 2. Revoke any exposed GitHub personal access token

- **Tracking issue:** [#2](https://github.com/johnnyc-9164/contractor-os/issues/2)

- **Audit finding:** The prior audit records that a user attachment visibly contained a GitHub personal access token. Treat it as exposed; no token value was copied or used by this task.
- **Acceptance criteria:** The user revokes the exposed token in GitHub token settings and confirms the action; do not reproduce or use its value.
- **Verification:** Confirm the token no longer appears in active token settings. The user performs final revocation because it invalidates an authentication credential.

### 3. Verify configured integrations safely in preview

- **Tracking issue:** [#3](https://github.com/johnnyc-9164/contractor-os/issues/3)

- **Audit finding:** Clerk, Convex, and PWA are configured in the repository but have no live runtime proof from this audit.
- **Acceptance criteria:** With approved non-production credentials and data, demonstrate Clerk sign-in, Convex health, and PWA offline behavior; keep production data and deployment out of scope.
- **Verification:** Record the exact preview/browser smoke procedure and command outputs on the issue.

### 4. Add automated tests with the first feature

- **Tracking issue:** [#4](https://github.com/johnnyc-9164/contractor-os/issues/4)

- **Audit finding:** `pnpm test` exits 1 because no test script exists. This is an accepted gap until the first feature lands.
- **Acceptance criteria:** Add a test script and automated coverage as part of the first feature; keep this gap documented until then.
- **Verification:** Check the root `package.json` and run `pnpm test` after the first feature lands.

## Cycle execution status

- Stage 1 exit gate is met: milestone [Ship Cycle 2026-09-24](https://github.com/johnnyc-9164/contractor-os/milestone/1) exists, and issues [#1](https://github.com/johnnyc-9164/contractor-os/issues/1)–[#4](https://github.com/johnnyc-9164/contractor-os/issues/4) contain acceptance criteria and verification.
- Stages 2–4 are complete for issue #1 in [SPEC.md](SPEC.md), [TASKS.md](TASKS.md), and [CONTRACT.md](CONTRACT.md); the contract is linked from issue #1.
- Stage 5 is in progress in draft [PR #5](https://github.com/johnnyc-9164/contractor-os/pull/5), targeting the repository's existing default branch `master`. It is not ready for review: GitHub reports no checks, and no Vercel Git connection or preview exists yet.
- To continue Stage 5, the user must complete the open GitHub app installation flow while signed into `johnnyc-9164` and grant access only to `contractor-os`. The browser currently shows `mplsjohnnycage`; the agent will not enter account credentials.
- No production deployment is authorized. Stages 6–7 must wait until the contract's preview and check evidence pass.
