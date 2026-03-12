# Secret Rotation Procedures — Milonexa Platform

**Document type:** Operational Runbook  
**Audience:** DevOps, Engineering Lead  
**Review cadence:** Quarterly

---

## Overview

This runbook documents how to rotate all platform secrets safely, with zero-downtime procedures for production.

---

## Secret Inventory

| Secret Name | K8s Secret Key | Used By | Rotation Frequency |
|-------------|---------------|---------|-------------------|
| `JWT_SECRET` | `milonexa-secrets/JWT_SECRET` | All services (token verification) | Quarterly |
| `ADMIN_SECRET` | `milonexa-secrets/ADMIN_SECRET` | api-gateway admin endpoints | Quarterly |
| `DATABASE_PASSWORD` | `milonexa-secrets/DATABASE_PASSWORD` | All DB-connected services | Bi-annually |
| `REDIS_PASSWORD` | `milonexa-secrets/REDIS_PASSWORD` | All cache-connected services | Bi-annually |
| `AWS_SECRET_ACCESS_KEY` | `milonexa-secrets/AWS_SECRET_ACCESS_KEY` | media-service | Quarterly |
| `SMTP_PASSWORD` | `milonexa-secrets/SMTP_PASSWORD` | user-service (email) | Annually |
| `ENCRYPTION_KEY` | `milonexa-secrets/ENCRYPTION_KEY` | user-service (data encryption) | Annually |
| `OAUTH_GITHUB_SECRET` | `milonexa-secrets/OAUTH_GITHUB_SECRET` | user-service (OAuth) | On revocation |
| `OAUTH_GOOGLE_SECRET` | `milonexa-secrets/OAUTH_GOOGLE_SECRET` | user-service (OAuth) | On revocation |

---

## Pre-Rotation Checklist

Before rotating any secret:

- [ ] Notify team that rotation is in progress (post in #ops-alerts channel)
- [ ] Verify Kubernetes backup is recent (< 24h) — `scripts/backup-restore.sh backup postgres`
- [ ] Confirm you have access to the K8s cluster: `kubectl cluster-info`
- [ ] Open the deployment runbook: `docs/deployment/DEPLOYMENT_RUNBOOK.md`
- [ ] Check current pod health: `kubectl get pods -n milonexa`

---

## JWT_SECRET Rotation (Zero-Downtime)

JWT rotation requires a **dual-secret window** to avoid invalidating active user sessions.

### Steps

1. **Generate new secret:**
   ```bash
   openssl rand -hex 64
   ```

2. **Enable dual-secret mode** — update `services/api-gateway/server.js` to accept both old and new JWT secrets during the transition window (24 hours):
   ```bash
   # In .env.production, add:
   JWT_SECRET_OLD=<current_value>
   JWT_SECRET=<new_value>
   ```

3. **Update K8s secret:**
   ```bash
   kubectl create secret generic milonexa-secrets \
     --from-literal=JWT_SECRET=<new_value> \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

4. **Rolling restart of all services:**
   ```bash
   kubectl rollout restart deployment/api-gateway -n milonexa
   kubectl rollout restart deployment/user-service -n milonexa
   # Wait for rollout:
   kubectl rollout status deployment/api-gateway -n milonexa
   ```

5. **Wait 24 hours** for existing tokens to expire or users to re-login.

6. **Remove `JWT_SECRET_OLD`** from secrets and restart again.

7. **Verify:** Test login + protected API call. Check error rate in Grafana stays flat.

---

## DATABASE_PASSWORD Rotation

⚠️ **Requires brief maintenance window** (< 5 min) unless your DB supports ALTER ROLE without interruption.

1. **Generate new password:**
   ```bash
   openssl rand -base64 32
   ```

2. **Change password in PostgreSQL:**
   ```bash
   kubectl exec -it $(kubectl get pod -l app=postgres -n milonexa -o name | head -1) -n milonexa -- \
     psql -U postgres -c "ALTER USER postgres PASSWORD '<new_password>';"
   ```

3. **Update K8s secret:**
   ```bash
   kubectl patch secret milonexa-secrets -n milonexa \
     --type='json' \
     -p='[{"op":"replace","path":"/data/DATABASE_PASSWORD","value":"'$(echo -n "<new_password>" | base64)'"}]'
   ```

4. **Rolling restart all DB-connected services:**
   ```bash
   for svc in user-service content-service messaging-service collaboration-service media-service shop-service; do
     kubectl rollout restart deployment/$svc -n milonexa
   done
   ```

5. **Verify** health endpoints are green.

---

## REDIS_PASSWORD Rotation

1. Update Redis config with new `requirepass` value via ConfigMap
2. Apply ConfigMap, then restart Redis pod
3. Update `milonexa-secrets/REDIS_PASSWORD`
4. Restart all services that use Redis

---

## ADMIN_SECRET Rotation

1. Generate: `openssl rand -hex 32`
2. Update K8s secret: `kubectl patch secret milonexa-secrets ...`
3. Restart `api-gateway` deployment
4. Update any scripts that use `ADMIN_SECRET` (e.g., `scripts/error-budget-report.sh`)

---

## AWS / Storage Keys Rotation

1. In AWS IAM: create new access key for the media-service IAM user
2. Update `milonexa-secrets/AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
3. Restart `media-service`
4. Verify uploads/downloads work
5. Delete old IAM access key in AWS console

---

## API Key Rotation (Gemini, SMTP, OAuth)

1. Generate/revoke the key in the provider's dashboard
2. Update the corresponding K8s secret
3. Restart only the affected service
4. Verify functionality (test an AI endpoint / send a test email / test OAuth login)

---

## Post-Rotation Verification

After any rotation:

```bash
# Check all pods are Running
kubectl get pods -n milonexa

# Test core health endpoints
curl https://milonexa.com/health
curl https://milonexa.com/api/user/health

# Check error rate (should stay flat)
# Open Grafana → Dashboard: "Milonexa Overview" → Error Rate panel

# Run smoke test
cd frontend && npm run test:e2e -- tests/smoke.spec.js
```

---

## Rotation Schedule

| Secret | Last Rotated | Next Due | Owner |
|--------|-------------|----------|-------|
| JWT_SECRET | March 2026 | June 2026 | Backend Lead |
| ADMIN_SECRET | March 2026 | June 2026 | DevOps |
| DATABASE_PASSWORD | March 2026 | September 2026 | DevOps |
| REDIS_PASSWORD | March 2026 | September 2026 | DevOps |
| AWS Keys | March 2026 | June 2026 | DevOps |
| SMTP_PASSWORD | March 2026 | March 2027 | Backend Lead |
| ENCRYPTION_KEY | March 2026 | March 2027 | Backend Lead |

---

## Emergency Rotation (Suspected Compromise)

If a secret is suspected compromised:

1. **Immediately revoke** the secret at the source (provider dashboard / PostgreSQL / Redis)
2. Generate and apply new secret (**do not wait** for maintenance window)
3. Force-restart all affected services
4. **Invalidate all active user sessions** (JWT: change secret immediately; sessions using it will expire)
5. Post incident in #security-incidents channel
6. Follow `docs/development/operations/INCIDENT_RESPONSE_RUNBOOK.md`
7. File a post-incident review within 72 hours

---

*Last updated: March 2026*
