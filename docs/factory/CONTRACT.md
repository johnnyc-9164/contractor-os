# Symphony factory contract

This contract separates worker execution from controller authority. Symphony
dispatches one approved issue to one Sprite workspace. The worker implements and
runs deterministic checks. The controller owns GitHub mutations, independent
review, CI interpretation, merge, and deployment.

## Admission and authority

An issue is dispatchable only when it is open and has both:

- `symphony-ready`: the controller admits it to Symphony;
- `contract-approved`: the controller verified bounded acceptance criteria,
  dependencies, assigned Sprite, exclusive file claims, exclusions, and checks.

Workers treat issue labels, comments/workpads, branches, commits, and pull
requests as read-only. Missing or inconsistent admission is a blocker, not
permission to repair GitHub state.

## One-run contract

1. Claim exactly one issue and the assigned Sprite workspace.
2. Read repository instructions, charter, issue, and controller workpad.
3. Start the local ledger before investigation.
4. Before direct source reads, run a task-specific
   `graft ask "...acceptance criteria..." --source`; record query, graph
   status/revision, ranked result, and fallback reason.
5. Reproduce or characterize current behavior.
6. Keep edits inside the accepted criteria and exclusive file claims.
7. Record material commands and milestones without secrets or full external
   payloads.
8. Run the declared fail-closed gate and preserve its exact verdict.
9. Finish as `awaiting-review`, `blocked`, or `failed`.
10. Leave the working tree and run record intact and return a completion packet
    to the controller.

The worker never writes issue comments/labels, commits, pushes, opens or updates
a PR, merges, deploys, force-pushes, or changes secrets.

## Observable execution

The ignored local ledger lives under `.factory/runtime/<run-id>/`:

- `state.json` is current machine-readable workspace truth.
- `events.jsonl` is append-only execution history.
- `node .factory/harness.mjs status --json` is the observer interface.

Finishing writes `docs/factory/runs/<run-id>.json`. The controller commits that
record only after reconciling it with the full candidate and evidence. Run
records are immutable; corrections create a new record.

```bash
node .factory/harness.mjs start --task GH-123 --title "..."
node .factory/harness.mjs event --run <id> --phase planning --message "..."
node .factory/harness.mjs exec --run <id> --phase reproduction -- <command...>
node .factory/harness.mjs gate --run <id> --level full
node .factory/harness.mjs finish --run <id> --status awaiting-review \
  --verification not-run --summary "Ready for controller review"
node .factory/harness.mjs status --json
```

## Evidence and review

Evidence is a command, exit code, exact SHA, rendered artifact, observable state
transition, or remote status. An agent statement is not evidence. Typecheck does
not prove runtime behavior; unit tests do not prove visual fidelity.

The completion packet includes issue/run IDs, base SHA, changed files, diff hash,
reproduction, raw command exits, exact gate verdict, runtime evidence, record
path, blockers, and out-of-scope findings.

Classifier.dev may suggest review effort from coarse metadata only. Never send it
paths, source, diffs, prompts, identifiers, credentials, secrets, customer data,
or proprietary payloads. Its output cannot waive deterministic checks,
independent review, approval, or a failure.

The controller commits the complete candidate, runs fresh independent review and
exact-SHA checks, opens/updates the PR, triages every review thread, and performs
only explicitly authorized merges or deployments.

## Failure and retry

On retry, reconcile the existing ledger and dirty workspace before acting.
Continue from verified progress. After two failures with the same hypothesis,
stop and change the hypothesis. For an external blocker, write the exact unblock
action into the local completion packet and stop without inventing a bypass.

## Non-negotiable boundaries

- All project work executes inside the assigned Sprite.
- Graft orientation is mandatory and fail-closed.
- Never weaken tests, reveal secrets, or change factory constraints to make a
  current issue pass unless that issue explicitly authorizes the policy change.
- Never treat runtime, token count, process health, classifier output, or a
  confident summary as proof of product success.
