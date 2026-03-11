# Admin Documentation

Technical guides and references for platform administrators.

## Contents

| Document | Description |
|----------|-------------|
| [ADMIN_GUIDE.md](ADMIN_GUIDE.md) | Complete administrator guide for platform management |
| [USER_MANAGEMENT.md](USER_MANAGEMENT.md) | Detailed guide for managing users, roles, and permissions |
| [CONTENT_MODERATION.md](CONTENT_MODERATION.md) | Comprehensive content moderation guide and best practices |
| [HELPCENTER_SETUP.md](HELPCENTER_SETUP.md) | Help center configuration and management |
| [CLI_ADMIN_PANEL.md](CLI_ADMIN_PANEL.md) | CLI-first admin control panel — Phase 1+2: lifecycle ops, RBAC, audit log, production safety |

## CLI Admin Panel (Phase 1+2)

All admin CLI code lives in `admin-cli/` at the repository root.

```bash
node admin-cli/index.js --help          # full command reference
node admin-cli/index.js doctor          # toolchain + role + audit status
node admin-cli/index.js set-role --show # inspect active role
node admin-cli/index.js audit           # view recent audit log entries
```

The CLI supports build/start/stop/status/logs across `direct`, `docker`, and `k8s` runtimes,
with role-based authorization and an immutable audit trail for production operations.

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
