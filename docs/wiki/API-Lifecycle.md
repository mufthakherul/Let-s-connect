# API Lifecycle

This wiki page summarizes API evolution standards for Let-s-connect.

## Core rules

- Prefer backward-compatible changes by default.
- Version breaking changes explicitly.
- Publish migration guidance before removals.
- Keep docs, tests, and release notes in sync.

## Current baseline

- API v2 is the active default.

## When making API changes

1. Classify as breaking/non-breaking.
2. Update docs and examples.
3. Add/adjust tests.
4. Validate in CI and critical-path checks.
5. Publish release notes and migration notes.

## Deep docs

- `docs/development/API_LIFECYCLE.md`
- `docs/development/adr/0001-api-versioning-policy.md`
