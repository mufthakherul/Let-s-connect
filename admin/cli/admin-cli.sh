#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
CLI_DIR="$ROOT_DIR/admin/cli"

if command -v node >/dev/null 2>&1; then
  exec node "$CLI_DIR/index.js" "$@"
fi

if command -v docker >/dev/null 2>&1; then
  exec docker run --rm -it \
    -v "$ROOT_DIR:/workspace" \
    -w /workspace/admin/cli \
    node:20-alpine \
    sh -lc 'npm ci --omit=dev >/dev/null 2>&1 || npm install --omit=dev >/dev/null 2>&1; node index.js "$@"' sh "$@"
fi

echo "Error: Node.js is not installed and Docker is unavailable." >&2
echo "Install Node.js >=18 or Docker to run the admin CLI." >&2
exit 1
