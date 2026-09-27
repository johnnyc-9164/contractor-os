# Contractor OS factory

Symphony dispatches approved issues to isolated Sprite workspaces. This
repository-owned harness makes worker execution observable and fail-closed while
preserving controller ownership of GitHub and deployment state.

## Operator commands

```bash
./.factory/scripts/doctor.sh
./.factory/scripts/bootstrap-github.sh
./.factory/scripts/bootstrap-github.sh --handoff <issue-number-or-url>
node .factory/harness.mjs status
node .factory/harness.mjs status --json
node .factory/harness.mjs finalize --run <run-id> --candidate-sha "$(git rev-parse HEAD)"
./.claude/scripts/gates.sh fast
./.claude/scripts/gates.sh full
```

`status --json` reports recorded phase, last action, gates, base/branch state,
terminal status, and run evidence. It can be consumed from the Sprite controller
or a dashboard.

Preview admission labels with `bootstrap-github.sh`; use `--apply` only for the
intended repository. An issue is dispatchable only when open with both
`symphony-ready` and `contract-approved`. Workers never add or remove them. On
every terminal worker handoff, the controller runs `--handoff` first; it removes
`symphony-ready` idempotently and verifies redispatch is disabled.

Workers seal only the ignored runtime ledger. The controller commits the source
candidate, runs `finalize` against that exact clean commit, then commits the
immutable run record separately before exact-head review and CI.

## Ownership

| Concern | Owner/source of truth |
| --- | --- |
| Admission, dependencies, Sprite, file claims | Controller + GitHub issue/workpad |
| Dispatch, retry, isolated execution | Symphony + configured Sprite SSH host |
| Repository policy and stop conditions | `CHARTER.md` |
| Source orientation | Graft query/status/revision |
| Per-run current state | `.factory/runtime/<run-id>/state.json` |
| Candidate-SHA finalization and immutable run evidence | Controller + `docs/factory/runs/*.json` |
| Commit, push, PR, review, CI interpretation | Controller |
| Merge and deployment | Controller with explicit authority |

Classifier.dev is optional metadata-only cost triage. Deterministic checks and
independent review remain authoritative.

The PaintPro source archive is product input, not factory infrastructure. Import
it in a separate scoped change using the committed design/UI skill chain.
