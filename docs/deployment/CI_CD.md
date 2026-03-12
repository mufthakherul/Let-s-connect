# CI/CD Pipeline Guide

This document describes the GitHub Actions continuous integration and deployment pipeline for the Milonexa platform.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Pipeline Triggers](#2-pipeline-triggers)
3. [Jobs](#3-jobs)
4. [Environment Variables & Secrets](#4-environment-variables--secrets)
5. [Adding a New Service to CI](#5-adding-a-new-service-to-ci)
6. [Branch Protection Rules](#6-branch-protection-rules)
7. [Deployment Workflow](#7-deployment-workflow)
8. [Cache Strategy](#8-cache-strategy)
9. [Code Coverage](#9-code-coverage)
10. [Bundle Size Budget](#10-bundle-size-budget)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Overview

The primary CI pipeline is defined at `.github/workflows/ci.yml`. It runs automated tests, builds, and checks on every push to `main`/`develop` and on every pull request targeting those branches.

**Stack:**
- Runner: `ubuntu-latest`
- Node.js version: `20`
- All npm operations use `--legacy-peer-deps` for the frontend

**Pipeline stages:**

```
Push / PR
    │
    ├── frontend-test ──────────────────── Install → Test → Build → Bundle check
    │
    └── backend-tests (matrix)
            ├── user-service ──────────── Install → Jest --coverage
            ├── api-gateway ──────────── Install → Jest --coverage (22 resilience tests)
            ├── content-service ──────── Install → Jest --coverage
            └── messaging-service ────── Install → Jest --coverage
```

---

## 2. Pipeline Triggers

The CI workflow triggers on:

```yaml
on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main
      - develop
```

| Trigger | When |
|---|---|
| `push` to `main` | After merging a PR; runs full CI + optional deploy |
| `push` to `develop` | After feature branches are merged to develop |
| `pull_request` to `main` | On every PR update; must pass before merge |
| `pull_request` to `develop` | On every PR update to develop |

---

## 3. Jobs

### 3.1 `frontend-test`

Builds and tests the React frontend.

```yaml
frontend-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Use Node.js 20
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json

    - name: Install dependencies
      working-directory: frontend
      run: npm ci --legacy-peer-deps

    - name: Run tests
      working-directory: frontend
      run: npm test -- --watchAll=false --coverage --passWithNoTests
      env:
        CI: true

    - name: Build production bundle
      working-directory: frontend
      run: npx react-scripts build
      env:
        DISABLE_ESLINT_PLUGIN: true
        CI: false   # Prevent treating warnings as errors during build

    - name: Check bundle size
      working-directory: frontend
      run: node scripts/bundle-budget-check.js
```

**What is checked:**
- Unit tests pass with `npm test`
- Production build succeeds with `DISABLE_ESLINT_PLUGIN=true`
- Bundle size is within budget (see [Bundle Size Budget](#10-bundle-size-budget))

### 3.2 `backend-tests` (matrix)

Runs tests for each backend service in parallel using a matrix strategy.

```yaml
backend-tests:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      service:
        - user-service
        - api-gateway
        - content-service
        - messaging-service
    fail-fast: false   # Don't cancel other matrix jobs on one failure

  steps:
    - uses: actions/checkout@v4

    - name: Use Node.js 20
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: services/${{ matrix.service }}/package-lock.json

    - name: Install dependencies
      working-directory: services/${{ matrix.service }}
      run: npm ci

    - name: Run tests with coverage
      working-directory: services/${{ matrix.service }}
      run: npm test -- --coverage --passWithNoTests
      env:
        NODE_ENV: test
        JWT_SECRET: test_jwt_secret_at_least_32_chars_xxxxxx
        ENCRYPTION_KEY: test_encryption_key_32chars_xxxxxx
        INTERNAL_GATEWAY_TOKEN: test_gateway_token_32chars_xxxxxxx
```

**Per-service test details:**

| Service | Test File | Tests | Notes |
|---|---|---|---|
| `user-service` | `tests/*.test.js` | Auth, profile, OAuth | Mocks DB and Redis |
| `api-gateway` | `tests/resilience.test.js` | 22 tests | Circuit breaker, rate limiting, health aggregation |
| `content-service` | `tests/*.test.js` | Post CRUD, feed, toxicity | Mocks DB and content moderation |
| `messaging-service` | `tests/*.test.js` | Conversation, message, WebSocket events | Mocks Socket.io and Redis pub/sub |

### 3.3 `api-gateway` Resilience Tests

The API gateway has a dedicated resilience test suite (`tests/resilience.test.js`) with 22 tests covering:

- Circuit breaker state transitions (closed → open → half-open)
- Per-service circuit breaker isolation
- Rate limiting enforcement
- Health check aggregation across all services
- Request routing with and without auth
- Error response format consistency
- Header injection (`x-user-id`, `x-request-id`)
- Timeout handling

---

## 4. Environment Variables & Secrets

### GitHub Secrets Required

Add these in **Settings → Secrets and Variables → Actions** in the repository:

| Secret Name | Purpose | Notes |
|---|---|---|
| `JWT_SECRET` | Test JWT signing | Use a test-only value; min 32 chars |
| `ENCRYPTION_KEY` | Test field encryption | Use a test-only value; 32 chars |
| `INTERNAL_GATEWAY_TOKEN` | Test service auth | Use a test-only value; 32 chars |
| `DOCKER_USERNAME` | Docker Hub push (deploy jobs) | Only needed for deployment workflow |
| `DOCKER_PASSWORD` | Docker Hub push (deploy jobs) | Only needed for deployment workflow |
| `KUBE_CONFIG` | Kubernetes deploy (deploy jobs) | Base64-encoded kubeconfig |

### Optional Secrets (for deployment workflow)

| Secret Name | Purpose |
|---|---|
| `REGISTRY_URL` | Custom Docker registry URL |
| `SLACK_WEBHOOK_URL` | Notify Slack on deployment success/failure |
| `SENTRY_DSN` | Sentry error tracking DSN for deployed app |

### CI-only Environment Variables

These are set inline in the workflow (not secrets, safe to be visible):

```yaml
env:
  NODE_ENV: test
  CI: true
  DISABLE_ESLINT_PLUGIN: true
```

---

## 5. Adding a New Service to CI

To add a new microservice to the CI matrix:

1. Ensure the service has a `package.json` with a `test` script:

   ```json
   {
     "scripts": {
       "test": "jest --passWithNoTests"
     }
   }
   ```

2. Add a `jest.config.js` in the service root:

   ```js
   module.exports = {
     testEnvironment: 'node',
     testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.test.js'],
     collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
     coverageThresholds: {
       global: { lines: 60 }
     }
   };
   ```

3. Add the service name to the `matrix.service` array in `.github/workflows/ci.yml`:

   ```yaml
   matrix:
     service:
       - user-service
       - api-gateway
       - content-service
       - messaging-service
       - my-new-service    # ← add here
   ```

4. Ensure the service has a `package-lock.json` committed (run `npm install` locally).

---

## 6. Branch Protection Rules

Configure these in **Settings → Branches → Branch protection rules** for `main` and `develop`:

| Rule | Setting |
|---|---|
| Require status checks to pass | ✅ `frontend-test`, `backend-tests (user-service)`, `backend-tests (api-gateway)`, `backend-tests (content-service)`, `backend-tests (messaging-service)` |
| Require branches to be up to date | ✅ |
| Require a pull request before merging | ✅ |
| Require at least 1 approving review | ✅ |
| Dismiss stale pull request approvals | ✅ |
| Restrict who can push to matching branches | ✅ (admins only for `main`) |
| Do not allow bypassing the above settings | ✅ |

---

## 7. Deployment Workflow

After CI passes on `main`, an optional deployment workflow (`deploy.yml`) can:

1. Build Docker images for changed services
2. Push to Docker registry (Docker Hub / GHCR / ECR)
3. Deploy to Kubernetes via `kubectl`

```yaml
# .github/workflows/deploy.yml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]

jobs:
  deploy:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push Docker images
        run: |
          docker build -t milonexa/api-gateway:${{ github.sha }} services/api-gateway/
          docker push milonexa/api-gateway:${{ github.sha }}

      - name: Deploy to Kubernetes
        env:
          KUBE_CONFIG: ${{ secrets.KUBE_CONFIG }}
        run: |
          echo "$KUBE_CONFIG" | base64 -d > ~/.kube/config
          kubectl set image deployment/api-gateway \
            api-gateway=milonexa/api-gateway:${{ github.sha }} \
            -n milonexa
          kubectl rollout status deployment/api-gateway -n milonexa
```

---

## 8. Cache Strategy

npm dependencies are cached per service using the `cache-dependency-path` option in `actions/setup-node`.

The cache key is based on the `package-lock.json` hash:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
    cache-dependency-path: services/user-service/package-lock.json
```

Cache hits typically reduce install time from ~60s to ~5s.

**Cache invalidation:** The cache is automatically invalidated when `package-lock.json` changes.

---

## 9. Code Coverage

Jest is configured to collect coverage with the `--coverage` flag. Coverage reports are generated in `coverage/` for each service.

### Coverage thresholds

Recommended minimum thresholds in `jest.config.js`:

```js
coverageThresholds: {
  global: {
    branches: 50,
    functions: 60,
    lines: 60,
    statements: 60
  }
}
```

### Uploading coverage reports

To upload coverage to Codecov:

```yaml
- name: Upload coverage
  uses: codecov/codecov-action@v4
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    directory: services/user-service/coverage
    flags: user-service
```

---

## 10. Bundle Size Budget

The frontend build must stay within the following size budgets (checked by `scripts/bundle-budget-check.js` after `npm run build`):

| Asset | Max Size |
|---|---|
| `main.*.js` (initial bundle) | 500 KB (gzip) |
| `main.*.css` | 100 KB (gzip) |
| Any single chunk `.js` | 300 KB (gzip) |
| Total JS | 1.5 MB (gzip) |

If a build exceeds the budget, CI fails with:

```
❌ Bundle budget exceeded:
   main.abc123.js: 612 KB (budget: 500 KB)
```

To investigate bundle size:

```bash
cd frontend
DISABLE_ESLINT_PLUGIN=true npx react-scripts build
npx source-map-explorer 'build/static/js/*.js'
```

---

## 11. Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| `npm ci` fails with peer dependency errors | Missing `--legacy-peer-deps` in frontend | Ensure `npm ci --legacy-peer-deps` is used for frontend jobs |
| Tests fail with `Required environment variable` | Missing `JWT_SECRET` or similar in test env | Add required secrets to GitHub Secrets; ensure they're passed in `env:` block |
| Build fails with `REACT_APP_` error | Missing env var | Only REACT_APP_ vars affect React build; check `.env.example` |
| `react-scripts: command not found` | `npm ci` failed silently | Check npm install step output; use `--legacy-peer-deps` |
| Coverage threshold not met | Tests not covering new code | Write tests for new code paths or lower threshold temporarily |
| Matrix job cancelled due to `fail-fast` | Another matrix job failed | Set `fail-fast: false` in matrix strategy |
| Cache not being used | `package-lock.json` changed | Expected; cache will rebuild. Check for unintended lockfile changes. |
