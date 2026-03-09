# Archive and Documentation Cleanup Prompt

## Purpose
Automates the process of merging duplicate archive directories, moving all documentation to the canonical `Archives/Archive_docs/` location, and organizing root-level markdown files into the correct documentation or archive folders.

## Workflow
- Move all files and subfolders from any duplicate `archives/` directory into `Archives/Archive_docs/` (matching subfolder names)
- Remove the now-empty `archives/` directory
- Move important root `.md` files to the appropriate `docs/` subfolder by category (user, deployment, development)
- Move non-essential or meta `.md` files from root to `Archives/Archive_docs/`

## Example Invocations
- "Merge duplicate archive directories and clean up root docs"
- "Move all old docs to Archives/Archive_docs and organize important docs into docs/"
- "Clean up documentation and archive structure"

## Related Customizations
- `/create-instruction archive-strategy` — Enforce correct archiving of unused code/docs
- `/create-hook docker-healthcheck` — Monitor health endpoints and auto-restart failed services

---

_Last updated: March 9, 2026_
