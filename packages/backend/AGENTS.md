# packages/backend — Convex backend

Thin facade over the vendored `@johnnyc2026/contractor-os-core` Convex
component (107 live functions: 20 record types × CRUD, 15 workflows,
6 operations). The component is mounted in `convex.config.ts`; `convex/`
holds the local schema, auth config, and facade modules.

## Files

- `convex/schema.ts` — domain schema (owned by the backend crew; registered
  file claim — check the command log before touching)
- `convex/backend.ts` — facade re-exporting the component's API
- `convex/healthCheck.ts` — liveness query polled by `/api/health`
- `convex/auth.config.ts` — Clerk JWT template wiring ("convex" template)
- `convex/cms.ts` — CMS component mount. **Known tenant-isolation hole:**
  any authenticated user can touch any site. Tracked for a backend contract;
  do not paper over it in the frontend.

## Rules

- Never edit `convex/_generated/` — produced by `convex dev` / `convex deploy`.
- Never hand-edit `vendor/*.tgz` — when the npm registry versions exist,
  switch the dependency source and delete `vendor/`.
- Schema changes are additive. The component owns the domain tables; the
  facade owns wiring.
- No deploys from here: Convex production deploys run in CI (`cd.yml`).
  Never run `convex deploy` from a workstation against production.
