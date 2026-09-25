# Ship Cycle Plan

Derived from [AUDIT.md](AUDIT.md). The private repository and baseline push are complete; the remaining work is tracked under the current cycle milestone after Stage 1 is recorded.

## Completed Stage 1 prerequisite — publish the audited baseline

- **Audit finding:** No remote existed at the start of this cycle. Active GitHub login is `johnnyc-9164`; the user confirmed it is the account associated with `johnnyc@agentmail.to`.
- **Acceptance criteria:** Create private `johnnyc-9164/contractor-os`, set `origin`, push the audited baseline, and verify the pushed commit and clean checks.
- **Verification:** `gh auth status`; `gh api user`; `git status --short --branch`; `git log --oneline -1`; `git remote -v`; `git ls-remote --heads origin`; `pnpm install --frozen-lockfile`; `pnpm check-types`; `pnpm exec biome check .`; `pnpm test` (accepted missing-script gap); inspect committed paths for secret files.
- **Result:** Repository created and `master` pushed at baseline `7bac8d6`; install, typecheck, and Biome passed, while `pnpm test` confirmed no test script (accepted until the first feature).

## Remaining work, ordered by leverage

### 1. Connect the private repository to Vercel

- **Audit finding:** Vercel project `contractoros` is configured and the CLI is authenticated, but its Git settings say it is not connected. `vercel git connect https://github.com/johnnyc-9164/contractor-os.git` exited 1 because Vercel lacks GitHub App access to the private repository.
- **Acceptance criteria:** Install/authorize Vercel's GitHub App for only `johnnyc-9164/contractor-os`; connect that repository to project `contractoros`; verify the Git connection in Vercel; trigger and verify a preview deployment from a non-production branch. Do not trigger a production deployment.
- **Verification:** Confirm the GitHub App installation repository selection; confirm Vercel Project Settings → Git shows `johnnyc-9164/contractor-os`; push a non-production branch and inspect its deployment state with `vercel ls` / `vercel inspect`.

### 2. Revoke any exposed GitHub personal access token

- **Audit finding:** The prior audit records that a user attachment visibly contained a GitHub personal access token. Treat it as exposed; no token value was copied or used by this task.
- **Acceptance criteria:** The user revokes the exposed token in GitHub token settings and confirms the action; do not reproduce or use its value.
- **Verification:** Confirm the token no longer appears in active token settings. The user performs final revocation because it invalidates an authentication credential.

### 3. Verify configured integrations safely in preview

- **Audit finding:** Clerk, Convex, and PWA are configured in the repository but have no live runtime proof from this audit.
- **Acceptance criteria:** With approved non-production credentials and data, demonstrate Clerk sign-in, Convex health, and PWA offline behavior; keep production data and deployment out of scope.
- **Verification:** Record the exact preview/browser smoke procedure and command outputs on the issue.

### 4. Add automated tests with the first feature

- **Audit finding:** `pnpm test` exits 1 because no test script exists. This is an accepted gap until the first feature lands.
- **Acceptance criteria:** Add a test script and automated coverage as part of the first feature; keep this gap documented until then.
- **Verification:** Check the root `package.json` and run `pnpm test` after the first feature lands.

## Stage 2 candidate

Item 1 is the highest-leverage next task. The user explicitly requested the Vercel connection and authorized granting the GitHub App access only to this repository. Browser installation is pending because the GitHub page opened under `mplsjohnnycage`; the user must switch to `johnnyc-9164` before installation can proceed. No production deployment is authorized.
