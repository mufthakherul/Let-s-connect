# Full Feature Test Plan (API + UI E2E)

Date: 2026-03-02
Scope: Systematic batch execution for core and extended features across gateway + microservices + frontend E2E.

## Test environment
- Docker compose stack running locally.
- Gateway: `http://127.0.0.1:8000`
- Frontend: `http://127.0.0.1:3000`
- Service ports:
  - user `8001`
  - content `8002`
  - messaging `8003`
  - collaboration `8004`
  - media `8005`
  - shop `8006`
  - ai `8007`
  - streaming `8009`

## Batch structure

### Batch 1 — Platform readiness & service health
- Validate all containers are up/healthy.
- Validate gateway/service root + health endpoints.
- Exit criterion: All required endpoints return success (`200` or healthy `503` semantics where defined).

### Batch 2 — Identity & access (gateway)
- Username availability check.
- Register user.
- Login and capture JWT.
- Exit criterion: Successful register/login and JWT available for downstream authenticated batches.

### Batch 3 — Content core flows
- Create post.
- Read feed for current user.
- Add comment to post.
- React to post.
- Exit criterion: CRUD-like post/comment/reaction flow passes through gateway.

### Batch 4 — Messaging/chat core flows
- Get notifications for logged in user.
- Create conversation.
- Read conversation messages.
- Exit criterion: conversation lifecycle endpoints respond successfully.

### Batch 5 — Cross-service feature smoke
- Collaboration: public docs/wiki.
- Media: health.
- Shop: public products.
- AI: chat/recommend endpoint.
- Streaming: radio/tv catalog endpoints.
- Exit criterion: at least one representative feature endpoint per service passes.

### Batch 6 — UI E2E (Playwright)
- `frontend/tests/smoke.spec.js`
- `frontend/tests/auth-content-flow.spec.js`
- Exit criterion: all Playwright specs pass in Chromium project.

## Reporting format
For each batch:
- Start/end timestamps.
- Commands executed.
- PASS/FAIL per test item.
- Failures with root-cause notes and fix action.

## Closure criteria
- All batch exit criteria met OR blocked items explicitly documented with actionable next steps.
- Final execution report saved under `docs/FULL_FEATURE_TEST_EXECUTION_2026-03-02.md`.
