# Milonexa Admin Panels — Complete Reference Guide

This document covers all four admin interface methods, explains how to enable/disable each via environment variables, and provides usage instructions for every panel.

---

## Overview: Four Admin Interface Methods

Milonexa provides **four independent admin interfaces**. Each can be enabled independently using environment variables.

| # | Interface | Access Method | Port | Toggle Env Var | Default |
|---|-----------|--------------|------|----------------|---------|
| 1 | **CLI Admin Panel** | Local terminal | — | Always on (local only) | ✅ always |
| 2 | **Admin Frontend** | Web browser | 3001 | `ENABLE_ADMIN_FRONTEND` | ❌ off |
| 3 | **Admin REST API** | HTTP/JSON | 8888 | `ENABLE_ADMIN_REST_API` | ❌ off |
| 4 | **SSH Admin Dashboard** | SSH terminal | 2222 | `ENABLE_ADMIN_SSH` | ❌ off |

> **CLI Admin Panel** runs directly from the filesystem and always works locally. It does not have an on/off toggle because it requires no server process — it only needs Node.js.

---

## Environment Variable Control

All admin panels (except CLI) are controlled by environment variables in your `.env` file. Copy `.env.example` to `.env` and set the values:

```bash
cp .env.example .env
```

### Master Toggle Variables

```env
# --- Admin Frontend (React Web UI) ---
ENABLE_ADMIN_FRONTEND=false        # Set true to enable

# --- Admin REST API Server ---
ENABLE_ADMIN_REST_API=false        # Set true to enable
ADMIN_API_KEY=your-secret-key      # REQUIRED when exposed beyond loopback

# --- Admin SSH Dashboard ---
ENABLE_ADMIN_SSH=false             # Set true to enable
ADMIN_SSH_PASSWORD=your-password   # For password authentication
```

### Enabling Multiple Panels

You can run any combination of panels simultaneously:

```bash
# Enable all three network-accessible panels
ENABLE_ADMIN_FRONTEND=true
ENABLE_ADMIN_REST_API=true
ENABLE_ADMIN_SSH=true
```

### Starting with Docker Compose Profiles

Each network panel has a corresponding Docker Compose profile:

```bash
# Admin Frontend only
docker compose --profile admin up -d

# Admin REST API only
docker compose --profile admin-api up -d

# Admin SSH Dashboard only
docker compose --profile admin-ssh up -d

# All admin panels at once
docker compose --profile admin --profile admin-api --profile admin-ssh up -d

# Check which services are running
docker compose ps
```

---

## 1) CLI Admin Panel

**Always available. No setup required.**

The CLI runs directly from the repository directory and accesses the filesystem. It works even when all services are stopped.

### Quick Start

```bash
node admin-cli/index.js --help              # Full command reference
node admin-cli/index.js doctor              # Health check
node admin-cli/index.js dashboard           # Live operations dashboard
node admin-cli/index.js tui                 # Interactive TUI (full-screen)
```

### Phase E Commands

```bash
# SLA Monitoring
node admin-cli/index.js sla status          # SLO compliance
node admin-cli/index.js sla predict         # Breach predictions
node admin-cli/index.js sla simulate        # Generate sample data

# Webhook Management
ADMIN_CLI_ROLE=operator node admin-cli/index.js webhooks add --type slack --name "Ops" --url https://...
ADMIN_CLI_ROLE=operator node admin-cli/index.js webhooks list
ADMIN_CLI_ROLE=operator node admin-cli/index.js webhooks fire --event alert --severity critical

# AI Remediation
node admin-cli/index.js remediate analyze   # Run AI analysis
node admin-cli/index.js remediate rules     # Show knowledge base

# Multi-Cluster Kubernetes
ADMIN_CLI_ROLE=operator node admin-cli/index.js cluster register --name prod-us --context gke_proj_us
ADMIN_CLI_ROLE=operator node admin-cli/index.js cluster status

# Trend Analysis
node admin-cli/index.js trends report
node admin-cli/index.js trends chart --category cpu
node admin-cli/index.js trends anomalies
```

### Role-Based Access

```bash
# Set role for privileged operations
ADMIN_CLI_ROLE=admin node admin-cli/index.js stop --runtime docker
ADMIN_CLI_ROLE=operator node admin-cli/index.js scale --service api-gateway --replicas 3
# Emergency override
ADMIN_CLI_ROLE=break-glass node admin-cli/index.js rollout --strategy rolling --service api-gateway
```

| Role | Permitted Actions |
|------|------------------|
| `viewer` | Read-only (status, logs, health, metrics, audit, sla, trends) |
| `operator` | + build, start/restart, scale/rollout in non-prod, webhooks, cluster read |
| `admin` | + stop, backup, prod scale/rollout, webhooks write, cluster write |
| `break-glass` | All commands — always flagged in audit log |

### State Location

All CLI state is stored in `.admin-cli/` (gitignored):

```
.admin-cli/
  audit.log           # Immutable audit trail
  role.json           # Active role configuration
  metrics/            # Recorded metrics
  alerts/             # Alert rules and history
  sla/                # SLO definitions and measurements
  webhooks/           # Webhook configurations
  clusters/           # Multi-cluster registry
  remediation/        # Remediation history
  compliance/         # Compliance check results
  costs/              # Cost tracking data
  ssh/                # SSH server state (host key)
```

---

## 2) Admin Frontend (React Web UI)

A full-featured React web application providing a graphical admin interface.

### Environment Variables

```env
ENABLE_ADMIN_FRONTEND=true
REACT_APP_ADMIN_SECRET=your-admin-secret     # Must match ADMIN_API_SECRET
REACT_APP_API_URL=http://localhost:8000       # API Gateway URL
REACT_APP_ADMIN_PORT=3001                    # Port (development only)
```

### Starting the Frontend

**With Docker Compose (recommended):**
```bash
docker compose --profile admin up admin_frontend
# Access: http://localhost:3001
```

**For local development:**
```bash
cd admin_frontend
npm install --legacy-peer-deps
npm start     # Starts on port 3001
```

### Login

1. Navigate to `http://localhost:3001`
2. Enter your admin credentials (from `ADMIN_MASTER_USERNAME` / `ADMIN_MASTER_PASSWORD`)
3. The default development login is `admin` / `admin123`

### Available Tabs

| Tab | Description |
|-----|-------------|
| Dashboard | System stats, user counts, recent activity |
| Users | User management (ban, role changes, flags) |
| Moderation | Content review queue |
| Audit Logs | Platform event history |
| Database | Table stats and schema info |
| System Logs | Application logs viewer |
| API Management | Rate limits and endpoints |
| Security | Auth events and suspicious activity |
| Settings | Platform configuration |
| SLA Monitor | SLO compliance + breach predictions (Phase E) |
| Webhooks | Add/remove/fire webhook integrations (Phase E) |
| AI Remediation | Guided remediation with step-by-step UX (Phase E) |
| Multi-Cluster | Kubernetes cluster registry (Phase E) |
| Trend Analysis | Charts, anomaly detection, forecasts (Phase E) |

### Security Notes

- Served on port 3001 (separate from main user frontend on 3000)
- Requires valid `REACT_APP_ADMIN_SECRET` for backend API calls
- Restricted by `ADMIN_ALLOWED_IPS` in production
- Enable `ENABLE_ADMIN_2FA=true` for two-factor auth enforcement

---

## 3) Admin REST API Server

A pure HTTP REST API that exposes all admin operations programmatically. Suitable for CI/CD pipelines, monitoring systems, and custom integrations.

### Environment Variables

```env
ENABLE_ADMIN_REST_API=true
ADMIN_API_PORT=8888                    # Default: 8888
ADMIN_API_KEY=your-strong-secret-key   # Required for non-loopback access
ADMIN_CORS_ORIGIN=http://localhost:3001  # CORS origin
ADMIN_ALLOWED_IPS=127.0.0.1,::1        # IP allowlist
```

### Starting the REST API Server

**With Docker Compose:**
```bash
ENABLE_ADMIN_REST_API=true docker compose --profile admin-api up admin-rest-api
```

**Standalone:**
```bash
ENABLE_ADMIN_REST_API=true ADMIN_API_KEY=secret node admin-cli/admin-server.js
# Runs on http://127.0.0.1:8888 by default
```

**Custom port:**
```bash
ENABLE_ADMIN_REST_API=true ADMIN_API_PORT=9090 ADMIN_API_HOST=0.0.0.0 ADMIN_API_KEY=secret node admin-cli/admin-server.js
```

### Authentication

All requests (except `/health`) require a Bearer token when `ADMIN_API_KEY` is set:

```bash
# Authenticated request
curl -H "Authorization: Bearer your-secret-key" http://localhost:8888/api/v1/dashboard

# Health check (no auth required)
curl http://localhost:8888/health
```

**Security rules:**
- No key set + loopback host (`127.0.0.1`) → unauthenticated local access allowed
- No key set + non-loopback host → all requests rejected with 401
- Key set → required on all protected endpoints

### API Reference

#### Health

```
GET /health
```
Returns `{ status: "ok", timestamp: "...", version: "5.0" }`

#### Dashboard

```
GET /api/v1/dashboard
```
Returns combined summary of metrics, alerts, compliance, budget, SLA, and webhooks.

#### Metrics

```
GET  /api/v1/metrics?category=cpu&service=api-gateway
POST /api/v1/metrics
     Body: { "category": "cpu", "value": 45.2, "service": "api-gateway", "unit": "percent" }
```

#### SLA / SLOs

```
GET  /api/v1/sla                     — Status of all SLOs
GET  /api/v1/sla/predict             — Breach predictions
POST /api/v1/sla/record              — Record measurement: { "sloId": "slo-api-uptime", "value": 99.95 }
POST /api/v1/sla/simulate            — Generate sample data: { "count": 10 }
```

#### Alerts

```
GET /api/v1/alerts
GET /api/v1/alerts/stats
```

#### Webhooks

```
GET    /api/v1/webhooks
POST   /api/v1/webhooks          — { "type": "slack", "name": "...", "url": "https://..." }
DELETE /api/v1/webhooks/:id?type=slack
POST   /api/v1/webhooks/fire     — { "eventType": "alert", "severity": "warning", "message": "..." }
GET    /api/v1/webhooks/history
```

#### Clusters

```
GET  /api/v1/clusters
POST /api/v1/clusters            — { "name": "prod-us", "context": "gke_...", "environment": "prod" }
GET  /api/v1/clusters/status
```

#### Trends

```
GET /api/v1/trends?category=cpu
GET /api/v1/trends/anomalies
```

#### AI Remediation

```
POST /api/v1/remediate           — Runs analysis, returns suggestions
GET  /api/v1/remediate/rules     — List knowledge base rules
```

#### Compliance, Costs, Recommendations, Audit

```
GET /api/v1/compliance
GET /api/v1/costs
GET /api/v1/recommendations?limit=10
GET /api/v1/audit?limit=50
```

### Example: CI/CD Integration

```bash
#!/bin/bash
# Check SLA before deploying

ADMIN_API="http://localhost:8888"
AUTH="-H 'Authorization: Bearer $ADMIN_API_KEY'"

# Check for SLA breaches
BREACHED=$(curl -s $AUTH "$ADMIN_API/api/v1/sla" | jq '.summary.breached')
if [ "$BREACHED" -gt "0" ]; then
  echo "❌ Deployment blocked: $BREACHED SLO(s) currently breached"
  exit 1
fi

# Record deployment metric
curl -s -X POST $AUTH -H "Content-Type: application/json" \
  -d '{"category":"deployment","value":1,"service":"api-gateway"}' \
  "$ADMIN_API/api/v1/metrics"

echo "✅ SLA check passed, deployment proceeding"
```

---

## 4) SSH Admin Dashboard

An encrypted SSH server providing an interactive admin dashboard and command shell. Ideal for secure remote administration, incident response, and operations teams who prefer terminal interfaces.

### Environment Variables

```env
ENABLE_ADMIN_SSH=true
ADMIN_SSH_PORT=2222                             # Default: 2222
ADMIN_SSH_HOST=127.0.0.1                        # Bind address (0.0.0.0 for network access)
ADMIN_SSH_PASSWORD=your-strong-password         # For password auth (leave empty to disable)
ADMIN_SSH_AUTHORIZED_KEYS=./admin-cli/ssh-keys/authorized_keys  # For key-based auth
ADMIN_SSH_MAX_SESSIONS=5                        # Max concurrent sessions
ADMIN_SSH_IDLE_TIMEOUT=300                      # Idle timeout in seconds
ADMIN_ALLOWED_IPS=127.0.0.1,::1                 # IP allowlist (comma-separated)
ADMIN_SSH_BANNER=Authorized Access Only         # Banner shown on connect
```

### Starting the SSH Server

**With Docker Compose:**
```bash
# Set env vars first
ENABLE_ADMIN_SSH=true ADMIN_SSH_PASSWORD=secret docker compose --profile admin-ssh up admin-ssh
```

**Standalone (development):**
```bash
ENABLE_ADMIN_SSH=true ADMIN_SSH_PASSWORD=mysecret node admin-cli/ssh-admin-server.js
# Access: ssh admin@127.0.0.1 -p 2222
```

**With public-key authentication:**
```bash
# Add your public key to the authorized_keys file
echo "ssh-rsa AAAA..." >> admin-cli/ssh-keys/authorized_keys

# Start server without password (key-only)
ENABLE_ADMIN_SSH=true ADMIN_SSH_AUTHORIZED_KEYS=./admin-cli/ssh-keys/authorized_keys \
  node admin-cli/ssh-admin-server.js
```

### Connecting

```bash
# Password authentication
ssh admin@localhost -p 2222

# With specific identity file (key auth)
ssh -i ~/.ssh/your_key admin@localhost -p 2222

# Disable host key checking for first connection (development only)
ssh -o StrictHostKeyChecking=no admin@localhost -p 2222

# Run a single command (non-interactive)
ssh admin@localhost -p 2222 "sla status"
ssh admin@localhost -p 2222 "audit 20"
```

### Host Key

The server auto-generates an RSA host key on first start and saves it to `.admin-cli/ssh/host_rsa`. This persists across restarts. To specify a custom key:

```bash
# Generate a key manually
ssh-keygen -t rsa -b 2048 -f ./admin-cli/ssh-keys/host_rsa -N ""
# Start with it
ADMIN_SSH_HOST_KEY_PATH=./admin-cli/ssh-keys/host_rsa ENABLE_ADMIN_SSH=true \
  ADMIN_SSH_PASSWORD=secret node admin-cli/ssh-admin-server.js
```

### Interactive Shell Commands

Once connected, you have an interactive shell with these commands:

| Command | Description |
|---------|-------------|
| `dashboard` | Refresh the full admin dashboard |
| `status` | Docker container status |
| `sla` | SLO compliance status |
| `sla predict` | Breach predictions |
| `sla simulate` | Generate sample measurements |
| `alerts` | Active alert stats |
| `alerts history` | Alert history |
| `metrics` | Metrics summary |
| `metrics record <cat> <value>` | Record a metric |
| `trends` | Trend analysis report |
| `trends anomalies` | Anomaly detection |
| `trends chart <category>` | ASCII line chart |
| `webhooks` | List configured webhooks |
| `webhooks fire` | Test fire all webhooks |
| `cluster` | List registered clusters |
| `remediate` | Run AI remediation analysis |
| `audit [N]` | Show last N audit log entries |
| `health` | Check API gateway health |
| `env` | Show active admin panel configuration |
| `clear` | Clear the screen |
| `exit` / `quit` | End SSH session |

### SSH Exec Mode (Non-Interactive)

Run a single command without opening an interactive session:

```bash
# Get SLA status as formatted output
ssh admin@localhost -p 2222 "sla"

# Run remediation and capture output
ssh admin@localhost -p 2222 "remediate" > /tmp/remediation-report.txt

# Quick health check
ssh admin@localhost -p 2222 "health"

# View recent audit entries
ssh admin@localhost -p 2222 "audit 50"

# Record a metric from a remote system
ssh admin@localhost -p 2222 "metrics record cpu 78.5 api-gateway"
```

### Security Model

- **Encrypted transport** — all traffic uses SSH protocol encryption
- **IP allowlist** — `ADMIN_ALLOWED_IPS` restricts which source IPs can connect
- **Auto-disconnect** — idle sessions disconnect after `ADMIN_SSH_IDLE_TIMEOUT` seconds
- **Max sessions** — `ADMIN_SSH_MAX_SESSIONS` limits concurrent connections (prevent brute force)
- **Audit logging** — every login, command, and logout is recorded in `.admin-cli/audit.log`
- **Loopback-only default** — binds to `127.0.0.1` unless `ADMIN_SSH_HOST=0.0.0.0` is set

---

## Security Best Practices

### For All Admin Panels

1. **Use strong secrets** — generate with `openssl rand -hex 32` or `openssl rand -base64 32`
2. **Set IP allowlists** — restrict `ADMIN_ALLOWED_IPS` to your admin IPs/ranges
3. **Bind to loopback** — default bindings are `127.0.0.1`; use SSH tunnels or VPN for remote access
4. **Rotate credentials** — rotate `ADMIN_API_KEY` and `ADMIN_SSH_PASSWORD` regularly

### For Production

```env
# Example production admin panel configuration
ENABLE_ADMIN_FRONTEND=true
ENABLE_ADMIN_REST_API=true
ENABLE_ADMIN_SSH=true

# Strong, unique keys (generate with openssl rand -hex 32)
ADMIN_API_KEY=<generated-64-char-hex>
ADMIN_SSH_PASSWORD=              # Leave empty — use keys only in production
ADMIN_SSH_AUTHORIZED_KEYS=/path/to/production/authorized_keys

# Restrict to VPN/internal IPs (applies to REST API and SSH ADMIN_ALLOWED_IPS)
ADMIN_ALLOWED_IPS=10.0.1.5,10.0.1.10

# 2FA
ENABLE_ADMIN_2FA=true
```

### SSH Tunnel for Remote REST API Access

Never expose the REST API port directly. Use an SSH tunnel:

```bash
# Tunnel: localhost:8888 → remote-server:8888
ssh -L 8888:127.0.0.1:8888 user@remote-server -N &
# Then access the API locally
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/dashboard
```

---

## Troubleshooting

### Admin Frontend won't load

```bash
# Check if container is running
docker compose ps admin_frontend

# Check logs
docker compose logs admin_frontend

# Verify environment variables
echo $ENABLE_ADMIN_FRONTEND
echo $REACT_APP_ADMIN_SECRET
```

### REST API returns 401

```bash
# Verify key matches
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/health

# Check if server is running
docker compose ps admin-rest-api
docker compose logs admin-rest-api
```

### SSH connection refused

```bash
# Verify server is running
docker compose ps admin-ssh
docker compose logs admin-ssh

# Test local connectivity
nc -zv 127.0.0.1 2222

# Check IP allowlist — your IP must be in ADMIN_ALLOWED_IPS
echo $ADMIN_ALLOWED_IPS
```

### SSH authentication failed

```bash
# For password auth: verify ADMIN_SSH_PASSWORD is set
echo $ADMIN_SSH_PASSWORD

# For key auth: verify your public key is in authorized_keys
cat admin-cli/ssh-keys/authorized_keys

# Test with verbose SSH output
ssh -v -p 2222 admin@localhost
```

### CLI commands fail

```bash
# Check role
node admin-cli/index.js role

# Set required role
export ADMIN_CLI_ROLE=admin

# Run doctor
node admin-cli/index.js doctor
```

---

## Quick Reference

### Start All Admin Panels

```bash
# 1. Set env vars
export ENABLE_ADMIN_FRONTEND=true
export ENABLE_ADMIN_REST_API=true
export ENABLE_ADMIN_SSH=true
export ADMIN_API_KEY=$(openssl rand -hex 32)
export ADMIN_SSH_PASSWORD=$(openssl rand -base64 18)

# 2. Start with Docker Compose
docker compose --profile admin --profile admin-api --profile admin-ssh up -d

# 3. Access:
# Web UI:    http://localhost:3001
# REST API:  http://localhost:8888/api/v1/dashboard (with ADMIN_API_KEY)
# SSH:       ssh admin@localhost -p 2222
# CLI:       node admin-cli/index.js --help
```

### Stop All Admin Panels

```bash
docker compose --profile admin --profile admin-api --profile admin-ssh down
```

### Disable a Panel Without Stopping the Container

Update the env var and restart:
```bash
# Disable REST API
ENABLE_ADMIN_REST_API=false docker compose --profile admin-api restart admin-rest-api

# Disable SSH
ENABLE_ADMIN_SSH=false docker compose --profile admin-ssh restart admin-ssh
```
