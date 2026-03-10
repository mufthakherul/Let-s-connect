# Workstream G Baseline
# Quality Engineering & Automated Testing

**Status:** 🟡 Started (March 10, 2026)  
**Scope in this baseline:** G1 + G2 starter execution with CI hookup

---

## What was started

This baseline begins Workstream G with an executable critical-path harness and CI integration.

### G1. Testing pyramid rollout (starter)

- Existing service/unit tests retained and mapped:
  - `services/user-service/tests/*` (Jest)
  - `services/api-gateway/tests/*` (Jest)
  - `services/content-service/tests/*` (Node integration style)
  - Frontend and admin Playwright suites
- Added a cross-service **critical-path baseline test harness**:
  - `tests/critical-path/_helpers.js`
  - `tests/critical-path/run-all.js`
  - `scripts/run-critical-path-tests.sh`

### G2. Initial critical-path suites (starter)

Added baseline suites for key flows:

- `tests/critical-path/auth-register-login-reset.test.js`
  - register/login/check-username + reset capability probe
- `tests/critical-path/feed-create-read-engage.test.js`
  - create post + fetch feed + react to post
- `tests/critical-path/messaging-send-receive-reconnect.test.js`
  - create conversation + list + repeated message fetch probe
- `tests/critical-path/media-upload-list-delete.test.js`
  - upload + signed URL fetch + delete capability probe
- `tests/critical-path/shop-browse-cart-order.test.js`
  - browse products + create product + cart + order
- `tests/critical-path/admin-login-controls.test.js`
  - admin login + protected control guards + query debug guard

> Note: these baseline suites **skip gracefully** if target services are unreachable, so they are safe in lightweight CI contexts.

### G3. CI quality gates (starter)

Updated CI workflow:

- Added `critical-path-baseline` job in `.github/workflows/ci.yml`
- Included baseline job in final `quality-gates` summary dependency list

---

## How to run locally

From repository root:

- `./scripts/run-critical-path-tests.sh`

You can override service URLs with environment variables:

- `USER_SERVICE_URL`
- `CONTENT_SERVICE_URL`
- `MESSAGING_SERVICE_URL`
- `MEDIA_SERVICE_URL`
- `SHOP_SERVICE_URL`
- `SECURITY_SERVICE_URL`

---

## Current limitations (expected for baseline)

- Some flows are partial capability checks because not every endpoint is fully implemented (e.g., media delete route).
- Baseline tests prioritize **server stability assertions** (`no 5xx`) and core route availability over deep business-logic assertions.
- Next iteration should add seeded test data and strict status/body assertions in ephemeral integration environments.

---

## Recommended next G iteration

1. Add deterministic seeded integration environment for all services under CI.
2. Promote baseline checks into strict pass/fail flow assertions.
3. Expand contract tests for gateway-to-service interactions.
4. Add coverage thresholds and flaky-test quarantine policy.
5. Add artifacts (JUnit/XML + logs) upload for diagnostics.

---

**Owner:** Platform Engineering  
**Date:** March 10, 2026
