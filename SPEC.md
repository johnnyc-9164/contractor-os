# Spec: Connect contractor-os to Vercel

Issue: [#1 — Connect contractor-os to the Vercel project](https://github.com/johnnyc-9164/contractor-os/issues/1)

## Problem

The private GitHub repository `johnnyc-9164/contractor-os` exists and the local checkout is linked to the Vercel project `contractoros`, but Vercel Project Settings → Git says the project has no Git repository. The CLI connection attempt failed because Vercel's GitHub App does not have access to the private repository.

## Scope

- Install or update the Vercel GitHub App under GitHub account `johnnyc-9164`, limiting repository access to `contractor-os`.
- Connect `johnnyc-9164/contractor-os` to the existing Vercel project `contractoros`.
- Verify the connection and a successful preview deployment from a non-production branch.
- Record the final connection and preview evidence in `AUDIT.md` and close issue #1 after review/merge.

## Non-goals

- No production deployment or production data use.
- No changes to Vercel environment variables, domains, project ownership, production branch, or billing plan.
- No source-code or application behavior changes.
- No access to other repositories for the Vercel GitHub App.

## Acceptance criteria

1. The Vercel GitHub App installation for `johnnyc-9164` grants repository access only to `contractor-os`.
2. Vercel Project Settings → Git identifies `johnnyc-9164/contractor-os` as the connected repository for `contractoros`.
3. A commit on a non-production branch creates a preview deployment with Ready status and a reachable preview URL.
4. No production deployment is triggered.
5. The PR contains the exact verification commands and outputs, and `AUDIT.md` records the resulting state without secrets.

## Verification

- `gh auth status` (expected exit 0; active account `johnnyc-9164`).
- `vercel whoami` (expected exit 0; account `johnnyc-9164`).
- `vercel project ls` (expected exit 0; includes `contractoros`).
- `vercel git connect https://github.com/johnnyc-9164/contractor-os.git` (expected exit 0 after the GitHub App is installed).
- Confirm the repository under the Vercel Git settings page.
- Push a non-production PR branch; verify its Vercel deployment check is Ready and `vercel inspect <preview-url>` exits 0.
- `pnpm check-types` and `pnpm exec biome check .` (expected exit 0); `pnpm test` remains an accepted missing-script gap until the first feature.

## Rollback

Disconnect the repository from the Vercel project's Git settings or run `vercel git disconnect` from the linked project. This stops Git-triggered deployments without deleting the GitHub repository or Vercel project. If the GitHub App installation was created only for this task, remove its access to `contractor-os` in GitHub settings after disconnecting.

## Human gate

Cleared: the user requested the Vercel connection and explicitly authorized Vercel App access limited to `contractor-os`. The account-specific GitHub sign-in remains a user handoff because the browser opened under a different account.
