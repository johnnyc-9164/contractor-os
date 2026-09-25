# Ship Cycle Plan

Derived from [AUDIT.md](AUDIT.md). Stage 1 is still pending creation of the requested remote.

## 1. Create GitHub repository and publish the audited baseline

- **Audit finding:** Local audited baseline commit exists as `b2a8b68`; no Git remote is configured. Active GitHub login is `mplsjohnnycage`, whose primary verified email is different from the requested `johnnyc@agentmail.to`.
- **Acceptance criteria:** Authenticate a GitHub account whose verified email is exactly `johnnyc@agentmail.to`; create private `contractor-os` under that account; set `origin`; push the baseline; verify the pushed commit and clean checks. Then convert the remaining plan items into issues under a cycle milestone.
- **Verification:** `gh auth status`; `gh api user/emails`; `git status --short --branch`; `git log --oneline -1`; `git remote -v`; `git ls-remote --heads origin`; `pnpm install --frozen-lockfile`; `pnpm check-types`; `pnpm exec biome check .`; `pnpm test` (accepted absent-script gap); inspect committed paths for secrets.

## 2. Keep missing automated tests as an accepted gap until the first feature

- **Audit finding:** `pnpm test` exits 1 because no test script exists.
- **Acceptance criteria:** Document the gap through the first feature; add a test script and automated coverage with that feature.
- **Verification:** Check root `package.json` and run `pnpm test` after the first feature lands.

## 3. Verify configured integrations safely in preview

- **Audit finding:** Clerk, Convex, Vercel, and PWA are configured but have no live runtime proof from this audit.
- **Acceptance criteria:** With approved non-production credentials, demonstrate auth sign-in, Convex health, a Vercel preview, and PWA offline behavior without using production data.
- **Verification:** Record exact provider/browser smoke procedure and command outputs on the issue; keep production deployment out of scope.

## Stage 2 candidate

Stage 1 item 1 is the next unblocked task, but repo creation is blocked until the active GitHub account can be verified against the requested email. This stage touches account credentials and repository ownership. No spec, tasks, contract, PR, review, or merge has been created.
