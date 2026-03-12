# 🛠️ Admin Guide

Complete documentation for all Milonexa admin interfaces. This guide covers everything you need to administer the Milonexa platform, manage users, moderate content, monitor system health, and configure platform-wide settings.

## The 8 Admin Interfaces

| Interface | Access | Description |
|-----------|--------|-------------|
| [Web Dashboard](./WEB_DASHBOARD.md) | Browser :3001 | React admin panel with 30+ tabs |
| [CLI](./CLI_GUIDE.md) | Terminal | Node.js omni admin CLI tool |
| [SSH TUI](./SSH_TUI.md) | ssh admin@host -p 2222 | Terminal UI dashboard over SSH |
| [REST API](./REST_API.md) | HTTP :8888 | Programmatic admin REST API |
| [AI Agent](./AI_AGENT.md) | Autonomous | AI-driven admin automation |
| [Bots](./BOTS.md) | Slack/Telegram/Teams | Chat-based admin commands |
| [Webhooks](./WEBHOOKS.md) | HTTP callbacks | Event-driven notifications |
| [Email](./EMAIL_ADMIN.md) | Email | Admin commands via email |

## Overview Sections

| Document | Description |
|----------|-------------|
| [OVERVIEW.md](./OVERVIEW.md) | Admin system overview and setup |
| [USER_MANAGEMENT.md](./USER_MANAGEMENT.md) | Managing users, roles, banning |
| [CONTENT_MODERATION.md](./CONTENT_MODERATION.md) | Content moderation tools |
| [SECURITY_OPERATIONS.md](./SECURITY_OPERATIONS.md) | Security and compliance |
| [MONITORING.md](./MONITORING.md) | Metrics and observability |
| [FEATURE_FLAGS.md](./FEATURE_FLAGS.md) | Feature flag management |

## Quick Start — Admin Access

1. Start with admin profile: `docker compose --profile admin up -d`
2. Web dashboard: http://localhost:3001
3. CLI: `cd admin/cli && node index.js`
4. SSH TUI: `ssh admin@localhost -p 2222`
5. REST API: http://localhost:8888/api/v1 (see [REST API docs](./REST_API.md))

## Admin Security Overview

All admin interfaces are secured by the security-service running on port 9102. The security-service validates:
- JWT tokens for all REST API and Web Dashboard access
- SSH credentials for terminal access
- API key authentication for programmatic access
- Email verification tokens for email-based admin commands

Admin credentials are stored in a separate admin database with additional encryption and are never stored in the main application database.

## Key Admin Concepts

### RBAC Roles
The Milonexa admin system uses Role-Based Access Control (RBAC) with four levels:
- **Viewer**: Read-only access to all dashboards and reports
- **Operator**: Can execute safe operations (ban users, flag content, acknowledge alerts)
- **Admin**: Full access to all features including dangerous operations
- **Break-Glass**: Emergency override access for critical incidents (requires dual approval)

### Admin Account Creation
The first admin account is created during platform initialization:
```bash
docker exec milonexa-api-gateway node admin/create-admin.js --username admin --email admin@milonexa.local --password <secure-password>
```

Subsequent admin accounts are created via the Web Dashboard (Admins tab) by existing admins.

### Authentication Flow
1. Admin submits credentials (username/password or OAuth)
2. Security-service validates credentials against admin database
3. JWT token issued (expires in 30 minutes)
4. Optional 2FA verification if enabled on account
5. Token used for all subsequent admin API calls
6. All admin actions are immutably logged to audit trail

## Related Documentation

- [Platform Overview](../README.md)
- [Deployment Guide](../deployment/README.md)
- [Development Guide](../development/README.md)

---

Last Updated: 2024 | Milonexa Platform Documentation
