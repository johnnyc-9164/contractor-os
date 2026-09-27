---
name: factory-status
description: Report what active Contractor OS agent runs have actually accomplished from the local JSON ledger, Git state, GitHub issue workpad, PR, and CI evidence without changing anything.
---

# Factory status

Read `docs/factory/CONTRACT.md`. This is report-only.

1. Run `node .factory/harness.mjs status --json` in every relevant workspace.
2. For active runs, read the last ledger event and current gate history.
3. Compare local branch/SHA and changed files with the linked GitHub PR.
4. Read the single GitHub issue `## Codex Workpad` and current queue-state label.
5. Report verified progress, last action/time, gate result, PR/CI state, and named
   blocker. Separate observed evidence from agent claims.

Token count and runtime are cost signals, not progress.
