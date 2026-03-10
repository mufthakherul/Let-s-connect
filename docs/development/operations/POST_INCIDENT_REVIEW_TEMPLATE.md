# Post-Incident Review (PIR) Template

**Complete within 48 hours of incident resolution.**

---

## 1) Incident Summary

- **Incident ID:**
- **Date/Time (UTC):**
- **Severity:** SEV-1 / SEV-2 / SEV-3 / SEV-4
- **Primary Service(s):**
- **Incident Commander:**
- **Status:** Resolved / Monitoring / Follow-up open

---

## 2) Customer & Business Impact

- **User impact:** (what users experienced)
- **Affected flows:** (auth/feed/chat/upload/etc.)
- **Duration:**
- **Estimated impacted users/requests:**
- **Business impact:**

---

## 3) Timeline (UTC)

| Time | Event |
|---|---|
|  | Detection |
|  | Incident declared |
|  | Mitigation started |
|  | Recovery confirmed |
|  | Incident closed |

---

## 4) Root Cause Analysis

- **Primary root cause:**
- **Contributing factors:**
- **Why existing controls did not prevent it:**
- **Detection gap(s):**

Use 5-whys or causal chain analysis where possible.

---

## 5) What Went Well / Poorly

### Went well
- 

### Needs improvement
- 

---

## 6) Corrective Actions

| Action | Owner | Priority | Due Date | Status |
|---|---|---|---|---|
|  |  | P0/P1/P2 |  | Open |

Required categories:
- [ ] Prevention (code/config/architecture)
- [ ] Detection (alerts/observability)
- [ ] Response (runbook/process)
- [ ] Recovery (rollback/backup/drill)

---

## 7) Error Budget Impact

- **SLO impacted:**
- **Estimated budget consumed:**
- **Current monthly budget remaining:**
- **Policy action triggered:** feature freeze / approval gate / none

---

## 8) Sign-off

- **Service Owner:**
- **Platform/SRE:**
- **Security (if applicable):**
- **Product/Operations:**

---

## 9) References

- Incident channel/ticket:
- Alert links:
- Dashboard links:
- Relevant commits/deployments:
