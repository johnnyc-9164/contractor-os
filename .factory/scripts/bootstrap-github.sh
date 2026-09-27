#!/usr/bin/env bash
set -euo pipefail

APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

command -v gh >/dev/null 2>&1 || {
  echo "error: gh is required" >&2
  exit 2
}
gh auth status >/dev/null 2>&1 || {
  echo "error: gh is not authenticated" >&2
  exit 2
}

labels=(
  "symphony|5319E7|Eligible for Symphony dispatch while present"
  "factory:ready-to-implement|0E8A16|Acceptance criteria are ready for implementation"
  "factory:in-progress|1D76DB|Owned by an active Symphony workspace"
  "factory:rework|D93F0B|Review requires a changed implementation hypothesis"
  "factory:awaiting-review|FBCA04|PR is ready for human review; Symphony stopped"
  "factory:needs-info|C5DEF5|Blocked on a named product decision or fact"
  "factory:blocked|B60205|Blocked on a named external capability"
  "factory:verified|0E8A16|Independent verification accepted"
  "factory:rejected|B60205|Independent verification found a blocker"
)

if [ "$APPLY" -eq 0 ]; then
  echo "Would create or update these labels:"
  for entry in "${labels[@]}"; do echo "  ${entry%%|*}"; done
  echo "Re-run with --apply to write them."
  exit 0
fi

for entry in "${labels[@]}"; do
  IFS='|' read -r name color description <<< "$entry"
  gh label create "$name" --color "$color" --description "$description" --force
done

echo "Symphony factory labels are ready."

