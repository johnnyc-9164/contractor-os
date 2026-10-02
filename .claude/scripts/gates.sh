#!/usr/bin/env bash
set -uo pipefail

LEVEL="${1:-full}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || exit 2

case "$LEVEL" in fast|full|deep) ;; *)
  echo "error: gate level must be fast, full, or deep" >&2
  echo "FACTORY_GATES: level=$LEVEL status=MISCONFIGURED passed=0 failed=0 failing=none skipped=none misconfigured=invalid-level"
  exit 2
esac

REQUIRED_FAST="harness types lint"
REQUIRED_FULL="harness types lint test build"
REQUIRED_DEEP="harness types lint test build audit architecture"
if [ -f .factory/gates.conf ]; then
  # shellcheck disable=SC1091
  source .factory/gates.conf
fi
case "$LEVEL" in
  fast) REQUIRED="$REQUIRED_FAST" ;;
  full) REQUIRED="$REQUIRED_FULL" ;;
  deep) REQUIRED="$REQUIRED_DEEP" ;;
esac

for gate in $REQUIRED; do
  case "$gate" in harness|types|lint|test|build|audit|architecture) ;;
    *) echo "FACTORY_GATES: level=$LEVEL status=MISCONFIGURED passed=0 failed=0 failing=none skipped=none misconfigured=unknown-$gate"; exit 2 ;;
  esac
done

PASSED=0
FAILED=0
FAILING=""
SKIPPED=""
MISCONFIGURED=""

required() { case " $REQUIRED " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }
run() {
  local name="$1"; shift
  printf '\n=== gate: %s ===\n' "$name"
  if "$@"; then
    echo "PASS  $name"
    PASSED=$((PASSED + 1))
  else
    echo "FAIL  $name"
    FAILED=$((FAILED + 1))
    FAILING="${FAILING}${FAILING:+,}${name}"
  fi
}
skip() {
  echo "SKIP  $1 ($2)"
  SKIPPED="${SKIPPED}${SKIPPED:+,}$1"
  if required "$1"; then MISCONFIGURED="${MISCONFIGURED}${MISCONFIGURED:+,}$1"; fi
}
has() { command -v "$1" >/dev/null 2>&1; }
pkg_has() { node -e "process.exit(require('./package.json').scripts?.['$1'] ? 0 : 1)" >/dev/null 2>&1; }

if required harness; then run harness bash .factory/tests/run.sh; fi

if required types; then
  if has pnpm && pkg_has check-types; then run types pnpm check-types; else skip types "pnpm or check-types script missing"; fi
fi
if required lint; then
  if has pnpm && pkg_has biome; then run lint pnpm biome; else skip lint "pnpm or biome script missing"; fi
fi
if required test; then
  if has pnpm && pkg_has test; then run test pnpm test; else skip test "pnpm or test script missing"; fi
fi
if required build; then
  if has pnpm && pkg_has build; then run build pnpm build; else skip build "pnpm or build script missing"; fi
fi
if required audit; then
  if has pnpm; then run audit pnpm audit --audit-level=high; else skip audit "pnpm missing"; fi
fi
if required architecture; then
  printf '\n=== gate: architecture ===\n'
  ARCH_FAIL=0
  ARCH_ERROR=0
  git grep --untracked -n -F 'from "convex/react"' -- packages/ui >/dev/null 2>&1
  DOUBLE_QUOTE_STATUS=$?
  git grep --untracked -n -F "from 'convex/react'" -- packages/ui >/dev/null 2>&1
  SINGLE_QUOTE_STATUS=$?
  if [ "$DOUBLE_QUOTE_STATUS" -gt 1 ] || [ "$SINGLE_QUOTE_STATUS" -gt 1 ]; then
    echo "architecture: unable to scan packages/ui imports" >&2
    ARCH_ERROR=1
  elif [ "$DOUBLE_QUOTE_STATUS" -eq 0 ] || [ "$SINGLE_QUOTE_STATUS" -eq 0 ]; then
    echo "architecture: packages/ui must remain backend-independent"
    ARCH_FAIL=1
  fi
  CORE_MATCHES="$(git grep --untracked -n -F '@johnnyc2026/contractor-os-core' -- apps packages 2>&1)"
  CORE_STATUS=$?
  if [ "$CORE_STATUS" -gt 1 ]; then
    echo "architecture: unable to scan core imports" >&2
    ARCH_ERROR=1
  elif [ "$CORE_STATUS" -eq 0 ] && printf '%s\n' "$CORE_MATCHES" | grep -v '^packages/backend/' | grep -q .; then
    echo "architecture: contractor-os-core imports belong under packages/backend"
    ARCH_FAIL=1
  fi
  TRACKED_FILES="$(git ls-files 2>&1)"
  TRACKED_STATUS=$?
  if [ "$TRACKED_STATUS" -ne 0 ]; then
    echo "architecture: unable to inspect tracked files" >&2
    ARCH_ERROR=1
  elif printf '%s\n' "$TRACKED_FILES" | grep -E '(^|/)\.env($|\.(local|production|preview|development)$)' >/dev/null 2>&1; then
    echo "architecture: tracked secret-bearing env file detected"
    ARCH_FAIL=1
  fi
  if [ "$ARCH_ERROR" -ne 0 ]; then
    echo "MISCONFIGURED  architecture"
    MISCONFIGURED="${MISCONFIGURED}${MISCONFIGURED:+,}architecture"
  elif [ "$ARCH_FAIL" -eq 0 ]; then
    echo "PASS  architecture"; PASSED=$((PASSED + 1))
  else
    echo "FAIL  architecture"; FAILED=$((FAILED + 1)); FAILING="${FAILING}${FAILING:+,}architecture"
  fi
fi

STATUS="GREEN"
EXIT_STATUS=0
if [ -n "$MISCONFIGURED" ]; then STATUS="MISCONFIGURED"; EXIT_STATUS=2
elif [ "$FAILED" -gt 0 ]; then STATUS="RED"; EXIT_STATUS=1
fi

printf '\nFACTORY_GATES: level=%s status=%s passed=%d failed=%d failing=%s skipped=%s misconfigured=%s\n' \
  "$LEVEL" "$STATUS" "$PASSED" "$FAILED" "${FAILING:-none}" "${SKIPPED:-none}" "${MISCONFIGURED:-none}"
exit "$EXIT_STATUS"
