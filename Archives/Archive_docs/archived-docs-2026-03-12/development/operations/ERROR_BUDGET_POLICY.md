# Error Budget Policy

**Last Updated:** March 10, 2026

---

## Purpose

This policy defines how reliability targets are measured and how delivery pace is adjusted when reliability degrades.

---

## Service Classes & Availability SLOs

| Class | Examples | Monthly Availability SLO | Monthly Error Budget |
|---|---|---:|---:|
| **Tier 1** | auth, api-gateway, feed read, messaging send | 99.9% | 43.2 minutes |
| **Tier 2** | profile updates, search, notifications | 99.5% | 216 minutes |
| **Tier 3** | analytics/admin non-critical jobs | 99.0% | 432 minutes |

Error budget formula:

$$
\text{ErrorBudgetMinutes} = (1 - \text{SLO}) \times 30 \times 24 \times 60
$$

---

## Latency SLO Baseline

- Tier 1 endpoints: p95 ≤ 500ms, p99 ≤ 1000ms
- Tier 2 endpoints: p95 ≤ 1000ms
- Background/admin endpoints: best effort with trend-based alerts

---

## Burn Rate Rules

For Tier 1 services (99.9% SLO):

- **Fast burn alert**: burn rate > 14.4 over 5m (critical)
- **Slow burn alert**: burn rate > 2 over 1h (warning)

Burn rate formula:

$$
\text{BurnRate} = \frac{\text{ErrorRatio}}{(1 - \text{SLO})}
$$

---

## Policy Actions by Budget Consumption

| Budget Consumed (Rolling 30 days) | Required Action |
|---:|---|
| < 25% | Normal delivery |
| 25% - 50% | Increase test depth + targeted reliability tasks |
| 50% - 75% | Reliability review required before risky changes |
| 75% - 100% | Change freeze for non-critical features |
| > 100% | Incident-level escalation + executive review |

---

## Required Operational Practices

- All SEV-1/SEV-2 incidents require PIR completion.
- Release gates must include health and alert baseline checks.
- SLO dashboards must be reviewed weekly.
- Error budget status should be shared in weekly modernization updates.

---

## References

- `deploy/monitoring/alerts/slo-alerts.yml`
- `docs/development/operations/INCIDENT_RESPONSE_RUNBOOK.md`
- `docs/development/operations/POST_INCIDENT_REVIEW_TEMPLATE.md`
- `docs/development/operations/RELEASE_HEALTH_AND_CANARY_CHECKLIST.md`
