# Vendored tarballs — TEMPORARY

`@johnnyc2026/cms` and `@johnnyc2026/contractor-os-core` are not on the npm
registry (publishing is blocked by an npm-account policy review). Until the
registry versions exist, the workspace consumes these tarballs via relative
`file:` paths so `pnpm install` works on every machine — not just the dev PC
(the lockfile previously pointed at absolute `E:/Downloads/...` Windows
paths, which broke installs everywhere else, including CI).

## Provenance

- `johnnyc2026-cms-0.2.0.tgz` — built from the CMS factory package
  (`@johnnyc2026/cms` 0.2.0), tsc clean.
- `johnnyc2026-contractor-os-core-0.5.1.tgz` — built from the Contractor OS
  core factory package (`@johnnyc2026/contractor-os-core` 0.5.1), tsc clean.

Both were staged at `~/workspace/npm-publish-prep/` on 2026-09-24 and are
byte-identical to the versions the dev PC installed from `E:/Downloads/`.

## Migration

When the npm account clears and both packages publish under `@johnnyc2026`:
1. Change the two `file:` specifiers in `apps/web/package.json` (and any
   other workspace package) to the registry versions.
2. Delete this directory.
3. Run `pnpm install` to regenerate the lockfile.
