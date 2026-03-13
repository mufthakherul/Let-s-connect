# Testing Guide

Testing practices, frameworks, and execution commands for Let-s-connect.

> For the full strategy (pyramid, quality gates, PR evidence), see [TESTING_PLAYBOOK.md](./TESTING_PLAYBOOK.md).

## Test Frameworks

- **Jest**: Unit and integration tests
- **Playwright**: E2E browser tests
- **Supertest**: HTTP API testing
- **Sinon**: Mocking and spying

## Running Tests

### API Gateway
```bash
cd services/api-gateway
npm test                    # Run service tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage report
npm test -- resilience.test.js        # Run specific test file (example)
```

### Frontend
```bash
cd frontend
npm test                    # Jest tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # Coverage
```

### E2E Tests
```bash
cd frontend
npx playwright test         # Run all E2E tests
npx playwright test --ui    # Interactive UI mode
npx playwright test --debug # Debug mode
```

## Test Structure

```
services/api-gateway/
├── tests/
│   ├── resilience.test.js      # Circuit-breaker/resilience test cases
│   ├── auth.test.js
│   ├── errors.test.js
│   └── helpers.js              # Test utilities
├── __mocks__/
│   ├── redis.js
│   └── database.js
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
- Runs on push and PR
- Runs unit tests
- Runs E2E tests
- Generates coverage

View results: GitHub Actions tab

## Test Environment

Tests use `NODE_ENV=test`:
- Separate test database
- Mock Redis
- Mock external APIs
- Seed test data

## Coverage

Coverage is tracked per service and validated in CI quality gates.

View local coverage: `npm test -- --coverage` → `coverage/lcov-report/index.html`

## Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Test behavior, not implementation**: Don't test internal details
3. **Use descriptive names**: `should_return_error_when_user_not_found`
4. **Mock external dependencies**: Don't call real APIs
5. **Keep tests isolated**: No dependencies between tests
6. **Use test data factories**: Consistent test data

---
Last updated: March 12, 2026
