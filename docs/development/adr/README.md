# Architecture Decision Records (ADR)

This directory stores architectural and long-lived technical decisions.

## Why ADRs

ADRs create traceable context for *why* key decisions were made, not just *what* code exists.

## Naming convention

- File format: `NNNN-short-kebab-title.md`
- Example: `0001-api-versioning-policy.md`

## Required sections

- Status
- Context
- Decision
- Consequences
- Alternatives considered

Use `ADR_TEMPLATE.md` when creating new records.

## Status values

- `Proposed`
- `Accepted`
- `Superseded`
- `Deprecated`

## Process

1. Create ADR in pull request.
2. Request review from relevant owners.
3. Mark as `Accepted` when merged.
4. If replaced, update old ADR to `Superseded` and reference the newer ADR.
