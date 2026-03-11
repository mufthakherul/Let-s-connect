# Admin Documentation

Technical guides and references for platform administrators.

## Contents

| Document | Description |
|----------|-------------|
| [ADMIN_GUIDE.md](ADMIN_GUIDE.md) | Complete administrator guide for platform management |
| [ADMIN_PANELS.md](ADMIN_PANELS.md) | **All four admin interfaces**: CLI, Frontend, REST API, SSH Dashboard — env vars, setup, usage |
| [USER_MANAGEMENT.md](USER_MANAGEMENT.md) | Detailed guide for managing users, roles, and permissions |
| [CONTENT_MODERATION.md](CONTENT_MODERATION.md) | Comprehensive content moderation guide and best practices |
| [HELPCENTER_SETUP.md](HELPCENTER_SETUP.md) | Help center configuration and management |
| [CLI_ADMIN_PANEL.md](CLI_ADMIN_PANEL.md) | CLI-first admin control panel — Phase E: TUI, webhooks, SLA, AI remediation, multi-cluster, trends |

## Admin Interface Methods (Phase E — 4 methods)

Milonexa provides **four admin interfaces** controlled via environment variables:

| Interface | Env Toggle | Port | Start Command |
|-----------|-----------|------|---------------|
| CLI Admin Panel | (always on locally) | — | `node admin-cli/index.js --help` |
| Admin Frontend (React UI) | `ENABLE_ADMIN_FRONTEND=true` | 3001 | `docker compose --profile admin up` |
| Admin REST API | `ENABLE_ADMIN_REST_API=true` | 8888 | `docker compose --profile admin-api up` |
| SSH Admin Dashboard | `ENABLE_ADMIN_SSH=true` | 2222 | `docker compose --profile admin-ssh up` |

See [ADMIN_PANELS.md](./ADMIN_PANELS.md) for the **complete guide** covering setup, authentication, usage, and security best practices for all four interfaces.

---

## CLI Admin Panel (Phase E)

All admin CLI code lives in `admin-cli/` at the repository root.

```bash
node admin-cli/index.js --help          # full command reference
node admin-cli/index.js doctor          # toolchain + role + audit status
node admin-cli/index.js tui             # interactive full-screen TUI dashboard
node admin-cli/index.js sla status      # SLO compliance (Phase E)
node admin-cli/index.js sla predict     # breach predictions (Phase E)
node admin-cli/index.js webhooks list   # webhook integrations (Phase E)
node admin-cli/index.js remediate analyze  # AI-assisted remediation (Phase E)
node admin-cli/index.js cluster list    # multi-cluster K8s management (Phase E)
node admin-cli/index.js trends report   # trend analysis & charts (Phase E)
node admin-cli/index.js dashboard       # live operations dashboard
node admin-cli/index.js scale --runtime k8s --service api-gateway --replicas 3 --wait
node admin-cli/index.js rollout --runtime k8s --strategy canary --service api-gateway
```

The CLI supports build/start/stop/status/logs across `direct`, `docker`, and `k8s` runtimes,
with role-based authorization, immutable audit trails, progressive delivery controls,
operational validation gates, AND advanced intelligence & governance features (Phase E):
- **TUI Dashboard** with real-time ASCII charts
- **Webhook integrations** (Slack, Teams, PagerDuty, GitHub)
- **SLA breach prediction** with linear regression forecasting
- **AI-assisted remediation** with 8 built-in rules + optional LLM
- **Multi-cluster K8s** management across regional deployments
- **Trend analysis** with sparklines, anomaly detection, forecasting

For complete CLI documentation, see [CLI_ADMIN_PANEL.md](./CLI_ADMIN_PANEL.md).


## Admin Frontend

The admin frontend is a separate React application (port 3001). Set `ENABLE_ADMIN_FRONTEND=true` in `.env` to enable.

```bash
docker compose --profile admin up admin_frontend
# Access: http://localhost:3001
```

## Admin REST API (Phase E)

HTTP REST API on port 8888. Set `ENABLE_ADMIN_REST_API=true` in `.env` to enable.

```bash
docker compose --profile admin-api up admin-rest-api
# Access: http://localhost:8888/api/v1/dashboard
# Auth: Authorization: Bearer $ADMIN_API_KEY
```

## SSH Admin Dashboard (Phase E)

Encrypted SSH-based interactive admin dashboard. Set `ENABLE_ADMIN_SSH=true` in `.env` to enable.

```bash
docker compose --profile admin-ssh up admin-ssh
# Access: ssh admin@localhost -p 2222
```

## Admin API Endpoints (Gateway)

All admin API calls through the API Gateway require:
- Valid JWT with `admin` or `moderator` role
- `X-Admin-Secret` header matching `ADMIN_API_SECRET`

See [development/API.md](../development/API.md) for full API reference.
