# Admin Documentation

Technical guides and references for platform administrators.

## Contents

| Document | Description |
|----------|-------------|
| [ADMIN_GUIDE.md](ADMIN_GUIDE.md) | Complete administrator guide for platform management |
| [USER_MANAGEMENT.md](USER_MANAGEMENT.md) | Detailed guide for managing users, roles, and permissions |
| [CONTENT_MODERATION.md](CONTENT_MODERATION.md) | Comprehensive content moderation guide and best practices |
| [HELPCENTER_SETUP.md](HELPCENTER_SETUP.md) | Help center configuration and management |
| [CLI_ADMIN_PANEL.md](CLI_ADMIN_PANEL.md) | CLI-first admin control panel — Phase D: lifecycle ops, RBAC, audit, scale/rollout, validation checks, incident analysis, metrics, alerts, policies, costs, compliance, recommendations |

## CLI Admin Panel (Phase D)

All admin CLI code lives in `admin-cli/` at the repository root.

```bash
node admin-cli/index.js --help          # full command reference
node admin-cli/index.js doctor          # toolchain + role + audit status
node admin-cli/index.js role            # inspect active role
node admin-cli/index.js audit           # view recent audit log entries
node admin-cli/index.js check all       # run release validation checks
node admin-cli/index.js metrics status  # view performance metrics (Phase D)
node admin-cli/index.js alerts list     # manage alert rules (Phase D)
node admin-cli/index.js costs summary   # view cost tracking (Phase D)
node admin-cli/index.js compliance status # check compliance (Phase D)
node admin-cli/index.js recommendations top # get optimization suggestions (Phase D)
node admin-cli/index.js scale --runtime k8s --service api-gateway --replicas 3 --wait
node admin-cli/index.js rollout --runtime k8s --strategy canary --service api-gateway
node admin-cli/index.js dashboard       # live operations dashboard (Phase D)
```

The CLI supports build/start/stop/status/logs across `direct`, `docker`, and `k8s` runtimes,
with role-based authorization, immutable audit trails, progressive delivery controls,
operational validation gates, AND advanced intelligence & governance features (Phase D):
- **Metrics tracking** for performance monitoring
- **Alert management** with custom rules and workflows
- **Policy-as-Code** for org-level enforcement
- **Cost analysis** with budgeting and optimization
- **Compliance auditing** with automated checks and scoring
- **Recommendations** engine for intelligent suggestions

For complete CLI documentation, see [CLI_ADMIN_PANEL.md](./CLI_ADMIN_PANEL.md).

## Admin Frontend

The admin frontend is a separate React application (port 3001) that provides:
- User management (ban, role changes)
- Content moderation and flag review
- Audit log viewer
- System statistics

**Starting Admin Frontend:**
```bash
# Admin frontend is opt-in via Docker Compose profile
docker compose --profile admin up admin_frontend
```

Set `ENABLE_ADMIN_FRONTEND=false` (default) or `true` in your `.env` to control whether the service is included.

## Admin API Endpoints

All admin API calls go through the API Gateway and require:
- Valid JWT with `admin` or `moderator` role
- `X-Admin-Secret` header matching `ADMIN_API_SECRET`

See [development/API.md](../development/API.md) for full API reference.
