# Environment Variable Reference

This document lists every environment variable used across the Milonexa platform. Set these in your `.env` file (for Docker Compose) or as Kubernetes Secrets/ConfigMaps.

---

## Table of Contents

1. [Core Platform](#1-core-platform)
2. [Database (PostgreSQL)](#2-database-postgresql)
3. [Redis](#3-redis)
4. [MinIO / S3 Storage](#4-minio--s3-storage)
5. [Authentication & Security](#5-authentication--security)
6. [OAuth Providers](#6-oauth-providers)
7. [Email / SMTP](#7-email--smtp)
8. [AI Services](#8-ai-services)
9. [Elasticsearch](#9-elasticsearch)
10. [Admin Ecosystem](#10-admin-ecosystem)
11. [Stripe (Shop Service)](#11-stripe-shop-service)
12. [Web Push / PWA Notifications](#12-web-push--pwa-notifications)
13. [Rate Limiting](#13-rate-limiting)
14. [Logging & Monitoring](#14-logging--monitoring)

---

## 1. Core Platform

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `NODE_ENV` | `development` | Yes | Runtime environment. One of `development`, `production`, or `test`. Controls logging verbosity, error detail in responses, and optimisations. |
| `API_VERSION` | `v2` | No | Default API version exposed by the gateway. Overridden per-request via `X-API-Version` header. Defaults to `v2`. |
| `FRONTEND_URL` | `http://localhost:3000` | Yes | Canonical URL of the user-facing frontend. Used for OAuth redirect validation and CORS origin checks. In production set to `https://milonexa.com`. |
| `PORT` | `8000` | No | Overrides the default listening port for any individual service. Each service has a hardcoded default; set `PORT` only when needed. |

---

## 2. Database (PostgreSQL)

The platform supports two connection styles: a full `DATABASE_URL` or individual component variables. Individual variables take precedence when both are set.

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | `postgresql://milonexa:secret@localhost:5432/milonexa` | Conditional | Full PostgreSQL connection string. Used by services that parse `DATABASE_URL` directly (e.g. some migration tools). Either this or the individual variables below must be set. |
| `DB_HOST` | `localhost` | Yes | Hostname or IP address of the PostgreSQL server. In Docker Compose use the service name `postgres`. |
| `DB_PORT` | `5432` | No | PostgreSQL port. Defaults to `5432`. |
| `DB_USER` | `milonexa` | Yes | Database user. Must have CREATE/ALTER/DROP privileges in development; in production should only have DML privileges. |
| `DB_PASSWORD` | `changeme` | Yes | Password for `DB_USER`. Must be changed from default in production. |
| `DB_NAME` | `milonexa` | Yes | Primary application database name. |
| `DB_SCHEMA_MODE` | `migrate` | Yes | Controls Sequelize sync behaviour. `migrate` — safe, no destructive changes (use in production). `alter` — adds/modifies columns, may drop unused ones (development). `force` — drops and recreates all tables (**never use in production**). See `services/shared/db-sync-policy.js`. |
| `POSTGRES_MULTIPLE_DATABASES` | `milonexa,admin,milonexa_admin` | No | Comma-separated list of extra databases to create during PostgreSQL container first-run init. Processed by `scripts/init-databases.sh`. |

---

## 3. Redis

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Yes | Redis connection URL used by all services for caching, rate limiting, pub/sub, and session storage. In Docker Compose use `redis://redis:6379`. |
| `REDIS_PASSWORD` | `(empty)` | No | Optional password for Redis AUTH command. Set this when using Redis in production with `requirepass` enabled. |

---

## 4. MinIO / S3 Storage

MinIO provides S3-compatible object storage for media uploads.

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `MINIO_ROOT_USER` | `minioadmin` | Yes | Root/admin username for MinIO. Change in production. Equivalent to AWS `Access Key ID`. |
| `MINIO_ROOT_PASSWORD` | `minioadmin` | Yes | Root/admin password for MinIO. Must be at least 8 characters. Change in production. Equivalent to AWS `Secret Access Key`. |
| `MINIO_ENDPOINT` | `http://localhost:9000` | Yes | Full URL of the MinIO API endpoint. In Docker Compose use `http://minio:9000`. For AWS S3 use `https://s3.amazonaws.com`. |
| `MINIO_BUCKET` | `milonexa-media` | No | Default bucket name for media uploads. Created automatically on service start if it does not exist. Defaults to `milonexa-media`. |
| `MINIO_USE_SSL` | `false` | No | Set to `true` when `MINIO_ENDPOINT` uses HTTPS. |
| `MINIO_REGION` | `us-east-1` | No | S3 region. Required when using AWS S3 instead of MinIO. |

---

## 5. Authentication & Security

> **Warning:** All variables in this section are security-critical. Never commit real values to source control. Generate secrets with `openssl rand -hex 32`.

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `JWT_SECRET` | `<64-char-random-hex>` | **Required** | Signing secret for JWT access tokens. Minimum 32 characters; 64+ recommended for production. Changing this invalidates all existing sessions. |
| `JWT_ACCESS_EXPIRY` | `15m` | No | Lifetime of issued access tokens. Short-lived for security. Defaults to `15m`. Supports `ms` library format: `15m`, `1h`, `2d`. |
| `JWT_REFRESH_EXPIRY` | `7d` | No | Lifetime of refresh tokens stored in Redis. Defaults to `7d`. |
| `ENCRYPTION_KEY` | `<32-char-random-hex>` | **Required** | Key used for field-level encryption of sensitive database columns (e.g. private messages, PII). Must be exactly 32 characters for AES-256. |
| `BCRYPT_ROUNDS` | `12` | No | Work factor for bcrypt password hashing. `12` is the production minimum; higher values increase security but also CPU cost on login. Defaults to `12`. |
| `INTERNAL_GATEWAY_TOKEN` | `<32-char-random-hex>` | **Required** | Shared secret sent in `x-internal-gateway-token` header for service-to-service calls that bypass public auth. Must be changed from default. |
| `CORS_ORIGINS` | `http://localhost:3000` | Yes | Comma-separated list of allowed CORS origins. In production set to your exact frontend domain(s), e.g. `https://milonexa.com,https://admin.milonexa.com`. |

---

## 6. OAuth Providers

Configure only the providers you intend to enable. All OAuth routes use PKCE with server-side state stored in a bounded Map (max 1000 entries, 10-minute TTL).

### Google

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | `123456789-xxxx.apps.googleusercontent.com` | No | Google OAuth 2.0 Client ID from Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxx` | No | Google OAuth 2.0 Client Secret. |

### GitHub

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `GITHUB_CLIENT_ID` | `Iv1.xxxxxxxxxxxx` | No | GitHub OAuth App Client ID. |
| `GITHUB_CLIENT_SECRET` | `xxxxxxxxxxxxxxxxxxxx` | No | GitHub OAuth App Client Secret. |

### Discord

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `DISCORD_CLIENT_ID` | `1234567890123456789` | No | Discord Application Client ID from Discord Developer Portal. |
| `DISCORD_CLIENT_SECRET` | `xxxxxxxxxxxxxxxxxxxx` | No | Discord Application Client Secret. |

### Apple Sign In

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `APPLE_CLIENT_ID` | `com.milonexa.app` | No | Apple Services ID (bundle ID / service identifier). |
| `APPLE_TEAM_ID` | `XXXXXXXXXX` | No | 10-character Apple Developer Team ID. |
| `APPLE_KEY_ID` | `XXXXXXXXXX` | No | 10-character Key ID from Apple Developer portal. |
| `APPLE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | No | Contents of the `.p8` private key file. Use escaped newlines or a multi-line env var. |

---

## 7. Email / SMTP

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `SMTP_HOST` | `smtp.sendgrid.net` | Yes | SMTP server hostname. |
| `SMTP_PORT` | `587` | Yes | SMTP port. `587` for STARTTLS, `465` for SSL/TLS, `25` for unauthenticated relay. |
| `SMTP_SECURE` | `false` | No | Set to `true` for port 465 (direct SSL). Leave `false` for port 587 (STARTTLS). Defaults to `false`. |
| `SMTP_USER` | `apikey` | Yes | SMTP username (for SendGrid this is literally `apikey`). |
| `SMTP_PASS` | `SG.xxxx` | Yes | SMTP password / API key. |
| `EMAIL_FROM` | `noreply@milonexa.com` | No | Default sender address for all transactional emails (verification, password reset, notifications). Defaults to `noreply@milonexa.com`. |

---

## 8. AI Services

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | `AIzaSy-xxxxxxxxxxxx` | No | Google Gemini API key for cloud AI features. Obtain from Google AI Studio. |
| `OLLAMA_BASE_URL` | `http://ollama:11434` | No | Base URL of a locally running Ollama instance for on-premise LLM inference. |
| `OLLAMA_MODEL` | `llama3.2` | No | Default Ollama model name to use for completions. Defaults to `llama3.2`. Other options: `mistral`, `codellama`, etc. |

---

## 9. Elasticsearch

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `ELASTICSEARCH_URL` | `http://localhost:9200` | No | Full URL of the Elasticsearch node or cluster endpoint. Required when full-text search features are enabled. In Docker Compose use `http://elasticsearch:9200`. |
| `ELASTICSEARCH_USERNAME` | `elastic` | No | Username for Elasticsearch security (X-Pack). Required when security is enabled. |
| `ELASTICSEARCH_PASSWORD` | `changeme` | No | Password for Elasticsearch security. Required when security is enabled. |

---

## 10. Admin Ecosystem

The admin ecosystem consists of optional modules activated via feature flags and Docker Compose profiles.

### Core Admin

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `ADMIN_API_KEY` | `<32-char-random-hex>` | Conditional | REST API key for the admin API endpoints. Required if admin-web or admin CLI are used. Must be changed from any default. |
| `ADMIN_SSH_HOST` | `127.0.0.1` | No | Host that the embedded SSH server binds to. Defaults to `127.0.0.1` (loopback only — do not change to `0.0.0.0` in production). |
| `ADMIN_SSH_PORT` | `2222` | No | Port for the embedded SSH admin shell. Defaults to `2222`. |
| `ADMIN_SSH_PASSWORD` | `changeme` | Conditional | Password for SSH admin shell authentication. Required when `ENABLE_ADMIN_SSH=true`. Change before enabling. |

### Admin Feature Flags

| Variable | Default | Description |
|---|---|---|
| `ENABLE_ADMIN_SSH` | `false` | Enable the embedded SSH admin server. Only activate in secure, firewalled environments. |
| `ENABLE_ADMIN_AI` | `false` | Enable AI-assisted admin features (log analysis, anomaly explanation). |
| `ENABLE_TEAMS_BOT` | `false` | Enable Microsoft Teams bot integration for admin alerts. |
| `ENABLE_PAGERDUTY` | `false` | Enable PagerDuty incident creation for critical alerts. |

### Telegram Admin Bot

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `TELEGRAM_ADMIN_BOT_TOKEN` | `1234567890:AAxxxxxx` | Conditional | Telegram Bot API token. Required when admin Telegram bot is configured. |
| `TELEGRAM_ADMIN_CHAT_ID` | `-100123456789` | Conditional | Telegram chat or group ID to receive admin alerts. |

### Slack Admin Bot

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `SLACK_BOT_TOKEN` | `xoxb-xxxx-xxxx-xxxx` | Conditional | Slack Bot OAuth token. Required for Slack admin bot integration. |
| `SLACK_APP_TOKEN` | `xapp-xxxx-xxxx-xxxx` | Conditional | Slack App-level token for Socket Mode connections. |
| `SLACK_ADMIN_CHANNEL` | `#milonexa-admin` | Conditional | Slack channel name or ID for admin alerts. |

---

## 11. Stripe (Shop Service)

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_xxxx` | Conditional | Stripe secret API key. Use `sk_test_xxxx` for test mode. Required when shop-service payments are enabled. |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_xxxx` | Conditional | Stripe publishable key for frontend payment forms. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxxx` | Conditional | Secret for verifying Stripe webhook event signatures. Required to handle payment events (payment_intent.succeeded, etc.). |

---

## 12. Web Push / PWA Notifications

VAPID keys are required for browser push notifications via the Web Push API.

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `VAPID_PUBLIC_KEY` | `Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Conditional | VAPID public key (URL-safe base64 encoded). Generate with `npx web-push generate-vapid-keys`. |
| `VAPID_PRIVATE_KEY` | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Conditional | VAPID private key. Keep secret. |
| `VAPID_EMAIL` | `mailto:admin@milonexa.com` | Conditional | Contact email used in the VAPID `sub` claim. Must be a `mailto:` URI. |

---

## 13. Rate Limiting

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | `60000` | No | Sliding window size in milliseconds for rate limiting. Defaults to `60000` (1 minute). |
| `RATE_LIMIT_MAX` | `100` | No | Maximum number of requests allowed per IP per window. Defaults to `100`. Tune upward for high-traffic trusted clients. |
| `RATE_LIMIT_AUTH_MAX` | `10` | No | Stricter limit for authentication endpoints (login, register, token refresh). Defaults to `10` per window. |

---

## 14. Logging & Monitoring

| Variable | Example Value | Required | Description |
|---|---|---|---|
| `LOG_LEVEL` | `info` | No | Winston log level. One of `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`. Use `debug` locally; `warn` or `error` in production for reduced noise. Defaults to `info`. |
| `LOG_FILE` | `logs/app.log` | No | Path to write combined log file. When unset, logs are written to stdout only. |
| `LOG_ERROR_FILE` | `logs/error.log` | No | Path to write error-only log file. |
| `PROMETHEUS_ENABLED` | `true` | No | Enable Prometheus metrics endpoint at `/metrics` on each service. Defaults to `true`. Disable if you have no Prometheus scraper. |
| `METRICS_PORT` | `9090` | No | Port for the Prometheus metrics endpoint. Defaults to `9090`. |

---

## Generating Secrets

Use the following commands to generate strong secrets:

```bash
# JWT_SECRET (64 chars)
openssl rand -hex 32

# ENCRYPTION_KEY (32 chars for AES-256)
openssl rand -hex 16

# INTERNAL_GATEWAY_TOKEN
openssl rand -hex 32

# ADMIN_API_KEY
openssl rand -hex 32

# VAPID keys
npx web-push generate-vapid-keys
```

---

## Minimal .env for Local Development

```dotenv
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=milonexa
DB_PASSWORD=milonexa_dev
DB_NAME=milonexa
DB_SCHEMA_MODE=alter

REDIS_URL=redis://localhost:6379

MINIO_ENDPOINT=http://localhost:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

JWT_SECRET=dev_jwt_secret_min_32_chars_xxxxxxxxxxxxxxx
ENCRYPTION_KEY=dev_encryption_key_32chars______
INTERNAL_GATEWAY_TOKEN=dev_gateway_token_32chars_______

CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=debug
```

> **Never** use these placeholder values in production. See [PRODUCTION.md](PRODUCTION.md) for the full production checklist.
