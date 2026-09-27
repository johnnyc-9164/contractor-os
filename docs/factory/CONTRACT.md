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
10. Leave the working tree and ignored runtime ledger intact and return a
    completion packet to the controller. Workers do not create the durable run
    record.

The worker never writes issue comments/labels, commits, pushes, opens or updates
a PR, merges, deploys, force-pushes, or changes secrets.

## Observable execution

The ignored local ledger lives under `.factory/runtime/<run-id>/`:

- `state.json` is current machine-readable workspace truth.
- `events.jsonl` is append-only execution history.
- `node .factory/harness.mjs status --json` is the observer interface.

Finishing seals the runtime state but does not write
`docs/factory/runs/<run-id>.json`. After committing the source candidate, the
controller finalizes the record against that exact clean `HEAD`, commits the
record separately, and reruns review/checks on the final PR head. Run records are
immutable; corrections create a new record. An `awaiting-review` or `succeeded`
run can be finalized only when its latest recorded gate is `GREEN`; blocked and
failed runs remain recordable without manufacturing a green result.

```bash
node .factory/harness.mjs start --task GH-123 --title "..."
node .factory/harness.mjs event --run <id> --phase planning --message "..."
node .factory/harness.mjs exec --run <id> --phase reproduction -- <command...>
node .factory/harness.mjs gate --run <id> --level full
node .factory/harness.mjs finish --run <id> --status awaiting-review \
  --verification not-run --summary "Ready for controller review"
node .factory/harness.mjs finalize --run <id> \
  --candidate-sha "$(git rev-parse HEAD)" # controller only, clean candidate
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

On receipt of every terminal packet, the controller uses a separate clean
controller-owned checkout pinned to the approved trusted factory SHA and a token
limited to issue-label access. It runs that checkout's
`.factory/scripts/bootstrap-github.sh --handoff <issue>` to remove
`symphony-ready` and verify redispatch is disabled. It never executes the
worker-workspace copy before review. The controller then creates a non-protected
feature branch and commits the complete candidate. It runs the trusted checkout's
harness with `FACTORY_ROOT` pointed at the clean worker workspace, finalizes and
separately commits the immutable record, runs fresh independent review and
exact-SHA checks, opens/updates the PR, triages every review thread, and performs
only explicitly authorized merges or deploys. Finalization rejects `main`,
`master`, detached `HEAD`, dirty workspaces, and mismatched candidate SHAs.
Every Git read used by the trusted harness overrides repository-local hooks and
file-system monitors, ignores global/system configuration, and disables external
diff and text-conversion commands so worker-controlled Git metadata cannot run in
the controller context.

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
