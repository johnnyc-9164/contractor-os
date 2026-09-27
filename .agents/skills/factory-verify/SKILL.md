---
name: factory-verify
description: Independently verify one Contractor OS change against its GitHub issue acceptance criteria, negative-test proof, fail-closed gates, scope, runtime evidence, and protected boundaries.
---

# Factory verification

Approach the diff cold. Read the issue, workpad, charter, base SHA, and changed
files; do not use the implementer's narrative as your expected conclusion.

1. Confirm the diff belongs to one issue and stays inside declared scope.
2. Re-run the required gate and capture its exact `FACTORY_GATES:` line.
3. Use `.factory/scripts/prove-test.sh` when a new regression test should fail
   without the implementation.
4. Check for modified existing tests, load-bearing paths, hidden dependency or
   schema changes, fake success states, missing failure handling, and secrets.
5. For user-facing changes, inspect rendered evidence at the target state and
   viewport. A typecheck cannot establish visual fidelity.
6. Return exactly one verdict: `accepted`, `accepted-with-reservations`, or
   `rejected`, with requirement-by-requirement evidence.

When uncertain, do not accept. Never merge, deploy, or rewrite factory policy.
