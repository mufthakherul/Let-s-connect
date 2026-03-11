# CLI Admin Control Panel (Phase D)

Unified CLI-first administrative control plane for Milonexa.
All admin CLI code lives in `admin-cli/` at the repository root.

> Entry command:
> `node admin-cli/index.js`

The CLI is designed to remain fully operational even when the web admin frontend is down.

---

## Implemented capabilities

### Phase 1 — Multi-runtime operations

- Runtime adapters: `direct`, `docker`, `k8s`
- Service lifecycle commands: `build`, `start`, `stop`, `restart`, `status`, `logs`
- Operational wrappers: `health`, `backup`, `monitor`, `run`
- Direct-mode process manager with PID/state tracking and local log files

### Phase 2 — Governance and safety

- Role-based access control (`viewer` → `operator` → `admin` → `break-glass`)
- Append-only audit trail in `.admin-cli/audit.log` (NDJSON)
- Production confirmation gates (`CONFIRM`) for mutating prod/k8s operations
- Sensitive option redaction in audit records
- Role management/inspection commands: `role`, `set-role`, `audit`

### Phase 3 — Progressive delivery and validation

- `scale` command for Docker Compose and Kubernetes workloads
- `rollout` strategies for Kubernetes:
  - `rolling`
  - `canary` (with release-gate health check + optional auto-rollback)
  - `bluegreen` (validation-first)
  - `status`
  - `undo`
- `check` suite command:
  - `drift`
  - `release-gate`
  - `image-tags`
  - `bluegreen`
  - `all`

### Phase 4 — Incident intelligence

- `incident summarize` command for log-based incident triage across runtimes
- Signal extraction for errors, warnings, latency hints
- Top-signature clustering and actionable recommendations
- JSON and optional export file output

### Phase D — Advanced Intelligence & Governance

- **Metrics tracking** (`metrics` command):
  - Time-series metrics collection (CPU, memory, latency, throughput, errors)
  - Aggregation and statistical analysis (min, max, avg, percentiles)
  - Anomaly detection with configurable thresholds
  - Service and runtime-specific tracking

- **Alert management** (`alerts` command):
  - Pluggable alert rule definitions (metric-based, pattern-based, custom)
  - Alert triggering and history tracking
  - Alert acknowledgment and resolution workflows
  - Severity-based alerting (info, warning, critical)

- **Policy-as-Code engine** (`policies` command):
  - Custom RBAC extensions via YAML/JSON policy files
  - Operational policy enforcement (deployment strategies, scaling limits)
  - Compliance policy definitions
  - Cost control policy rules
  - Real-time policy evaluation for authorization decisions

- **Cost analysis & budgeting** (`costs` command):
  - Granular cost tracking by service and resource type
  - Monthly budget management with alerts
  - Cost optimization recommendations
  - Historical data aggregation and forecasting
  - Resource right-sizing suggestions

- **Compliance auditing** (`compliance` command):
  - Compliance check framework (security, governance, reliability)
  - Automated compliance scoring
  - Detailed compliance reports with remediation guidance
  - Periodic audit report generation and export
  - Certification-ready compliance documentation

- **Recommendations intelligence** (`recommendations` command):
  - Pattern-based optimization suggestions
  - Resource utilization analysis
  - Cost-saving opportunities
  - Best-practice recommendations
  - Recommendation scoring and prioritization
  - Implementation tracking (pending → implemented → dismissed)

- **Operations dashboard** (`dashboard` command):
  - Real-time overview of metrics, alerts, compliance, budget
  - Multi-runtime status aggregation
  - System health snapshot
  - Quick access to detailed commands

---

## Directory layout

```
admin-cli/
  index.js          Main CLI entrypoint (Phase D)
  package.json      Package metadata and convenience scripts
  lib/
    auth.js         RBAC policy and role resolution
    audit.js        Audit writer/viewer (NDJSON)
    confirm.js      Confirmation and production safety logic
    metrics.js      (Phase D) Time-series metrics collection
    alerts.js       (Phase D) Alert rule and history management
    policies.js     (Phase D) Policy-as-code engine
    cost-analyzer.js (Phase D) Cost tracking and budgeting
    compliance.js   (Phase D) Compliance auditing framework
    recommendations.js (Phase D) Intelligence engine
```

Runtime state (ignored from git):

```
.admin-cli/
  direct-processes.json   Direct-mode PID tracker
  role.json               Persisted active role
  audit.log               Append-only audit records
  logs/                   Per-component stdout/stderr log files
  metrics/                Time-series metrics data
  alerts/                 Alert rule definitions and history
  policies/               Custom policy-as-code files
  costs/                  Cost records and budgets
  compliance/             Compliance check results
  recommendations/        Recommendation history
```

---

## Quick start

### 1) Doctor checks

```bash
node admin-cli/index.js doctor
node admin-cli/index.js doctor --json
```

### 2) Role inspection and role change

```bash
node admin-cli/index.js role
node admin-cli/index.js role --json

# Admin-only role change:
ADMIN_CLI_ROLE=admin node admin-cli/index.js set-role operator

# Alias for viewing role details:
node admin-cli/index.js set-role --show
```

### 3) Build/start in Docker dev

```bash
node admin-cli/index.js build --runtime docker --env dev --admin
node admin-cli/index.js start --runtime docker --env dev --admin
node admin-cli/index.js status --runtime docker
```

### 4) Scale workloads

```bash
node admin-cli/index.js scale --runtime docker --service api-gateway --replicas 2
ADMIN_CLI_ROLE=admin node admin-cli/index.js scale --runtime k8s --service api-gateway --replicas 3 --wait
```

### 5) Rollout workflows

```bash
# Rolling restart
ADMIN_CLI_ROLE=admin node admin-cli/index.js rollout --runtime k8s --strategy rolling --service api-gateway --wait

# Canary with gate checks
ADMIN_CLI_ROLE=admin node admin-cli/index.js rollout --runtime k8s --strategy canary --service api-gateway --wait

# Blue/green pre-switch validation
ADMIN_CLI_ROLE=admin node admin-cli/index.js rollout --runtime k8s --strategy bluegreen --target green

# Rollback
ADMIN_CLI_ROLE=admin node admin-cli/index.js rollout --runtime k8s --strategy undo --service api-gateway
```

### 6) Validation checks

```bash
node admin-cli/index.js check all --env staging --namespace milonexa
node admin-cli/index.js check release-gate --gateway http://localhost:8000 --prometheus http://localhost:9090
node admin-cli/index.js check image-tags --service user-service --tag v1.2.3
node admin-cli/index.js check all --json
```

### 7) Phase D — Metrics, alerts, costs, compliance

```bash
# View metrics (all roles can access)
node admin-cli/index.js metrics status --service api-gateway
node admin-cli/index.js metrics status --category memory --json

# Alert management
node admin-cli/index.js alerts list --json
node admin-cli/index.js alerts history --status active
ADMIN_CLI_ROLE=operator node admin-cli/index.js alerts acknowledge <alert-id>

# Cost tracking
node admin-cli/index.js costs summary --json
ADMIN_CLI_ROLE=admin node admin-cli/index.js costs budget
node admin-cli/index.js costs optimize

# Compliance auditing
node admin-cli/index.js compliance status --json
ADMIN_CLI_ROLE=admin node admin-cli/index.js compliance report --format detailed

# Optimization recommendations
node admin-cli/index.js recommendations top --limit 10
node admin-cli/index.js recommendations top --json

# Live dashboard
node admin-cli/index.js dashboard --interval 5
node admin-cli/index.js dashboard --json
```

### 8) Incident summarization

```bash
node admin-cli/index.js incident summarize --runtime docker --service api-gateway --since 2h --tail 1200
node admin-cli/index.js incident summarize --runtime k8s --namespace milonexa --service user-service --json
node admin-cli/index.js incident summarize --runtime docker --service api-gateway --export .admin-cli/incidents/api-gw-latest.json
```

---

## Role reference

| Role | Commands allowed |
|---|---|
| `viewer` | doctor, role, status, logs, health, check, audit, monitor, run, incident, **metrics, alerts, compliance, recommendations, dashboard** |
| `operator` | + build, start/restart, scale/rollout in non-prod, **+ alerts acknowledge, metrics record** |
| `admin` | + stop, backup, scale/rollout/start/restart in prod/k8s, **+ policies, costs, compliance report, dashboard full** |
| `break-glass` | all commands, confirmation bypass, always flagged in audit |

Default role when not configured: **operator**.

---

## Command reference

```
doctor       role         set-role     audit
build        start        stop         restart      status       logs
scale        rollout      check        incident
health       backup       monitor      run
metrics      alerts       policies     costs        compliance   recommendations    dashboard
```

Full flag reference:

```bash
node admin-cli/index.js --help
```

---

## Safety notes

- Run `--dry-run` first for production-impacting commands.
- Mutating prod/k8s operations enforce confirmation unless `--confirm` is explicitly passed.
- `break-glass` usage is always visible in audit records.
- `check` should be run as a gate before canary promotion and production rollouts.
- For automation pipelines, prefer JSON mode (`--json`) for machine parsing.
- Phase D commands (metrics, costs, compliance) maintain 10k+ historical records; use filters to keep performance optimal.

---

## Phase D Intelligence Features

### Metrics Tracking Best Practices
1. Record baseline metrics for all services during normal operations
2. Use anomaly detection to identify performance degradation
3. Set up custom metric recording for business KPIs
4. Track percentiles (p50, p95, p99) for latency monitoring

### Alert Management Workflow
1. Start with default alert rules (CPU, memory, error rate)
2. Test rules in non-prod environments first
3. Gradually tune thresholds based on historical baselines
4. Use alert history to identify recurring issues
5. Automate acknowledgment for predictable patterns

### Policy-as-Code Setup
1. Define org-level policies for production safety
2. Use conditions to match services, environments, roles
3. Enforce production-only strategies (canary, bluegreen)
4. Combine RBAC, operational, and compliance policies
5. Review policies quarterly for alignment with org goals

### Cost Optimization Cycle
1. Track real costs via cost records
2. Monthly budget review and adjustment
3. Identify over-provisioned services (high cost vs usage)
4. Implement recommendations (right-sizing, reserved capacity)
5. Measure impact and iterate

### Compliance Continuous Auditing
1. Run compliance checks monthly (or more frequently)
2. Generate detailed reports quarterly
3. Track remediation of failed checks
4. Maintain compliance score trend (should improve over time)
5. Export reports for external audits or certifications

### Recommendation-Driven Operations
1. Review top recommendations weekly
2. Prioritize by impact/effort score
3. Implement quick wins first (low effort, high impact)
4. Track implementation status
5. Re-run analysis periodically to discover new opportunities

---

## Next roadmap items (Phase E+)

- **Interactive TUI** for full-screen operator console
- **Advanced visualization** (charts, graphs, trends)
- **Webhook integrations** (Slack, Teams, PagerDuty, GitHub)
- **LLM-assisted remediation** with AI-powered suggestions
- **Multi-cluster management** across regional Kubernetes deployments
- **Resource capacity planning** with forecasting
- **SLA breach prediction** and proactive remediation


### 3) Build/start in Docker dev

```bash
node admin-cli/index.js build --runtime docker --env dev --admin
node admin-cli/index.js start --runtime docker --env dev --admin
node admin-cli/index.js status --runtime docker
```

### 4) Scale workloads

```bash
node admin-cli/index.js scale --runtime docker --service api-gateway --replicas 2
ADMIN_CLI_ROLE=admin node admin-cli/index.js scale --runtime k8s --service api-gateway --replicas 3 --wait
```

### 5) Rollout workflows

```bash
# Rolling restart
ADMIN_CLI_ROLE=admin node admin-cli/index.js rollout --runtime k8s --strategy rolling --service api-gateway --wait

# Canary with gate checks
ADMIN_CLI_ROLE=admin node admin-cli/index.js rollout --runtime k8s --strategy canary --service api-gateway --wait

# Blue/green pre-switch validation
ADMIN_CLI_ROLE=admin node admin-cli/index.js rollout --runtime k8s --strategy bluegreen --target green

# Rollback
ADMIN_CLI_ROLE=admin node admin-cli/index.js rollout --runtime k8s --strategy undo --service api-gateway
```

### 6) Validation checks

```bash
node admin-cli/index.js check all --env staging --namespace milonexa
node admin-cli/index.js check release-gate --gateway http://localhost:8000 --prometheus http://localhost:9090
node admin-cli/index.js check image-tags --service user-service --tag v1.2.3
node admin-cli/index.js check all --json
```

### 7) Incident summarization

```bash
node admin-cli/index.js incident summarize --runtime docker --service api-gateway --since 2h --tail 1200
node admin-cli/index.js incident summarize --runtime k8s --namespace milonexa --service user-service --json
node admin-cli/index.js incident summarize --runtime docker --service api-gateway --export .admin-cli/incidents/api-gw-latest.json
```

---

## Role reference

| Role | Commands allowed |
|---|---|
| `viewer` | doctor, role, status, logs, health, check, audit, monitor, run, incident |
| `operator` | + build, start/restart, scale/rollout in non-prod |
| `admin` | + stop, backup, scale/rollout/start/restart in prod/k8s |
| `break-glass` | all commands, confirmation bypass, always flagged in audit |

Default role when not configured: **operator**.

---

## Command reference

```
doctor   role    set-role   audit
build    start   stop       restart   status   logs
scale    rollout check      incident
health   backup  monitor    run
```

Full flag reference:

```bash
node admin-cli/index.js --help
```

---

## Safety notes

- Run `--dry-run` first for production-impacting commands.
- Mutating prod/k8s operations enforce confirmation unless `--confirm` is explicitly passed.
- `break-glass` usage is always visible in audit records.
- `check` should be run as a gate before canary promotion and production rollouts.
- For automation pipelines, prefer JSON mode (`--json`) for machine parsing.

---

## Next roadmap items

- TUI operations dashboard (`admin-cli tui`)
- Pluggable policy-as-code hooks for custom org controls
- Optional LLM-assisted guided remediation flow from failed checks
