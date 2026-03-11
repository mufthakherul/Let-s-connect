# CLI Admin Control Panel (Phase 1+2)

Unified CLI-first administrative control plane for Milonexa.
All admin code and scripts live in the `admin-cli/` directory at the repository root.

> Entry command:
> `node admin-cli/index.js`

The CLI works whether or not the web admin frontend is running.

---

## Phase 1 — Operational control

- Multi-runtime lifecycle management (`direct`, `docker`, `k8s`)
- Commands: `build`, `start`, `stop`, `restart`, `status`, `logs`
- Operational wrappers: `health`, `backup`, `monitor` (cache / error-budget / drift / release-health)
- Direct-mode process manager with PID tracking and per-component log files
- Service aliases and `--admin` / `--all` selectors

## Phase 2 — Authorization, audit, and production safety

- **Role-based access control** (`viewer` → `operator` → `admin` → `break-glass`)
- **Immutable audit log** — every command is recorded to `.admin-cli/audit.log` (NDJSON)
- **Production confirmation** — write commands targeting `--env prod` or `--runtime k8s` require
  typing `CONFIRM` unless `--dry-run` or `--confirm` (CI mode) is passed
- **break-glass role** — emergency override; skips confirmation but always flagged in audit
- **Secret redaction** — sensitive keys are redacted in audit output
- New commands: `audit`, `set-role`

---

## Directory layout

```
admin-cli/
  index.js          Main CLI entrypoint (Phase 1+2)
  package.json      Package metadata and convenience npm scripts
  lib/
    auth.js         RBAC — role resolution and command authorization
    audit.js        Immutable NDJSON audit log writer and viewer
    confirm.js      Production confirmation prompts and safety policies
```

Runtime state (not committed):
```
.admin-cli/
  direct-processes.json   Direct-mode PID tracker
  role.json               Persisted role (written by set-role)
  audit.log               Append-only NDJSON audit trail
  logs/                   Per-component stdout/stderr log files
```

---

## Quick start

### 1) Toolchain check and role status

```bash
node admin-cli/index.js doctor
```

### 2) Set your role

```bash
node admin-cli/index.js set-role operator   # persist to .admin-cli/role.json
node admin-cli/index.js set-role --show     # inspect current role and source
# Or use an environment variable for one-off commands:
ADMIN_CLI_ROLE=admin node admin-cli/index.js stop --runtime docker
```

### 3) Docker dev build/start

```bash
node admin-cli/index.js build --runtime docker --env dev --admin
node admin-cli/index.js start --runtime docker --env dev --admin
node admin-cli/index.js status --runtime docker
```

### 4) Tail gateway logs

```bash
node admin-cli/index.js logs --runtime docker --service api-gateway --follow --tail 100
```

### 5) Health check

```bash
node admin-cli/index.js health --gateway http://localhost:8000
```

### 6) Backups

```bash
node admin-cli/index.js backup backup all
node admin-cli/index.js backup list all
```

### 7) Direct mode (local processes)

```bash
node admin-cli/index.js start --runtime direct --install --admin
node admin-cli/index.js status --runtime direct
node admin-cli/index.js stop  --runtime direct
```

### 8) Production (k8s) — requires admin role + CONFIRM

```bash
# Preview first:
node admin-cli/index.js start --runtime k8s --env prod --dry-run
# Then execute (will prompt for CONFIRM):
ADMIN_CLI_ROLE=admin node admin-cli/index.js start --runtime k8s --env prod
# Non-interactive / CI:
ADMIN_CLI_ROLE=admin node admin-cli/index.js start --runtime k8s --env prod --confirm
```

### 9) Audit log

```bash
node admin-cli/index.js audit             # last 50 entries
node admin-cli/index.js audit --tail 100  # last 100
node admin-cli/index.js audit --json      # raw NDJSON
```

---

## Role reference

| Role | Commands allowed |
|---|---|
| `viewer` | doctor, status, logs, health, audit, monitor, run |
| `operator` | + build, start (non-prod), restart (non-prod) |
| `admin` | + stop, backup, start/restart in prod/k8s |
| `break-glass` | All commands, no prompts, always flagged in audit |

Default role when nothing is configured: **operator**.

---

## Runtime behavior

### Direct
- Starts each component as a detached child process.
- PID tracking and log capture under `.admin-cli/`.

### Docker
- Wraps `docker compose`; supports `--env` for env-file selection and `--admin` for profile.

### Kubernetes
- Applies manifests from `k8s/` in a safe ordered sequence.
- Stop scales workloads to 0 replicas (namespace-scoped).

---

## Command reference

```
doctor    build    start    stop    restart    status    logs
health    backup   monitor  run     audit      set-role
```

Full flag list:

```bash
node admin-cli/index.js --help
```

---

## Safety notes

- Always run `--dry-run` before a production write operation to preview commands.
- Production-scoped commands prompt for `CONFIRM` — type exactly that to proceed.
- Pass `--confirm` to suppress the prompt in automated pipelines (CI/CD).
- `break-glass` role is always recorded with a flag in the audit log.
- Secrets in option values (keys containing `password`, `token`, `secret`, etc.) are redacted in audit entries.

---

## Next planned phases

- **Phase 3:** `scale` and `rollout` commands, integrated drift/release-gate checks
- **Phase 4:** AI-assisted incident summarization from logs/metrics
- **Phase 5:** TUI dashboard mode, optional browser-based GUI
