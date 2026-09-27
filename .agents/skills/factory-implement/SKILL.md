---
name: factory-implement
description: Execute one Symphony-dispatched Contractor OS issue through reproduction, scoped implementation, recorded commands, fail-closed gates, fresh verification, and a reviewable PR.
---

# Factory implementation

Read `AGENTS.md`, `CLAUDE.md`, `docs/factory/CHARTER.md`, and
`docs/factory/CONTRACT.md`. Work on exactly one issue.

## Start

1. Resolve the GitHub issue queue-state label and its single `## Codex Workpad`.
2. Replace `factory:ready-to-implement` with `factory:in-progress`; reuse
   `factory:in-progress`; treat `factory:rework` as a fresh hypothesis. Do not
   work in `factory:awaiting-review`, `factory:blocked`, `factory:needs-info`, or
   on a closed issue.
3. Start the ledger and retain the returned run ID:

   ```bash
   node .factory/harness.mjs start --task <issue-id> --title "<title>"
   ```

4. Put a hierarchical plan, literal acceptance criteria, expected files, gate
   level, and validation commands in the workpad.
5. Check the charter before any code edit. Stop if the task reaches an
   unauthorized load-bearing boundary.

## Execute

- Reproduce or characterize first and record it with `harness.mjs exec`.
- Prefer a new failing behavioral test. Never weaken an existing test.
- Make the smallest coherent change. No unrelated cleanup or dependency changes.
- Record every meaningful milestone with `harness.mjs event`; run meaningful
  commands with `harness.mjs exec` so exit codes are observable.
- For source-design work use, in order: `extracting-design-system`,
  `retrieving-composing-ui`, `evaluating-design-fidelity`, then
  `binding-convex-ui`. Do not claim visual completion without a rendered compare.
- Keep the GitHub issue workpad current after reproduction, implementation, validation,
  and blocker changes.

## Verify and hand off

1. Run the declared gate through the ledger:

   ```bash
   node .factory/harness.mjs gate --run <run-id> --level full
   ```

2. Give a fresh verifier the issue, acceptance criteria, base SHA, and diff—not
   your summary. Use `factory-verify`.
3. Finish as `succeeded` only with a green gate and verifier `accepted`.
   Otherwise finish as `awaiting-review`, `blocked`, or `failed` truthfully.
4. Commit the generated `docs/factory/runs/<run-id>.json` with the product diff.
5. Push a non-protected branch, open/update the PR using the repository template,
   link it to the issue, replace the queue state with
   `factory:awaiting-review`, and remove `symphony` only after the branch, PR
   body, and workpad all match the evidence.

Never merge or deploy.
