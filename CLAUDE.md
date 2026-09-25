# Contractor OS — protocol

> This file is **protocol**: how we work in this repository. Decision priority,
> conflict resolution, gates, collaboration. Project facts live in `AGENTS.md`;
> experience design lives in `DESIGN.md`.

## Layered model

```
this file (protocol) → AGENTS.md (facts) → per-directory AGENTS.md (scoped facts)
  → DESIGN.md (experience decisions) → human docs (background only, never authority)
```

Entry docs are task-scoped, not a pre-read checklist. Read what the task
needs. Verifiable source/manifests/runtime evidence wins factual conflicts —
and `AGENTS.md` must then be corrected.

## Conflict resolution

1. Explicit user instruction in the current turn
2. Root `AGENTS.md` (facts)
3. This file (protocol)
4. Matching per-directory `AGENTS.md`
5. `DESIGN.md` for design/experience decisions

## Decision priority

1. Correctness, explicit authorization, and user-owned data
2. Testability and verifiability (evidence: commands, exit codes, SHAs)
3. Consistency with repository truth
4. Simplicity and reversibility — narrowest change the evidence supports

## Jev — the decision fabric (used 10×, not 3×)

Jev (TypeSafe judgment layer) is for bounded judgment; exact facts come from
deterministic tools (git, gh, test exit codes). Supervisor-side gates are
mandatory. Worker-side Jev is best-effort (Codex sandbox credential-socket
EPERM) — never let it hard-block a worker.

Call a gate at **every** seam, not just the big three:

| # | Seam | Tool | When |
| --- | --- | --- | --- |
| 1 | Contract authoring | `jev_gate` scope-risk | Before dispatch: is this scope bounded and verifiable? |
| 2 | Dispatch readiness | `jev_gate` | Before assigning: worker, worktree, claims, capacity |
| 3 | File-claim registration | `jev_gate` collision | Before two crews touch adjacent files |
| 4 | Amendment approval | `jev_gate` | Before changing a live contract (A1/A2 style) |
| 5 | Worker completion | `jev_evaluate` per criterion | Completion report vs each acceptance criterion |
| 6 | Verification interpretation | `jev_evaluate` | Do these results actually satisfy the contract? |
| 7 | Rebase / force-push | `jev_gate` | Before rewriting a pushed branch |
| 8 | Merge | `jev_gate` | Before every merge, on the final rebased state |
| 9 | CI-failure triage | `jev_choose` | Retry vs fix-forward vs escalate |
| 10 | Worker pivot | `jev_gate` | Codex → subagent after 2 consecutive infra failures |
| 11 | Doc/harness change | `jev_evaluate` | Does this follow the repo's doc convention? |
| 12 | Operator collision | `jev_gate` | Before two operators' plans intersect |

## Collaboration

- **One worktree per worker.** Codex workers implement + verify only; the
  owning operator commits, pushes, and opens PRs from an unsandboxed shell.
- **File claims** are registered in the command log before dispatch. No two
  active branches modify the same file.
- **Merge protocol:** announce in the command log before merging; rebase onto
  current master; rerun the contract's verification from an unsandboxed
  shell; require full CI + Vercel preview green; then merge.
- **Amendments** to a live contract are explicit, dated, and logged — never
  silent edits to what a worker was told.
- **Pivot, don't burn:** after 2 consecutive Codex infra failures (not prompt
  failures), a subagent implements the same contract in the same worktree.
- Carry authorized scope to a reviewable result. Reversible/local/read-only
  work proceeds without re-asking; irreversible, production, deploy, merge,
  publish, or externally visible actions ask first.
- Report with evidence: commands, exit codes, commit SHAs, check names.
  Correct inaccurate claims (anyone's, including your own) with a fix or test.

## Communication

- Conclusion first. Say what was done, verified, and what remains.
- Disagree directly when a suggestion conflicts with correctness or scope.
- No disclaimers for hypothetical risks outside the task scope.
