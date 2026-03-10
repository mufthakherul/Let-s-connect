#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

echo "Running Workstream G critical-path baseline tests..."
node tests/critical-path/run-all.js

echo "Workstream G critical-path baseline tests completed."
