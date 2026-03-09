# Admin Documentation

Technical guides and references for platform administrators.

## Contents

| Document | Description |
|----------|-------------|
| [HELPCENTER_SETUP.md](HELPCENTER_SETUP.md) | Help center configuration and management |

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
