# Immutable run records

Each terminal run writes one JSON file here. The filename is the unique `run_id`.
The record contains schema version, task, timestamps, branch/SHA, current status,
gate verdicts, verification state, changed files, and the ordered event ledger.

Do not edit or append to an existing record. If a correction is needed, create a
new run and reference the prior `run_id` in its summary.

Allowed terminal statuses:

- `succeeded`: green gate plus independent verification accepted.
- `awaiting-review`: implementation evidence exists but independent acceptance is
  unavailable or a human read is required.
- `blocked`: a named external dependency prevents completion.
- `failed`: implementation or verification disproved the result.

