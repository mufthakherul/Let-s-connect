# 🔒 Security Operations

This guide covers all security-related operations for the Milonexa admin ecosystem.

---

## Security Service

**Port:** 9102  
The `security-service` backs all admin interfaces and handles admin authentication and JWT validation.

---

## Admin RBAC Roles

| Role | Permissions |
|------|-------------|
| `viewer` | Read-only: doctor, status, logs, health, audit, monitor |
| `operator` | + build, start/restart in non-production environments |
| `admin` | + stop, backup, start/restart in production/k8s |
| `break-glass` | Emergency override — skips all confirmations, always flagged in audit |

### Set Role
```bash
node admin-cli/index.js set-role operator
# or via env
export ADMIN_CLI_ROLE=admin
```

---

## Audit Log

All admin actions are logged immutably to `.admin-cli/audit.log`.

```bash
# View last 50 entries via CLI
node admin-cli/index.js audit --tail 50

# View via REST API
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  "http://localhost:8888/api/v1/audit?tail=50"
```

The web dashboard **AuditLogTable** panel provides a searchable, filterable UI view.

---

## GDPR Compliance

The `GDPRManager` (`admin/shared/gdpr.js`) provides data subject request support:

```bash
# Export user data (REST API)
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  http://localhost:8888/api/v1/gdpr/export/<userId>

# Delete user data (right to erasure)
curl -X DELETE -H "Authorization: Bearer $ADMIN_API_KEY" \
  http://localhost:8888/api/v1/gdpr/delete/<userId>
```

---

## Compliance Dashboard

The **ComplianceDashboard** panel in the web admin shows real-time status for:
- GDPR controls
- SOC2 requirements  
- HIPAA checklist items

---

## Break-Glass Procedure

Use only in genuine emergencies:

```bash
# Activate break-glass
node admin-cli/index.js set-role break-glass

# All subsequent commands skip confirmation prompts
# EVERY action is flagged in the audit log

# Reset after emergency
node admin-cli/index.js set-role admin
```

---

## Secrets Vault

`SecretsVault` (`admin/shared/secrets-vault.js`) provides encrypted storage for sensitive config:

```bash
# Rotate JWT secret
node admin-cli/index.js run secrets rotate --key JWT_SECRET

# All vault accesses are recorded in audit log
```

---

## mTLS (Service-to-Service)

`admin/shared/mtls.js` configures mutual TLS for the admin REST API server. Enable in production:

```
ADMIN_API_MTLS=true
ADMIN_API_CLIENT_CA=/certs/client-ca.pem
```

---

## IP Allowlists

Restrict admin interface access by IP:

```
# SSH Admin
ADMIN_ALLOWED_IPS=10.0.0.1,10.0.0.2

# REST API
ADMIN_API_ALLOWED_IPS=127.0.0.1,10.0.0.0/8
```

---

## Production Hardening Checklist

- [ ] Change all default passwords and secrets in `.env`
- [ ] Set `ADMIN_ALLOWED_IPS` for SSH and REST API
- [ ] Enable `ADMIN_SSH_RECORD_SESSIONS=true`
- [ ] Set `ADMIN_CLI_ROLE=operator` (not admin) for daily operations
- [ ] Enable mTLS for admin REST API
- [ ] Review audit log weekly
- [ ] Rotate `ADMIN_API_KEY`, `JWT_SECRET`, `ENCRYPTION_KEY` quarterly
- [ ] Keep `break-glass` role revoked until genuinely needed

[← Back to Admin README](./README.md)
