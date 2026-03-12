# Incident Response Runbook

**Last Updated:** March 10, 2026  
**Owner:** Platform Engineering (API + SRE + Security)

---

## Purpose

This runbook defines the standard process for detecting, triaging, mitigating, and resolving production incidents across the Let's Connect platform.

Use this for:
- Service outages
- Elevated error rates / latency regressions
- Data integrity incidents
- Security incidents requiring immediate containment

---

## Severity Model & Response Targets

| Severity | Typical Impact | Acknowledge | Stabilize Target | Escalation |
|---|---|---:|---:|---|
| **SEV-1** | Core user journey unavailable (auth/feed/chat/gateway down) | 5 min | 30 min | Immediate exec + security notification |
| **SEV-2** | Major degradation or partial outage | 10 min | 60 min | Platform + service owner |
| **SEV-3** | Limited impact, workaround exists | 30 min | 4 hours | Service owner |
| **SEV-4** | Minor issue, no immediate user impact | 1 business day | Planned fix | Backlog triage |

---

## Incident Roles

- **Incident Commander (IC):** owns decisions, timeline, and status updates.
- **Ops Lead:** executes mitigations, deploy/rollback, infrastructure actions.
- **Service Lead:** deep diagnosis in affected service(s).
- **Comms Lead:** updates stakeholders and support channels.
- **Security Lead (if needed):** handles containment, forensics, and legal/compliance workflow.

One person may hold multiple roles for SEV-3/SEV-4 incidents.

---

## Detection Inputs

- Prometheus/Grafana alerts (`deploy/monitoring/alerts/*.yml`)
- Health check automation (`scripts/verify-health-checks.sh`)
- CI/CD deployment failures and post-release checks
- Manual reports from users/admins/support

---

## Response Workflow

### 1) Declare & Classify

1. Create incident channel/ticket and assign IC.
2. Record:
   - start time (UTC)
   - affected services/routes
   - suspected severity
3. Trigger escalation based on severity table.

### 2) Stabilize Fast

Priority order:
1. Stop blast radius (disable feature flags, traffic shaping, isolate broken route)
2. Roll back risky deployment if recent
3. Restore minimum viable service (degraded mode acceptable)

Quick checks:
- Gateway/service health endpoints
- Error and latency trends in Grafana
- Circuit breaker/open dependency states

### 3) Diagnose Root Cause

Collect evidence before broad changes:
- recent deploy/merge history
- structured logs with request correlation IDs
- dependency status (Postgres, Redis, external APIs)
- slow query and saturation signals

### 4) Recover & Verify

1. Apply fix (hotfix/config rollback/infrastructure action).
2. Verify:
   - core health endpoints return success
   - alert storm subsides
   - p95 and error rate back within SLO envelope
3. Keep incident open for 30 minutes of stable metrics.

### 5) Close & Follow-up

1. Mark resolved with exact timestamp.
2. Open corrective action tasks.
3. Complete post-incident review in 48 hours.

---

## Escalation Matrix (Fill Team Contacts)

| Scenario | Primary | Secondary | Escalate After |
|---|---|---|---:|
| Gateway / auth outage | Platform On-Call | Backend Lead | 10 min |
| Database degradation | DBA / Platform | Service Lead | 10 min |
| Cache / messaging degradation | Platform | Messaging Lead | 15 min |
| Security event / abuse spike | Security Lead | Platform Lead | Immediate |

---

## Communication Templates

### Initial Update

> We are investigating an active incident affecting **<service/flow>**.  
> Start time: **<UTC>**.  
> Current impact: **<impact summary>**.  
> Next update in **<X minutes>**.

### Mitigation Update

> Mitigation in progress: **<rollback/feature flag/config change>**.  
> Current status: **<improving/stable/monitoring>**.

### Resolution Update

> Incident resolved at **<UTC>**.  
> Root cause: **<short summary>**.  
> Follow-up actions tracked in post-incident review.

---

## Evidence Checklist

- [ ] Alert snapshots (time + labels)
- [ ] Logs with correlation IDs
- [ ] Query/runtime evidence
- [ ] Deployment references (commit/build IDs)
- [ ] Impact estimate (users, requests, duration)

---

## Related Documents

- `docs/development/operations/POST_INCIDENT_REVIEW_TEMPLATE.md`
- `docs/development/operations/ERROR_BUDGET_POLICY.md`
- `docs/development/operations/RELEASE_HEALTH_AND_CANARY_CHECKLIST.md`
- `deploy/monitoring/README.md`
