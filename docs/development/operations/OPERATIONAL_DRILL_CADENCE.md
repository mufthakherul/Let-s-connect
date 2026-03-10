# Operational Drill Cadence

**Last Updated:** March 10, 2026  
**Scope:** Incident response drills + rollback game days

---

## Purpose

This document defines the recurring drill program used to validate operational readiness and reduce real-incident response time.

Goals:
- Keep runbooks executable and current
- Validate rollback/recovery paths before production incidents
- Improve MTTR and decision quality under pressure

---

## Cadence

| Drill Type | Frequency | Duration | Required Participants |
|---|---|---:|---|
| Incident simulation (SEV-1/SEV-2) | Bi-weekly | 45-60 min | IC, Ops lead, one service owner, observer |
| Rollback canary drill | Monthly | 60-90 min | Platform, release manager, service owner |
| Security response tabletop | Monthly | 45-60 min | Security lead, platform, admin ops |
| Cross-team game day | Quarterly | 2-3 hrs | Frontend, backend, platform, QA, support |

---

## Required Drill Inputs

- Current runbooks from `docs/development/operations/`
- Latest dashboard and alert links
- Recent release artifact references
- Drill scenario with start conditions and success criteria

---

## Drill Success Criteria

A drill is considered successful when all are true:
- Incident is declared and severity classified within target time
- Communications cadence is followed
- Mitigation path selected and executed with evidence
- Recovery validation checks pass
- PIR draft and corrective actions are produced

---

## Timing Targets (Operational KPI)

| KPI | Target |
|---|---:|
| Time to acknowledge (SEV-1) | ≤ 5 minutes |
| Time to mitigation decision | ≤ 15 minutes |
| Time to service stabilization | ≤ 30 minutes |
| PIR completed after drill | ≤ 48 hours |

---

## Drill Execution Workflow

1. Select scenario and assign roles.
2. Run baseline health checks.
3. Inject failure simulation (controlled).
4. Execute incident workflow and communications.
5. Recover and validate service health.
6. Capture findings and corrective actions.

Use script:
- `scripts/run-game-day-drill.sh`

---

## Reporting Requirements

Each drill must produce:
- Drill report with timeline and decisions
- Failures/gaps list
- Prioritized action items with owners/dates
- Follow-up verification plan

Store reports under:
- `docs/development/operations/reports/`

---

## Governance

- Platform lead owns cadence compliance.
- Service owners rotate as Incident Commander.
- Missed drill windows must be recovered within 2 weeks.
- Any failed critical drill control triggers a reliability action item in sprint planning.
