# Symphony factory contract

This contract sits between Symphony and every Codex worker. Symphony owns
dispatch, retries, and workspace isolation. GitHub Issues own work state; GitHub
pull requests own review, CI, and the merge boundary. The repository owns the
implementation policy, deterministic gates, and proof.

## Authority and state

Read `docs/factory/CHARTER.md` before acting. The live task is the GitHub issue
supplied by Symphony plus its single `## Codex Workpad` comment. The GitHub PR is
the review handoff. Markdown snapshots are informative, never coordination locks.

Queue-state labels:

```text
ready-to-implement -> in-progress -> awaiting-review -> closed
                                  \-> rework -> in-progress
                                  \-> blocked | needs-info
```

The persistent `symphony` label authorizes dispatch and coexists with exactly one
queue-state label. Remove `symphony` at `awaiting-review`, `blocked`, or
`needs-info`; this is the hard stop where a person owns the next decision.

## One-run contract

1. Claim exactly one issue and one workspace. Do not batch a second issue.
2. Read repository instructions and the charter before planning.
3. Start the local ledger with `.factory/harness.mjs start` before investigation.
4. Maintain one GitHub issue workpad containing plan, acceptance criteria, validation,
   decisions, current evidence, and blockers.
5. Reproduce or characterize current behavior before editing.
6. Keep the change inside the issue's acceptance criteria and expected files.
7. Record meaningful phases and commands in the local ledger. Do not log secrets,
   full environment dumps, or full external payloads.
8. Run the required gate through `.factory/harness.mjs gate`; never paraphrase or
   override its `FACTORY_GATES:` verdict.
9. Obtain a fresh verification context. If unavailable, use
   `awaiting-review`, keep the PR draft, and say verification is unavailable.
10. Finish the ledger, commit its unique file under `docs/factory/runs/`, push the
    branch, open/update a PR, link it to the issue, move it to
    `factory:awaiting-review`, and remove `symphony`.

## Observable execution

The local ledger lives under ignored `.factory/runtime/<run-id>/`:

- `state.json` is current machine-readable truth for the active workspace.
- `events.jsonl` is append-only execution history.
- `node .factory/harness.mjs status --json` is the programmatic observer.

The terminal record is copied to `docs/factory/runs/<run-id>.json` and committed.
Run records are immutable. A correction creates a new run record that references
the earlier run; it never rewrites history.

Use these commands:

```bash
node .factory/harness.mjs start --task COS-123 --title "..."
node .factory/harness.mjs event --run <id> --phase planning --message "..."
node .factory/harness.mjs exec --run <id> --phase reproduction -- <command...>
node .factory/harness.mjs gate --run <id> --level full
node .factory/harness.mjs finish --run <id> --status awaiting-review \
  --verification not-run --summary "..."
node .factory/harness.mjs status --json
```

## Evidence and completion

Evidence is a command, exit code, rendered artifact, observable state transition,
or exact remote status. An agent statement is not evidence. Passing a typecheck
does not establish runtime behavior; passing unit tests does not establish visual
fidelity; a successful redirect does not establish payment.

The writer does not grade the work. Use a fresh Codex review/subagent when the
environment supports it. A successful run with no independent verifier must be
recorded as `awaiting-review`, not `succeeded`.

## Failure and retry

On retry, read the workpad and local run status first. Continue from verified
state; do not restart analysis. After two failures with the same hypothesis, stop
patching and change the hypothesis. On an external blocker, record the exact
missing capability, mark the issue `factory:blocked`, remove `symphony`, and stop
without inventing a bypass.

## Non-negotiable boundaries

- Never merge, deploy production, force-push, weaken tests, or reveal secrets.
- Never edit the charter, gates, workflow, hooks, or skills to pass the current
  issue unless the issue explicitly authorizes that factory change.
- Never treat token count, runtime, a green agent process, or a confident summary
  as proof that product work succeeded.
