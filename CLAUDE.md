# Contractor OS — protocol

> This file is **protocol**: how we work in this repository. Decision priority,
> conflict resolution, gates, collaboration. Project facts live in `AGENTS.md`;
> experience design lives in `DESIGN.md`.

## Layered model

```
this file (protocol) → AGENTS.md (facts) → per-directory AGENTS.md (scoped facts)
  → DESIGN.md (experience decisions) → human docs (background only, never authority)
```

Entry docs are task-scoped, not a pre-read checklist. Verifiable source,
manifests, runtime evidence, and exact command results win factual conflicts;
correct the applicable `AGENTS.md` when facts change.

## Conflict resolution

1. Explicit user instruction in the current turn
2. Root `AGENTS.md` facts
3. This protocol
4. Matching per-directory `AGENTS.md`
5. `DESIGN.md` for experience decisions

## Decision priority

1. Correctness, explicit authorization, and user-owned data
2. Testability and traceable evidence
3. Consistency with repository truth
4. Simplicity, reversibility, and the narrowest supported change

## Decision triage and evidence

Deterministic evidence is authoritative: Git state, exact SHAs, tests, typecheck,
lint, builds, runtime behavior, CI, previews, and explicit approvals.

Classifier.dev may suggest review effort from coarse metadata only: category,
extension, change status, and addition/deletion counts. Never send it repository
paths, source, diff hunks, prompts, identifiers, credentials, secrets, customer
data, or proprietary payloads. Classifier output is advisory and cannot approve
scope, waive a check, satisfy independent review, authorize a merge, or override
a deterministic failure. Service failure or uncertainty falls back to standard
review.

The controller records a decision at every material seam:

| Seam | Required evidence |
| --- | --- |
| Contract and admission | Bounded acceptance, dependencies, Sprite, file claims, both admission labels |
| Orientation | Task-specific `graft ask ... --source`, graph status/revision, ranked result |
| Implementation handoff | Base SHA, complete diff/hash, run ledger, per-criterion evidence |
| Verification | Fresh independent review plus exact deterministic gate results |
| PR readiness | Submitted SHA, all review feedback, CI, required Preview/runtime evidence |
| Merge/deploy | Explicit authority, current head, green gates, reversible rollback |

## Collaboration

- One isolated Sprite workspace per worker. All project reads, edits,
  dependencies, commands, tests, builds, and servers stay inside that Sprite.
- Graft orientation is mandatory before direct source reads. Record the query,
  graph status/revision, and result; fail closed if Graft is unavailable.
- Workers implement and run deterministic checks only. The controller owns
  commits, pushes, pull requests, issue comments/workpads, labels, independent
  review, CI interpretation, merge, and deployment.
- File claims are registered before dispatch. No two active workers own the same
  file or shared interface.
- Amendments to a live contract are explicit and logged; never silently change
  the acceptance criteria a worker was given.
- After two consecutive infrastructure failures with the same hypothesis, stop
  and return the exact blocker.
- Carry authorized scope to a reviewable result. Production, deployment, merge,
  secrets, ownership, security-policy, and destructive actions require explicit
  authority.
- Report commands, exit codes, SHAs, changed paths, and evidence. Correct
  inaccurate claims with a fix or a reproducible test.

## Factory enforcement

- Symphony dispatch requires both `symphony-ready` and `contract-approved`
  and routes work to the configured Sprite SSH host.
- A dispatched worker reads `docs/factory/CHARTER.md`,
  `docs/factory/CONTRACT.md`, and the repository-owned factory skill.
- Start the run ledger before investigation. Execute material commands through
  `.factory/harness.mjs exec`; expose current truth with
  `.factory/harness.mjs status --json`.
- The harness fails closed: green gates are required, but only the controller's
  independent verification can accept a run.
- Workers never mutate GitHub or external deployment state. They leave a complete
  local completion packet and working tree for the controller.

## Communication

- Conclusion first: what changed, what was verified, and what remains.
- Disagree directly when a suggestion conflicts with correctness or scope.
- Do not inflate hypothetical risks or present unsupported confidence as proof.
