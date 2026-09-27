# DS1 shadcn registry pilot

Date: 2026-09-27
Bead: `cos-ds1`
Sprite: `factory-shadcn-pilot`
Branch: `codex/cos-ds1-shadcn-pilot`
Base: `ccbe7ec176ae4cd4287a773a4fdd4c90ed2180c4`

## Scope and outcome

This pilot adds a small registry-driven shared UI primitive and applies it to the lead pipeline card. It also adds cost-aware review triage using classifier.dev's anonymous free endpoint. The classifier can suggest review effort only. It cannot declare a change safe, satisfy an independent review, waive repository checks, or authorize a merge.

The avatar adds initials from the lead title, with identifier and question-mark fallbacks. The classifier receives only coarse metadata generated locally: category, extension, status, and addition/deletion counts. It never receives paths, source, diff hunks, prompts, secrets, or repository identifiers. Protected paths are handled locally and assigned deep review. Documentation and static assets are assigned light review locally. Classifier uncertainty, request failures, malformed responses, and timeouts fall back to standard review. All outputs keep independent review and mandatory checks set to true.

## Registry execution evidence

- Pinned repo CLI: shadcn 4.21.0, invoked with `corepack pnpm exec shadcn` from `packages/ui`.
- Existing workspace alias resolved to `@contractor-os/ui/components`; utility alias resolved to `@contractor-os/ui/lib/utils`.
- `shadcn add avatar --dry-run --diff` proposed one shared file, `src/components/avatar.tsx`, and no package or lockfile edits.
- Reviewed the registry output, then ran `shadcn add avatar`. Normalized its utility import to the repository's existing `@contractor-os/ui/lib/utils` alias. No dependency or lockfile was added.
- The shared component uses the repository's existing Base UI Avatar primitive and design tokens.
- `LeadCard` renders the fallback avatar; a pure helper and tests cover multiword, single-word, identifier, and empty values.

## Cost-aware triage

The integration targets `https://classifier.dev/v1/classify`, tier `fast`, in batches of at most 1,000 inputs. It makes unauthenticated requests and has a 5-second timeout. It does not retry. Only scores with confidence at least 0.85 affect the suggested effort; lower confidence uses standard fallback.

A live, generic smoke request to the public endpoint returned HTTP 200, classifier version 1.13.0, and `billing_status: not_billed`. Its confidence was 0.55, so this implementation correctly fell back to standard effort. A health request also returned HTTP 200. The live smoke used generic metadata only.

References (checked 2026-09-27):

- [Classifier developers](https://classifier.dev/developers) — request format and input limits.
- [Classifier pricing](https://classifier.dev/pricing) — free anonymous tier and rate limits.
- [Classifier privacy](https://classifier.dev/privacy) — public endpoint data handling.
- [shadcn CLI](https://ui.shadcn.com/docs/cli) — CLI usage.

The endpoint is external and best-effort; service terms, free limits, and availability may change. Local deterministic rules and mandatory checks remain authoritative.

## Verification

- Red-stage proof on the unmodified base: 7 failed / 2 passed across the new tests, with failures at the intended missing-initials and missing-triage assertions.
- Focused tests after implementation: 16/16 passed.
- Full repository Vitest run: 171/171 passed, 19/19 files.
- `@contractor-os/ui` typecheck: passed.
- Biome checks for every modified TypeScript/config file: passed.
- `git diff --check`: passed.
- Web typecheck: passed after `varlock codegen` generated the ignored `apps/web/env` module.
- Production build: blocked before Next compilation because the fresh Sprite has no production configuration values for `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`; no credentials were copied or fabricated. Authenticated visual acceptance, exact-SHA Preview, independent review, and CI remain required gates before merge. No credentials were added to the Sprite.

## Files

- `packages/ui/src/components/avatar.tsx`
- `apps/web/src/components/pipeline/lead-card.tsx`
- `apps/web/src/lib/lead-initials.ts` and its tests
- `tooling/sprite-factory/jev-review-triage.ts` and its tests
- `vitest.config.ts`

The new Vitest glob includes the factory triage tests in normal repository runs.
