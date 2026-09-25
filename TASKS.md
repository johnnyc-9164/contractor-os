# Tasks: Connect contractor-os to Vercel

Issue: [#1](https://github.com/johnnyc-9164/contractor-os/issues/1) · Spec: [SPEC.md](SPEC.md)

## Task 1 — Grant repository-scoped GitHub App access and connect Vercel

- **Changes:** Install the Vercel GitHub App under `johnnyc-9164` with access limited to `contractor-os`; connect that repository to Vercel project `contractoros`; record the connected state in `AUDIT.md`.
- **Does not change:** Other repository access, Vercel secrets, domains, production branch, billing, or application source.
- **Verification:** `gh auth status` and `vercel whoami` each exit 0 for `johnnyc-9164`; `vercel git connect https://github.com/johnnyc-9164/contractor-os.git` exits 0; Project Settings → Git displays the repository.

## Task 2 — Verify a non-production preview

- **Changes:** Push the review branch and capture its Vercel preview URL and Ready status in the PR and `AUDIT.md`.
- **Does not change:** Production deployments or production data.
- **Verification:** The Vercel GitHub check for the PR branch is Ready; `vercel inspect <preview-url>` exits 0; confirm the deployment is Preview, not Production.
