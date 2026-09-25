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

Both were staged at `~/workspace/npm-publish-prep/` on 2026-09-24.

These are byte-identical to the tarballs the dev PC installed from
`E:/Downloads/`. Proof a future reader can re-derive: the lockfile's
`resolution.integrity` sha512 hashes for both packages are unchanged across
the specifier rewrite (`file:E:/Downloads/...` → `file:vendor/...`).
pnpm hashes `file:` tarball bytes on re-resolution under a new snapshot key,
so identical hashes mean identical bytes. Compare the two `resolution:`
lines in `pnpm-lock.yaml` against the pre-fix lockfile.

## Updating (if a new version ships before npm clears)

1. Rebuild the tarball from the factory source (`npm pack` in the staged
   package dir).
2. Replace the file in `vendor/` (keep the versioned filename).
3. Run `pnpm install` — the lockfile re-hashes automatically.
4. Commit the new tarball + lockfile.

## Migration

When the npm account clears and both packages publish under `@johnnyc2026`:
1. Change the two `file:` specifiers in `apps/web/package.json` (and any
   other workspace package) to the registry versions.
2. Delete this directory.
3. Remove the `!vendor/*.tgz` exception from `.gitignore`.
4. Run `pnpm install` to regenerate the lockfile.

Reversible with one caveat: the ~172KB tarball blobs remain in git history
permanently even after the working tree is cleaned up.
