# Troubleshooting Guide

Centralized diagnostics and fixes for local development and staging incidents.

## Quick triage checklist

1. Check service health endpoints (`/health`).
2. Check container/process status.
3. Check logs for first failing dependency.
4. Verify `.env` values and secrets.
5. Validate network/port collisions.

## Common issues and fixes

### 1) Frontend can’t reach API gateway

**Symptoms:** CORS/network errors in browser devtools.

**Checks:**
- Ensure gateway is running on `:8000`.
- Ensure frontend proxy setup is used (avoid incorrect `REACT_APP_API_URL` in dev containers).

**Fixes:**
- Restart frontend and gateway.
- Remove/adjust conflicting API URL env vars.

### 2) Services fail to boot due to DB/Redis

**Symptoms:** Connection refused, timeout, auth errors.

**Checks:**
- `docker compose ps`
- `docker compose logs postgres redis`
- confirm env connection strings and credentials.

**Fixes:**
- Start infra dependencies first.
- Re-run DB init scripts when needed.

### 3) JWT/auth failures across services

**Symptoms:** 401/403 from gateway or downstream services.

**Checks:**
- Confirm shared `JWT_SECRET` consistency.
- Validate token expiry and issuer/audience expectations.

**Fixes:**
- Rotate invalid tokens.
- Reconcile auth config across services.

### 4) GraphQL auth context issues

**Symptoms:** GraphQL requests fail auth while REST works.

**Checks:**
- Verify gateway GraphQL middleware context wiring.
- Verify auth middleware runs before GraphQL handler.

### 5) E2E flakes in CI

**Symptoms:** intermittent Playwright failures.

**Checks:**
- Confirm deterministic test data.
- Identify timing-sensitive waits.
- Review artifact screenshots/traces.

**Fixes:**
- Replace implicit timing assumptions with explicit stable waits.
- Quarantine truly flaky cases in `tests/quarantine/` with tracking issue.

## Useful diagnostics

- API gateway health: `http://localhost:8000/health`
- Service health examples: `http://localhost:8001/health`, `http://localhost:8002/health`
- Compose status: `docker compose ps`
- Compose logs: `docker compose logs <service>`

## Escalation guidance

Escalate when:

- a production-impacting issue has no mitigation,
- data correctness is suspect,
- repeated auth/security failures appear,
- incident exceeds agreed response windows.

Use `docs/deployment/OPERATIONS_RUNBOOK.md` for incident management structure.
