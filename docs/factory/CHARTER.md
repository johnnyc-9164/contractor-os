# Contractor OS factory charter

This is the human-owned autonomy and risk policy for Contractor OS. Agents may
read it; they may not change it unless Johnny explicitly asks for a charter
change in the current session.

```text
CHARTER_STATUS: ready
TIER: greenfield
LAST_REVIEWED: 2026-09-27
NEXT_REVIEW: 2026-10-27
```

The product has deployed infrastructure, but no confirmed customer dependency is
recorded here. Treat the codebase as greenfield while treating auth, tenant
isolation, money, data shape, and deployment as production-grade boundaries.

## Load-bearing paths

Any change touching these paths requires deep gates, a draft PR, independent
verification, and a human read. It is never an unattended merge candidate.

```text
LOAD_BEARING:
  - "apps/web/src/proxy.ts"
  - "apps/web/src/app/api/**"
  - "packages/backend/convex/auth.config.ts"
  - "packages/backend/convex/schema.ts"
  - "packages/backend/convex/cms.ts"
  - "packages/backend/convex/privateData.ts"
  - "**/*payment*"
  - "**/*billing*"
  - ".github/workflows/**"
  - "vercel.json"
  - "pnpm-lock.yaml"
  - "package.json"
  - "**/package.json"
  - ".factory/**"
  - ".claude/**"
  - ".agents/**"
  - ".codex/**"
  - "WORKFLOW.md"
  - "AGENTS.md"
  - "CLAUDE.md"
```

## Test-file rule

```text
TESTS_ARE_LOAD_BEARING: true
```

An unattended run may add a new test. It may not weaken, delete, skip, or edit an
existing test without explicit human approval recorded in the work item and PR.

## Automatable work

An issue may run unattended only when it has explicit, checkable acceptance
criteria and fits one category below.

```text
AUTOMATABLE:
  - A bounded UI screen or interaction backed by an approved source design
  - A reproducible bug fix with a failing test or deterministic reproduction
  - Wiring an existing UI contract to an existing Convex public function
  - Adding loading, empty, failure, responsive, or accessibility states
  - Documentation, copy, type, lint, and test-coverage corrections
  - Registry component composition using the committed UI skill chain

NEEDS_SPEC:
  - New product behavior without explicit acceptance criteria
  - Auth, authorization, tenant isolation, payments, billing, or deployment
  - Schema changes, data migrations, new dependencies, or public API changes
  - Work expected to touch more than 8 files or add more than 800 lines
  - Conflicting source designs or an unverified product assumption

NEVER_AUTOMATE:
  - Merge, production deploy, secret changes, or destructive data operations
  - Rewriting factory constraints to make a failing run pass
  - Replacing the existing app, backend, auth system, or design direction
  - Mixing Sky's company data or any other portfolio company into Contractor OS
  - Anything not covered above; silence means stop
```

## Definition of done

```text
DONE:
  - The issue's acceptance criteria are literally satisfied
  - A focused reproduction or behavioral test proves the changed behavior
  - The required factory gate ends with status=GREEN
  - Existing tests were not changed without recorded human approval
  - The diff stays within the declared task and expected files
  - User-facing changes have rendered/runtime evidence at required states
  - A fresh verifier accepts the diff, or the PR remains draft and is marked
    awaiting-review with verification unavailable
  - The workpad and immutable run record contain commands, exit codes, evidence,
    changed files, commit SHA, and blockers
```

Gate levels:

```text
GATES:
  default: full
  docs_only: fast
  load_bearing: deep
```

## Stop conditions

```text
STOP_IF:
  - The same required gate is red twice without a new falsifiable hypothesis
  - Required tooling, auth, permissions, or secrets are unavailable
  - Work reaches a load-bearing path not explicitly authorized by the issue
  - The diff crosses 8 files or 800 added lines without an approved amendment
  - Acceptance criteria remain ambiguous after one clarification attempt
  - Five items are already awaiting human review
  - The proposed work would collide with an active branch or claimed file set
```

