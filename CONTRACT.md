# Task Contract: Connect contractor-os to Vercel

Issue: [#1](https://github.com/johnnyc-9164/contractor-os/issues/1) · Spec: [SPEC.md](SPEC.md) · Tasks: [TASKS.md](TASKS.md)

## Inputs and allowed scope

- Existing private GitHub repository: `johnnyc-9164/contractor-os`.
- Existing Vercel project: `contractoros`, already linked to this local checkout.
- Documentation deliverables: `AUDIT.md`, `PLAN.md`, `SPEC.md`, `TASKS.md`, and this `CONTRACT.md`.
- External configuration limited to Vercel GitHub App access for `contractor-os` and the Git connection for `contractoros`.

## Deliverables

1. Vercel GitHub App installation is restricted to `contractor-os`.
2. Vercel project `contractoros` is connected to `johnnyc-9164/contractor-os`.
3. A non-production branch produces a Ready preview deployment, with the URL and evidence recorded in the PR and `AUDIT.md`.
4. The PR links this contract and pastes verification commands with their exit codes.

## Acceptance criteria

- **AC1:** `gh auth status` exits 0 and reports active account `johnnyc-9164`.
- **AC2:** GitHub App installation settings show only `contractor-os` selected for Vercel access.
- **AC3:** Vercel Project Settings → Git shows `johnnyc-9164/contractor-os` connected to `contractoros`.
- **AC4:** The PR branch deployment is a Preview with Ready status and a reachable URL; no Production deployment is created.
- **AC5:** `pnpm check-types`, `pnpm exec biome check .`, and `git diff --check` each exit 0. `pnpm test` is not a pass criterion because the baseline intentionally has no test script; retain it as an accepted gap until the first feature.
- **AC6:** The diff touches only the documentation files listed above. No environment values, tokens, or other credentials appear in the diff or PR body.

## Exact verification commands

| Command | Expected exit | Expected evidence |
|---|---:|---|
| `gh auth status` | 0 | Active GitHub login is `johnnyc-9164`; do not print token values. |
| `git status --short --branch` | 0 | Clean after commit; branch tracks the PR branch. |
| `git diff --check` | 0 | No whitespace errors. |
| `pnpm check-types` | 0 | All configured TypeScript tasks succeed. |
| `pnpm exec biome check .` | 0 | All checked files pass. |
| `vercel whoami` | 0 | Vercel account is `johnnyc-9164`. |
| `vercel project ls` | 0 | Existing project `contractoros` is listed. |
| `vercel git connect https://github.com/johnnyc-9164/contractor-os.git` | 0 | Git repository connection succeeds after app access is granted. |
| `vercel inspect <preview-url>` | 0 | Preview deployment is Ready; URL is the deployment under review. |
| `pnpm test` | 1 accepted | No test script exists at baseline; this is documented in AUDIT.md and is not a pass criterion for this integration task. |

## Explicitly out of scope

- Production deployment, production data, environment variables, secrets, domain or billing changes.
- Access to any repository besides `contractor-os` for the Vercel GitHub App.
- Source-code behavior changes or adding a test framework as part of this integration task.
- Merging unless every Stage 7 criterion is satisfied, including an independently verified Ready preview and green required checks.

## Pre-merge gate checkpoint

Before merge, independently verify AC1–AC6 against the exact PR head; confirm the Vercel Preview check and all required checks are green; confirm the diff contains only allowed files; confirm Vercel GitHub App access is limited to this repository; and confirm no production deployment was triggered. Any failed criterion returns the work to the earliest failed stage. Do not merge on missing evidence.
