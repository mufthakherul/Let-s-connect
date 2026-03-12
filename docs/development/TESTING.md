# Testing Guide

Testing practices, frameworks, and running tests in Milonexa.

## Test Frameworks

- **Jest**: Unit and integration tests
- **Playwright**: E2E browser tests
- **Supertest**: HTTP API testing
- **Sinon**: Mocking and spying

## Running Tests

### API Gateway
```bash
cd services/api-gateway
npm test                    # Run all 22 tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage report
npm test resilience        # Run specific test file
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
cd admin_frontend
npx playwright test         # Run all E2E tests
npx playwright test --ui    # Interactive UI mode
npx playwright test --debug # Debug mode
```

## Test Structure

```
services/api-gateway/
├── tests/
│   ├── resilience.test.js      # 22 tests for circuit breakers
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

Current coverage: ~85% across services

View: `npm test -- --coverage` → `coverage/lcov-report/index.html`

## Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Test behavior, not implementation**: Don't test internal details
3. **Use descriptive names**: `should_return_error_when_user_not_found`
4. **Mock external dependencies**: Don't call real APIs
5. **Keep tests isolated**: No dependencies between tests
6. **Use test data factories**: Consistent test data

---
Last Updated: 2024
