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
- `convex/auth.config.ts` — Clerk issuer plus `convex` application/audience
  validation. Convex 1.46.0 supports Clerk's activated Convex integration when
  `sessionClaims.aud` is `convex`, as well as the legacy "convex" JWT template;
  the checked-in config alone does not prove which integration or deployment
  instance is active at runtime.
- `convex/cms.ts` — authenticated CMS facade. `requireTenant` requires an
  enabled membership for the caller's token identity; `requireSiteTenant`
  rejects missing mappings and mappings owned by another tenant before
  reads/updates. `convex/cms.isolation.test.ts` covers same-tenant create/read/
  list/update, cross-tenant read/write rejection and list filtering, an
  idempotent cross-tenant create replay, and unauthenticated calls. These are
  `convex-test` unit tests with mocked identities, not production runtime
  security proof. Two limitations remain: `createSite` calls component
  creation before validating an existing ownership mapping (GH-59), and
  `listSites` filters the component-wide page after pagination (GH-64).

## Rules

- Never edit `convex/_generated/` — produced by `convex dev` / `convex deploy`.
- Never hand-edit `vendor/*.tgz` — when the npm registry versions exist,
  switch the dependency source and delete `vendor/`.
- Schema changes are additive. The component owns the domain tables; the
  facade owns wiring.
- No deploys from here: Convex production deploys run in CI (`cd.yml`).
  Never run `convex deploy` from a workstation against production.
- Backend work follows the root Sprite workflow: all project operations stay
  in the assigned isolated Sprite/workspace and exclusive file claim. Workers
  provide exact-SHA verification evidence and uncommitted changes for
  independent review; controller-owned commit/PR/CI and explicit approval are
  required before merge or deploy.
