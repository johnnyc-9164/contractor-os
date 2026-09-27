---
name: factory-implement
description: Execute one Symphony-dispatched Contractor OS issue inside its assigned Sprite through Graft orientation, reproduction, scoped implementation, recorded commands, fail-closed gates, and a controller-ready completion packet.
---

# Factory implementation

Read `AGENTS.md`, `CLAUDE.md`, `docs/factory/CHARTER.md`, and
`docs/factory/CONTRACT.md`. Work on exactly one issue in the assigned Sprite.

## Start

1. Verify the open issue has both `symphony-ready` and `contract-approved`.
   Treat labels and the controller workpad as read-only. If admission, file
   claims, or the workpad are inconsistent, record the blocker locally and stop.
2. Start the ledger and retain the run ID:

   ```bash
   node .factory/harness.mjs start --task <issue-id> --title "<title>"
   ```

3. Before direct source reads, run a task-specific
   `graft ask "...acceptance criteria..." --source` through
   `harness.mjs exec`. Record the query, graph status/revision, and result.
   Fail closed if Graft is unavailable or the graph/query fails.
4. Record acceptance criteria, expected files, exclusions, gate level, and
   validation commands in the local ledger.
5. Check the charter before edits. Stop at an unauthorized load-bearing boundary.

## Execute

- Reproduce or characterize first through `harness.mjs exec`.
- Prefer a new failing behavioral test. Never weaken an existing test.
- Make the smallest coherent change; no unrelated cleanup or dependency changes.
- Record material commands and milestones in the local ledger.
- For source-design work use, in order: `extracting-design-system`,
  `retrieving-composing-ui`, `evaluating-design-fidelity`, then
  `binding-convex-ui`. Render and compare before claiming visual completion.
- Report adjacent work in the completion packet instead of widening the diff.

## Verify and hand off

1. Run the declared deterministic gate through the ledger.
2. Use `.factory/scripts/prove-test.sh` when a new regression test should fail
   without the implementation.
3. Finish as `awaiting-review`, `blocked`, or `failed`; workers do not accept
   their own changes.
4. Leave the working tree and generated run record intact.
5. Return one completion packet: issue/run IDs, base SHA, changed files, diff
   hash, reproduction, command exits, exact gate verdict, runtime evidence,
   record path, blockers, and out-of-scope findings.

Never write GitHub comments or labels, commit, push, open/update a PR, merge,
deploy, force-push, change secrets, or rewrite factory policy. The controller owns
all external mutations and independent acceptance.
