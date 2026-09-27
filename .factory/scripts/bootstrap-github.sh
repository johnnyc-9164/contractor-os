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
  "symphony-ready|1D76DB|Controller approved this issue for Symphony dispatch"
  "contract-approved|0E8A16|Controller verified bounded scope, dependencies, Sprite, and file claims"
)

if [ "$APPLY" -eq 0 ]; then
  echo "Would create or update these admission labels:"
  for entry in "${labels[@]}"; do echo "  ${entry%%|*}"; done
  echo "Re-run with --apply to write them."
  exit 0
fi

for entry in "${labels[@]}"; do
  IFS='|' read -r name color description <<< "$entry"
  gh label create "$name" --color "$color" --description "$description" --force
done

echo "Symphony two-label admission is ready."
