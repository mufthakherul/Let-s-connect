# Production Hardening Checklist

This document provides a comprehensive checklist for deploying Milonexa in production. Work through every item before going live.

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Required Secrets & Credentials](#2-required-secrets--credentials)
3. [Database Hardening](#3-database-hardening)
4. [TLS & HTTPS](#4-tls--https)
5. [CORS & API Security](#5-cors--api-security)
6. [Rate Limiting](#6-rate-limiting)
7. [Admin Interface Security](#7-admin-interface-security)
8. [Firewall & Network Rules](#8-firewall--network-rules)
9. [Monitoring & Alerting](#9-monitoring--alerting)
10. [Backup Strategy](#10-backup-strategy)
11. [Log Management](#11-log-management)
12. [Performance Tuning](#12-performance-tuning)
13. [Security Scanning](#13-security-scanning)
14. [Admin Panel Deployment](#14-admin-panel-deployment)
15. [Post-Deployment Verification](#15-post-deployment-verification)

---

## 1. Pre-Deployment Checklist

### Environment

- [ ] `NODE_ENV=production` is set on all services
- [ ] `DB_SCHEMA_MODE=migrate` — **never** `force` or `alter` in production
- [ ] `FRONTEND_URL` is set to your production domain (e.g. `https://milonexa.com`)
- [ ] `CORS_ORIGINS` contains only your production frontend domains
- [ ] All services pass their `/health` endpoint checks
- [ ] Docker images are built from a tagged release commit (not from `develop`)

### Dependencies

- [ ] `npm ci` (not `npm install`) used in Docker builds — ensures lockfile is respected
- [ ] No `devDependencies` included in production Docker images
- [ ] All `package-lock.json` files are committed and up to date

### Infrastructure

- [ ] PostgreSQL 15 running with adequate disk space (at least 20 GB free)
- [ ] Redis 7 running with `maxmemory-policy` configured (`allkeys-lru` recommended)
- [ ] MinIO running with TLS or behind HTTPS proxy
- [ ] Elasticsearch running with security enabled (X-Pack)

---

## 2. Required Secrets & Credentials

> **All of the following MUST be changed from any default or example value before production deployment. Failure to do so is a critical security vulnerability.**

### Generating Strong Secrets

```bash
# For JWT_SECRET (use 64+ chars)
openssl rand -hex 32

# For ENCRYPTION_KEY (must be exactly 32 chars for AES-256)
openssl rand -hex 16

# For all other tokens/keys
openssl rand -hex 32
```

### Secret Checklist

| Variable | Min Length | Notes |
|---|---|---|
| `JWT_SECRET` | 64 chars | Used to sign all user session tokens. Changing this invalidates all sessions. |
| `ENCRYPTION_KEY` | 32 chars | Used for AES-256 field-level encryption. Changing this makes existing encrypted data unreadable. |
| `INTERNAL_GATEWAY_TOKEN` | 32 chars | Service-to-service auth token. Rotate regularly. |
| `DB_PASSWORD` | 20 chars | PostgreSQL password. Use a random string, not a dictionary word. |
| `REDIS_PASSWORD` | 20 chars | Redis AUTH password. Enable `requirepass` in redis.conf. |
| `MINIO_ROOT_PASSWORD` | 16 chars | MinIO admin password. Must be 8+ chars, recommend 20+. |
| `ADMIN_API_KEY` | 32 chars | Admin REST API key. Keep this secret — it grants full admin access. |
| `ADMIN_SSH_PASSWORD` | 20 chars | Required only if `ENABLE_ADMIN_SSH=true`. |
| `STRIPE_SECRET_KEY` | (Stripe-issued) | Never expose this in frontend code or logs. |
| `STRIPE_WEBHOOK_SECRET` | (Stripe-issued) | Required to verify Stripe webhook signatures. |
| `SMTP_PASS` | (provider-issued) | SMTP password or API key for email sending. |

---

## 3. Database Hardening

### Schema Migration Mode

```dotenv
# REQUIRED: Use migrate mode in production
DB_SCHEMA_MODE=migrate
```

- `migrate` — Adds new columns/tables, does **not** drop anything (safe for production)
- `alter` — May drop unused columns (development only)
- `force` — Drops and recreates all tables (**NEVER use in production**)

### PostgreSQL Security

- [ ] Use a dedicated database user with minimal privileges (DML only, not superuser)
- [ ] Enable SSL connections to PostgreSQL: `ssl: { require: true }` in connection config
- [ ] Set `max_connections` appropriately (use PgBouncer for pooling)
- [ ] Enable `pg_audit` extension for query auditing
- [ ] Do not expose PostgreSQL port 5432 externally (firewall rule required)
- [ ] Remove host port binding for postgres from `docker-compose.yml`:

  ```yaml
  # Remove or comment out in production:
  # ports:
  #   - "5432:5432"
  ```

### PgBouncer Connection Pooling

High-traffic deployments should use PgBouncer to limit the number of direct PostgreSQL connections:

```bash
# Kubernetes
kubectl apply -f k8s/pgbouncer.yaml

# Docker Compose: add pgbouncer service to docker-compose.yml
```

Typical PgBouncer settings for Milonexa:
- `pool_mode = transaction`
- `max_client_conn = 500`
- `default_pool_size = 25`

---

## 4. TLS & HTTPS

> **All production traffic MUST use HTTPS. HTTP should only be used to redirect to HTTPS.**

### TLS Certificates

Options (in order of preference):

1. **Let's Encrypt via Certbot** (free, auto-renewing):
   ```bash
   certbot --nginx -d milonexa.com -d api.milonexa.com -d admin.milonexa.com
   ```

2. **Caddy** (automatic HTTPS with zero config):
   ```
   milonexa.com {
     reverse_proxy frontend:3000
   }
   ```

3. **Kubernetes cert-manager** with Let's Encrypt:
   ```bash
   kubectl apply -f k8s/ingress-production.yaml
   ```

### TLS Configuration Checklist

- [ ] HTTPS enabled on all public-facing domains
- [ ] HTTP → HTTPS redirect configured
- [ ] TLS 1.2+ enforced (disable TLS 1.0/1.1)
- [ ] Strong cipher suites configured
- [ ] HSTS header enabled with `max-age=31536000; includeSubDomains`
- [ ] Certificate auto-renewal configured and tested

### Nginx TLS Checklist

See [REVERSE_PROXY.md](REVERSE_PROXY.md) for the full Nginx/Caddy configuration.

```nginx
# Minimum TLS config
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## 5. CORS & API Security

### CORS Configuration

```dotenv
# Only your exact production frontend domain(s)
CORS_ORIGINS=https://milonexa.com
# Multiple origins:
# CORS_ORIGINS=https://milonexa.com,https://www.milonexa.com
```

- [ ] `CORS_ORIGINS` does NOT contain wildcards (`*`) in production
- [ ] `CORS_ORIGINS` does NOT contain `localhost` in production
- [ ] CORS pre-flight responses are cached with appropriate `Access-Control-Max-Age`

### Security Headers

All services use Helmet.js. Verify the following headers are present in API responses:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 6. Rate Limiting

### Recommended Production Settings

```dotenv
RATE_LIMIT_WINDOW_MS=60000    # 1 minute window
RATE_LIMIT_MAX=100            # General API limit
RATE_LIMIT_AUTH_MAX=10        # Auth endpoints (login, register)
```

Adjust `RATE_LIMIT_MAX` based on your expected traffic:
- Light traffic (< 1000 users): 100 requests/minute
- Medium traffic (1000–10000 users): 300 requests/minute
- High traffic (> 10000 users): 500+ with Redis cluster

### Additional Rate Limiting

- [ ] Nginx-level rate limiting configured (see [REVERSE_PROXY.md](REVERSE_PROXY.md))
- [ ] Auth endpoint rate limiting is stricter than general API
- [ ] File upload endpoints have separate, lower rate limits
- [ ] GraphQL endpoint has query complexity limits

---

## 7. Admin Interface Security

> **Admin interfaces must never be exposed to the public internet.**

### Admin Frontend (`admin-web`, port 3001)

- [ ] Only start with `--profile admin` when actively needed
- [ ] Bind to loopback (`127.0.0.1:3001`) or restrict via firewall
- [ ] Require VPN access to reach admin panel
- [ ] Use IP allowlisting in Nginx for `admin.milonexa.com`

### Admin API

- [ ] `ADMIN_API_KEY` is strong (32+ random chars)
- [ ] Admin API endpoints are behind IP allowlist
- [ ] Admin API logs all requests with full audit trail

### Admin SSH (if enabled)

```dotenv
ENABLE_ADMIN_SSH=true           # Only enable if needed
ADMIN_SSH_HOST=127.0.0.1        # NEVER change to 0.0.0.0
ADMIN_SSH_PORT=2222
ADMIN_SSH_PASSWORD=<strong_password>
```

- [ ] SSH is only accessible via VPN or SSH tunnel, never directly from internet
- [ ] Strong password set
- [ ] Disable when not actively needed

### Break-Glass Audit Trail

All admin actions are logged immutably. Verify:
- [ ] Admin audit logs are being written
- [ ] Audit logs are forwarded to external log storage (S3/MinIO)
- [ ] Audit logs cannot be modified by the admin themselves

---

## 8. Firewall & Network Rules

### Externally exposed ports (via load balancer / Nginx)

| Port | Service | Externally Exposed |
|---|---|---|
| `80` | HTTP (redirects to 443) | ✅ Yes |
| `443` | HTTPS (Nginx/Caddy) | ✅ Yes |

### Internal-only ports (firewall BLOCK from external)

| Port | Service |
|---|---|
| `3000` | Frontend (served via Nginx) |
| `3001` | Admin Frontend |
| `8000` | API Gateway |
| `8001–8009` | Microservices |
| `9102` | Security Service |
| `5432` | PostgreSQL |
| `6379` | Redis |
| `9000–9001` | MinIO |
| `9200` | Elasticsearch |
| `2222` | Admin SSH |

### Docker Compose production adjustments

Remove or comment out external port bindings for all services except the reverse proxy:

```yaml
# In production docker-compose.yml, remove these:
postgres:
  # ports:
  #   - "5432:5432"   ← Remove

redis:
  # ports:
  #   - "6379:6379"   ← Remove

elasticsearch:
  # ports:
  #   - "9200:9200"   ← Remove
```

---

## 9. Monitoring & Alerting

### Prometheus

- [ ] `PROMETHEUS_ENABLED=true` is set
- [ ] Prometheus is scraping all service `/metrics` endpoints
- [ ] Alerting rules configured for:
  - Service down (health check failing for > 2 minutes)
  - High error rate (> 1% HTTP 5xx)
  - High latency (P99 > 2s)
  - CPU > 80% for > 5 minutes
  - Memory > 85%
  - Disk usage > 80%

### Grafana Dashboards

- [ ] Service overview dashboard showing all 10 services
- [ ] Database connection pool dashboard
- [ ] Request rate / error rate / latency per service
- [ ] Redis memory and hit rate
- [ ] MinIO storage usage

### Uptime Monitoring

- [ ] External uptime monitor configured (e.g. UptimeRobot, Pingdom, Better Uptime)
- [ ] Monitors: `https://milonexa.com`, `https://api.milonexa.com/health`
- [ ] Alert on 2+ consecutive failures
- [ ] Status page configured

---

## 10. Backup Strategy

### Automated Backups

The `k8s/backup-cronjob.yaml` schedules daily PostgreSQL backups to MinIO. For Docker deployments, set up a cron job:

```bash
# /etc/cron.d/milonexa-backup
0 2 * * * root docker compose -f /opt/milonexa/docker-compose.yml exec -T postgres \
  pg_dumpall -U milonexa | gzip > /backups/milonexa_$(date +\%Y\%m\%d).sql.gz

# Clean up backups older than 30 days
0 3 * * * root find /backups -name "milonexa_*.sql.gz" -mtime +30 -delete
```

### Backup Checklist

- [ ] Daily PostgreSQL backups running and verified
- [ ] Backups stored in a separate location from primary (MinIO bucket, S3, offsite)
- [ ] Backup restoration tested (restore to staging, verify data integrity)
- [ ] Redis RDB snapshots configured (`save 900 1`, `save 300 10`)
- [ ] MinIO data backed up (replicated bucket or periodic sync)
- [ ] Backup retention policy: 30 daily, 12 monthly

---

## 11. Log Management

### Log Rotation

```bash
# /etc/logrotate.d/milonexa
/var/log/milonexa/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
}
```

### Centralised Log Aggregation

- [ ] Logs forwarded to centralised system (ELK, Grafana Loki, Splunk, CloudWatch)
- [ ] Log retention policy configured (90 days minimum for audit logs)
- [ ] Error log alerts configured

---

## 12. Performance Tuning

### PostgreSQL

```sql
-- In postgresql.conf:
shared_buffers = '2GB'          -- ~25% of RAM
effective_cache_size = '6GB'    -- ~75% of RAM
max_connections = 100           -- Use PgBouncer above this
wal_buffers = '64MB'
checkpoint_completion_target = 0.9
```

### Redis

```conf
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
appendonly yes
```

### Node.js Services

- [ ] `--max-old-space-size` set appropriately in Docker CMD (e.g. 512–1024 MB)
- [ ] Cluster mode enabled for CPU-bound services
- [ ] Graceful shutdown handlers registered (`SIGTERM`)

---

## 13. Security Scanning

### Dependency Vulnerabilities

```bash
# Run npm audit in each service directory
cd services/user-service && npm audit
cd services/api-gateway && npm audit
cd frontend && npm audit
```

### Container Scanning

```bash
# Scan Docker images with Trivy
docker run --rm aquasec/trivy image milonexa/api-gateway:latest
```

### Elasticsearch Security

- [ ] X-Pack security enabled (not available in basic license)
- [ ] Elasticsearch bound to internal interface only
- [ ] Authentication required for all Elasticsearch queries
- [ ] Set `ELASTICSEARCH_USERNAME` and `ELASTICSEARCH_PASSWORD`

---

## 14. Admin Panel Deployment

When the admin panel is needed in production:

```bash
docker compose --profile admin up -d admin-web
```

Access only via:
1. SSH tunnel: `ssh -L 3001:localhost:3001 user@server`
2. VPN + IP allowlist in Nginx

```nginx
location / {
    allow 10.0.0.0/8;     # Internal network
    allow 192.168.0.0/16; # VPN range
    deny all;
}
```

---

## 15. Post-Deployment Verification

Run this checklist after every production deployment:

### Health Checks

- [ ] `curl https://api.milonexa.com/health` returns `{"status":"healthy"}`
- [ ] `curl https://milonexa.com` returns 200
- [ ] All 10 service `/health` endpoints return healthy

### Functional Checks

- [ ] User registration flow works end-to-end
- [ ] User login (email/password) works
- [ ] OAuth login (Google) works
- [ ] File upload (media-service) works
- [ ] Real-time messaging (WebSocket) connects
- [ ] Swagger UI loads at `https://api.milonexa.com/api-docs`
- [ ] GraphQL responds at `https://api.milonexa.com/graphql`

### Security Checks

- [ ] HTTP to HTTPS redirect works
- [ ] Security headers present in responses
- [ ] Unauthenticated requests to protected routes return 401
- [ ] Admin routes return 403 for non-admin users
- [ ] Rate limiting triggers after threshold

### Monitoring Checks

- [ ] Prometheus metrics visible at internal metrics endpoint
- [ ] Grafana dashboards showing real traffic
- [ ] Log aggregation receiving new logs
- [ ] Uptime monitor showing green
