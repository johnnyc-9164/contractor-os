# Contractor OS factory

Symphony is the orchestrator. This directory is the repo-native harness that
makes a Symphony run reviewable and testable.

## Operator commands

```bash
./.factory/scripts/doctor.sh
./.factory/scripts/bootstrap-github.sh
node .factory/harness.mjs status
node .factory/harness.mjs status --json
./.claude/scripts/gates.sh fast
./.claude/scripts/gates.sh full
```

`status --json` answers what each workspace has actually recorded: current phase,
last action, gate results, branch/SHA, terminal status, and durable evidence. It is
safe to consume from a local dashboard, a Sprite command, or another agent.

Preview the dispatch/queue labels with `bootstrap-github.sh`; apply them with
`--apply` only against the intended repository. An issue is dispatchable when it
has both `symphony` and `factory:ready-to-implement` (or `factory:rework`).

## Ownership

| Concern | Source of truth |
|---|---|
| Dispatch, retry, isolated workspace | Symphony |
| Task status and active workpad | GitHub Issue labels/comment |
| Repository policy and stop conditions | `CHARTER.md` |
| Per-run current state | `.factory/runtime/<run-id>/state.json` |
| Immutable run history | `docs/factory/runs/*.json` |
| Code review and CI | GitHub pull request |
| Merge and deployment decision | Human |

The PaintPro source archive is product input, not factory infrastructure. Import
it in a separate scoped change using the installed design/UI skill chain.
