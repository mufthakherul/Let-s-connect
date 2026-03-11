# CLI Admin Control Panel (Phase 3+)

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

### Phase 4 (starter) — Incident intelligence

- `incident summarize` command for log-based incident triage across runtimes
- Signal extraction for errors, warnings, latency hints
- Top-signature clustering and actionable recommendations
- JSON and optional export file output

---

## Directory layout

```
admin-cli/
  index.js          Main CLI entrypoint (Phase 3+)
  package.json      Package metadata and convenience scripts
  lib/
    auth.js         RBAC policy and role resolution
    audit.js        Audit writer/viewer (NDJSON)
    confirm.js      Confirmation and production safety logic
```

Runtime state (ignored from git):

```
.admin-cli/
  direct-processes.json   Direct-mode PID tracker
  role.json               Persisted active role
  audit.log               Append-only audit records
  logs/                   Per-component stdout/stderr log files
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
