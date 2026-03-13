# Operations Runbook

Operational runbooks for reliability, incident response, and service restoration.

## Incident severity model

| Severity | Description | Example |
|---|---|---|
| Sev-1 | Platform largely unavailable or critical data risk | API gateway down for all users |
| Sev-2 | Major feature outage with workarounds | Messaging broken, feed partially functional |
| Sev-3 | Non-critical degradation | Slow search, delayed notifications |
| Sev-4 | Minor defect or low-impact issue | Cosmetic admin panel issue |

## Response lifecycle

1. Detect and acknowledge incident.
2. Assign incident commander.
3. Contain impact (rollback, disable feature flags, traffic shift).
4. Diagnose root cause from dependency outward.
5. Restore service and verify with health + smoke checks.
6. Publish post-incident summary and action items.

## First 15 minutes checklist

- [ ] Confirm blast radius (which services/users/regions).
- [ ] Open incident channel and assign roles.
- [ ] Capture baseline symptoms and timestamps.
- [ ] Validate dependency health (DB, Redis, search, object storage).
- [ ] Announce user impact and next update time.

## Service restoration patterns

### API Gateway outage

1. Check gateway process/container and logs.
2. Validate dependency connectivity to downstream services.
3. Validate auth and config loading.
4. Rollback recent gateway config/code if needed.
5. Confirm `/health`, `/api-docs`, and one authenticated endpoint.

### Database pressure / lock contention

1. Identify blocked queries and long transactions.
2. Reduce traffic (rate limiting, temporary write restrictions).
3. Apply query/index mitigation if safe.
4. Verify recovery via latency/error-rate trends.

### Redis degradation

1. Verify memory pressure and eviction behavior.
2. Confirm pub/sub and cache clients reconnecting.
3. Temporarily disable non-essential cache-heavy features if required.

## Communication templates

### Initial incident notice

- **What happened:**
- **User impact:**
- **Current mitigation:**
- **Next update:**

### Resolution notice

- **Resolved at:**
- **Root cause:**
- **Mitigation applied:**
- **Follow-up actions:**

## Post-incident review (PIR)

Each Sev-1/Sev-2 incident should capture:

- timeline,
- root cause,
- contributing factors,
- what worked,
- what to improve,
- owner + due date for each action item.
