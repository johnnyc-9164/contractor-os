# apps/web/src/app — routes

- `dashboard/` — auth-gated. Clerk signs the user in; without the "convex"
  JWT template on the Clerk instance, every Convex query here fails.
  Renders live leads/jobs lists from `api.backend.listLeads` / `listJobs`.
- `api/health/` — `GET` returns `{ sha, convex, ts }`. `sha` is
  `VERCEL_GIT_COMMIT_SHA` (the commit Vercel actually deployed); `convex`
  is the result of a live `healthCheck` query. `force-dynamic` — never
  cache this. The CD smoke step polls it until observed SHA equals
  `GITHUB_SHA`.

New pages go under `src/app/<route>/page.tsx`. Server components by default;
`"use client"` only where interactivity requires it.
