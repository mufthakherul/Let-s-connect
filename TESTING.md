# Testing Guide (Project Index)

This is the root testing entry point for Let-s-connect.

## Start here

- Developer-focused testing strategy: `docs/development/TESTING_PLAYBOOK.md`
- Existing testing documentation: `docs/development/TESTING.md`
- Performance suite docs: `tests/performance/README.md`
- Flaky/quarantine policy: `tests/quarantine/README.md`
- Critical-path scripts: `scripts/run-critical-path-tests.sh`

## Recommended order

1. Run local unit/integration tests for changed services.
2. Run frontend tests and lint/type checks.
3. Run critical-path suite.
4. Run E2E smoke or feature flows.
5. Run performance checks for high-risk changes.

## CI source of truth

Quality gates are defined in:

- `.github/workflows/ci.yml`

Keep local validation aligned with CI to avoid merge surprises.
