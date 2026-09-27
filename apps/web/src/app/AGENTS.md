# apps/web/src/app — routes

- `dashboard/` — auth-gated. Convex authentication supports either an activated
  Clerk–Convex integration configured for the deployment or the legacy Clerk JWT
  template named `convex`. If neither supported mode is configured, dashboard
  queries fail. Renders live leads/jobs from `api.backend.listLeads` /
  `listJobs`.
- `api/health/` — `GET` returns `{ sha, convex, ts }`. `sha` is
  `VERCEL_GIT_COMMIT_SHA` (the commit Vercel actually deployed); `convex`
  is the result of a live `healthCheck` query. `force-dynamic` — never cache
  this. The CD smoke step polls it until observed SHA equals `GITHUB_SHA`.

New pages go under `src/app/<route>/page.tsx`. Server components by default;
`"use client"` only where interactivity requires it.
