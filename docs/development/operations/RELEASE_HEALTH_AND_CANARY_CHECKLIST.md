# Release Health & Canary Checklist

Use this checklist before, during, and after production releases.

---

## 1) Pre-Release Gates

- [ ] CI pipeline green (tests/build/security checks)
- [ ] No unresolved critical vulnerabilities for changed services
- [ ] Database migration reviewed (forward + rollback)
- [ ] Feature flags ready for controlled rollout
- [ ] Incident commander/on-call assigned for release window
- [ ] Dashboard and alert links prepared

---

## 2) Baseline Verification (Before Deploy)

- [ ] Core health checks pass (`/health`, `/health/ready`)
- [ ] p95 latency and 5xx rate within normal baseline
- [ ] Queue depth and DB connections not saturated
- [ ] No active SEV-1 / SEV-2 incident

Automation helper:
- `scripts/release-health-check.sh`

---

## 3) Canary Rollout Strategy

Recommended traffic progression:
1. **5%** traffic for 10-15 min
2. **25%** traffic for 15-30 min
3. **50%** traffic for 15-30 min
4. **100%** only if all success criteria hold

### Canary Success Criteria

- Error rate does not exceed baseline + 1%
- p95 latency does not regress > 20%
- No sustained critical alerts
- Business critical flows remain functional

### Immediate Rollback Triggers

- SEV-1 user impact observed
- Fast-burn error budget alert fires
- Circuit breakers remain open > 2 minutes
- Authentication or payment path degradation

---

## 4) Post-Deployment Validation

- [ ] Health endpoints stable for at least 30 minutes
- [ ] SLO burn-rate alerts remain healthy
- [ ] Key user journeys validated (auth/feed/chat/upload)
- [ ] No elevated failed login or 5xx anomalies
- [ ] Release note and monitoring summary posted

---

## 5) Rollback Readiness

- [ ] Previous artifact/tag is available
- [ ] Rollback procedure tested in staging
- [ ] Data compatibility verified for rollback path
- [ ] Communication template prepared

---

## 6) Evidence to Attach in Release Ticket

- [ ] CI run URL
- [ ] Health check output
- [ ] Dashboard snapshot (before/after)
- [ ] Alert status snapshot
- [ ] Approval log (service owner + on-call)
