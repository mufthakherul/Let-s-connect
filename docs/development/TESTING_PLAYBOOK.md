# Testing Playbook

A practical, production-oriented testing strategy for Let-s-connect.

## Objectives

- Prevent regressions in critical user flows.
- Keep service contracts stable across microservices.
- Enforce quality gates in CI with clear local parity.

## Testing pyramid for this repo

| Layer | Scope | Tools | Primary location |
|---|---|---|---|
| Unit | Functions/components/modules | Jest, Testing Library | `frontend/src/**`, `services/*/tests/**` |
| Integration | Service routes + DB/cache interactions | Jest, Supertest | `services/*/tests/**` |
| Contract/Critical-path | Cross-service request/response compatibility | custom scripts + Jest | `tests/critical-path/` |
| E2E | User-facing browser flows | Playwright | `frontend/tests/` |
| Performance | Throughput/latency and degradation behavior | Artillery, Node scripts | `tests/performance/` |

## Quality gates (CI-aligned)

The CI workflow in `.github/workflows/ci.yml` validates:

1. Frontend test/build/bundle checks
2. Backend service test matrix
3. Lint and formatting checks
4. E2E smoke suite
5. Security dependency audits
6. Critical-path baseline suite
7. Coverage threshold policy checks
8. Flaky test detection framework

## Local commands by area

### Frontend

```bash
cd frontend
npm ci --legacy-peer-deps
npm test -- --watchAll=false --ci
npm run test:e2e
npm run lint
npm run format:check
npm run typecheck
```

### Backend services (example)

```bash
cd services/user-service
npm ci
npm test -- --ci --coverage
```

### Critical-path tests

```bash
./scripts/run-critical-path-tests.sh
```

### Performance suite

```bash
cd tests/performance
# See README for artillery and node-based load tests
```

## Test data and environment

- Use deterministic fixtures whenever possible.
- Keep `NODE_ENV=test` isolated from dev/prod data.
- Prefer local infra (`postgres`, `redis`) via Docker Compose for integration flows.

## Minimum review checklist for PRs

- [ ] Unit tests for business logic changes
- [ ] Integration tests for API/contract changes
- [ ] Critical-path validation for cross-service behavior
- [ ] E2E updates when user flows/UI states change
- [ ] Snapshot updates reviewed for legitimacy (not blindly accepted)

## Flaky test handling policy

Use `tests/quarantine/` for unstable tests and include:

- reason for quarantine,
- issue/PR reference,
- stabilization strategy,
- re-enable criteria.

## Test evidence in PR description

Recommended PR evidence block:

- frontend tests: pass/fail + key output
- backend tests: services covered
- critical-path: pass/fail summary
- e2e: scenarios executed
- performance: baseline vs change (if relevant)
