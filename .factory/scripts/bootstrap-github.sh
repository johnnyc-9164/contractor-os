#!/usr/bin/env bash
set -euo pipefail

ACTION="preview"
ISSUE=""
case "${1:-}" in
  "") ;;
  --apply) ACTION="apply" ;;
  --handoff)
    ACTION="handoff"
    ISSUE="${2:-}"
    [ -n "$ISSUE" ] || {
      echo "error: --handoff requires an issue number or URL" >&2
      exit 2
    }
    ;;
  *)
    echo "usage: bootstrap-github.sh [--apply | --handoff ISSUE]" >&2
    exit 2
    ;;
esac

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

if [ "$ACTION" = "handoff" ]; then
  if gh issue view "$ISSUE" --json labels --jq '.labels[].name' |
    grep -Fxq 'symphony-ready'; then
    gh issue edit "$ISSUE" --remove-label 'symphony-ready' >/dev/null
  fi
  if gh issue view "$ISSUE" --json labels --jq '.labels[].name' |
    grep -Fxq 'symphony-ready'; then
    echo "error: issue remains dispatchable after handoff" >&2
    exit 1
  fi
  echo "Controller handoff recorded; symphony-ready is absent from $ISSUE."
  exit 0
fi

if [ "$ACTION" = "preview" ]; then
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
