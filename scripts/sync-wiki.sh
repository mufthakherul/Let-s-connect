#!/usr/bin/env bash
set -euo pipefail

# Sync docs/wiki pages to GitHub Wiki repository.
# Source of truth: docs/wiki/*.md

REPO_OWNER="mufthakherul"
REPO_NAME="Let-s-connect"
WIKI_REMOTE="https://github.com/${REPO_OWNER}/${REPO_NAME}.wiki.git"
SOURCE_DIR="docs/wiki"
WORK_DIR="/tmp/${REPO_NAME}-wiki-sync"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required" >&2
  exit 1
fi

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Missing source directory: $SOURCE_DIR" >&2
  exit 1
fi

rm -rf "$WORK_DIR"
git clone "$WIKI_REMOTE" "$WORK_DIR"

find "$WORK_DIR" -maxdepth 1 -type f -name "*.md" -delete
cp "$SOURCE_DIR"/*.md "$WORK_DIR"/

pushd "$WORK_DIR" >/dev/null

git add .
if git diff --cached --quiet; then
  echo "No wiki changes to publish."
  popd >/dev/null
  exit 0
fi

git commit -m "docs(wiki): sync wiki pages from docs/wiki"
git push origin master

popd >/dev/null

echo "Wiki sync complete."
