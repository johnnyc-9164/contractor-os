#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

bash -n .claude/scripts/gates.sh
bash -n .claude/hooks/block-merge.sh
bash -n .factory/scripts/doctor.sh
bash -n .factory/scripts/bootstrap-github.sh
bash -n .factory/scripts/prove-test.sh
node --test .factory/tests/harness.test.mjs
