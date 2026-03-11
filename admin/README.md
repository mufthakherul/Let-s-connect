# Milonexa Admin Panel — Unified Directory

All admin interfaces live here, organized by access method. Each subdirectory is a self-contained module.

## Directory Structure

```
admin/
├── config.js          # Feature flag system (env-based toggles)
├── shared/            # Shared libraries (metrics, alerts, SLA, etc.)
├── web/               # React web dashboard (port 3001) — ENABLED by default
├── cli/               # Terminal CLI tool — always available locally
├── rest-api/          # HTTP REST API server (port 8888)
├── ssh/               # SSH interactive dashboard (port 2222)
├── webhook/           # Webhook notification server (port 8889)
├── bot/               # Bot interfaces
│   ├── telegram/      # Telegram admin bot
│   └── slack/         # Slack admin bot
└── email/             # Email command interface
```

## Interface Availability (Default)

| Interface         | Default | Toggle Env Var                | Port |
|-------------------|---------|-------------------------------|------|
| Web Dashboard     | ✅ ON   | `ENABLE_ADMIN_WEB=true`       | 3001 |
| CLI               | ✅ ON   | Always available (local only) | —    |
| REST API          | ❌ OFF  | `ENABLE_ADMIN_REST_API=true`  | 8888 |
| SSH Dashboard     | ❌ OFF  | `ENABLE_ADMIN_SSH=true`       | 2222 |
| Webhook Server    | ❌ OFF  | `ENABLE_ADMIN_WEBHOOK=true`   | 8889 |
| Telegram Bot      | ❌ OFF  | `ENABLE_ADMIN_BOT_TELEGRAM=true` | — |
| Slack Bot         | ❌ OFF  | `ENABLE_ADMIN_BOT_SLACK=true` | 3003 |
| Email Interface   | ❌ OFF  | `ENABLE_ADMIN_EMAIL=true`     | —    |
| AI Agent          | ❌ OFF  | `ENABLE_ADMIN_AI=true`        | 8890 |

> **CLI is excluded from env toggles** — it runs directly from your terminal and requires no server process.

## Quick Start

### 1. Web Dashboard (default, no config needed)
```bash
docker compose --profile admin up admin-web
# Or local dev:
cd admin/web && npm install --legacy-peer-deps && npm start
```

### 2. REST API
```bash
echo "ENABLE_ADMIN_REST_API=true" >> .env
echo "ADMIN_API_KEY=$(openssl rand -hex 32)" >> .env
docker compose --profile admin-api up admin-rest-api
```

### 3. SSH Dashboard
```bash
echo "ENABLE_ADMIN_SSH=true" >> .env
echo "ADMIN_SSH_PASSWORD=$(openssl rand -base64 24)" >> .env
docker compose --profile admin-ssh up admin-ssh
ssh admin@localhost -p 2222
```

### 4. Webhook Server
```bash
echo "ENABLE_ADMIN_WEBHOOK=true" >> .env
echo "ADMIN_WEBHOOK_SECRET=$(openssl rand -hex 32)" >> .env
docker compose --profile admin-webhook up admin-webhook
```

### 5. Telegram Bot
```bash
echo "ENABLE_ADMIN_BOT_TELEGRAM=true" >> .env
echo "TELEGRAM_BOT_TOKEN=<your-token>" >> .env
echo "TELEGRAM_ADMIN_USER_IDS=<your-user-id>" >> .env
docker compose --profile admin-bot-telegram up admin-bot-telegram
```

### 6. Slack Bot
```bash
echo "ENABLE_ADMIN_BOT_SLACK=true" >> .env
echo "SLACK_BOT_TOKEN=xoxb-..." >> .env
echo "SLACK_APP_TOKEN=xapp-..." >> .env
echo "SLACK_SIGNING_SECRET=..." >> .env
docker compose --profile admin-bot-slack up admin-bot-slack
```

### 7. Email Interface
```bash
echo "ENABLE_ADMIN_EMAIL=true" >> .env
echo "ADMIN_EMAIL_USER=admin@yourdomain.com" >> .env
echo "ADMIN_EMAIL_PASSWORD=..." >> .env
echo "ADMIN_EMAIL_IMAP_HOST=imap.yourdomain.com" >> .env
echo "ADMIN_EMAIL_SMTP_HOST=smtp.yourdomain.com" >> .env
echo "ADMIN_EMAIL_ALLOWED_SENDERS=owner@yourdomain.com" >> .env
docker compose --profile admin-email up admin-email
# Then send email with subject: [ADMIN-CMD] status
```

## CLI Usage (no Docker required)

```bash
cd admin/cli
node index.js doctor
node index.js status --runtime docker
node index.js metrics status
node index.js alerts list
node index.js dashboard --interval 5
```

## Enabling Multiple Interfaces

```bash
# Enable all interfaces at once
ENABLE_ADMIN_WEB=true
ENABLE_ADMIN_REST_API=true
ENABLE_ADMIN_SSH=true
ENABLE_ADMIN_WEBHOOK=true
ENABLE_ADMIN_BOT_TELEGRAM=true
ENABLE_ADMIN_BOT_SLACK=true
ENABLE_ADMIN_EMAIL=true

docker compose \
  --profile admin \
  --profile admin-api \
  --profile admin-ssh \
  --profile admin-webhook \
  --profile admin-bot-telegram \
  --profile admin-bot-slack \
  --profile admin-email \
  up
```

## Security Notes

- All network-accessible interfaces require authentication
- Use `ADMIN_ALLOWED_IPS` to restrict by IP address
- Enable 2FA with `ENABLE_ADMIN_2FA=true`
- All admin actions are logged to `.admin-cli/audit.log`
- Dangerous actions (restart, backup, stop) require confirmation
- Email and bot interfaces block destructive commands by default

## Documentation

See `docs/admin/ADMIN_PANELS.md` for the complete reference guide.
