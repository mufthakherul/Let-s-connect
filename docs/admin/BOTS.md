# 🤖 Admin Bots

Milonexa provides four bot integrations for receiving admin alerts and running commands from chat platforms.

---

## Telegram Bot

**File:** `admin/bot/telegram-bot.js`  
**Enable:** Docker profile `admin-bot-telegram`

### Environment Variables
```
TELEGRAM_ADMIN_BOT_TOKEN=<BotFather token>
TELEGRAM_ADMIN_CHAT_ID=<your chat or group ID>
```

### Commands
| Command | Description |
|---------|-------------|
| `/status` | Platform status summary |
| `/health` | Health check for all services |
| `/alerts` | List active alerts |
| `/metrics` | Key metrics summary |
| `/users` | User count and recent registrations |
| `/backup` | Trigger backup |
| `/restart <service>` | Restart a service |
| `/help` | List all commands |

Alert notifications are automatically forwarded to the configured chat ID.

---

## Slack Bot

**File:** `admin/bot/slack-bot.js`  
**Enable:** Docker profile `admin-bot-slack` (Socket Mode)

### Environment Variables
```
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_ADMIN_CHANNEL=#admin-alerts
```

### Slash Commands
| Command | Description |
|---------|-------------|
| `/health` | Health check report |
| `/status` | Platform status |
| `/metrics` | Metrics snapshot |
| `/alerts` | Active alert list |

Alert notifications with interactive buttons are sent to `SLACK_ADMIN_CHANNEL`.

---

## Microsoft Teams Bot

**File:** `admin/bot/teams-bot.js`  
**Enable:** `ENABLE_TEAMS_BOT=true`

### Environment Variables
```
TEAMS_WEBHOOK_URL=https://...
TEAMS_CLIENT_ID=<Azure app ID>
TEAMS_CLIENT_SECRET=<Azure secret>
TEAMS_TENANT_ID=<Azure tenant>
```

Sends Adaptive Card notifications to the configured Teams channel for alerts and platform events.

---

## PagerDuty Integration

**File:** `admin/bot/pagerduty-bot.js`  
**Enable:** `ENABLE_PAGERDUTY=true`

### Environment Variables
```
PAGERDUTY_API_KEY=<PagerDuty API key>
PAGERDUTY_SERVICE_ID=<PagerDuty service ID>
```

Automatically creates PagerDuty incidents from critical alerts. Severity mapping:
- `critical` → P1
- `high` → P2
- `medium` → P3

[← Back to Admin README](./README.md)
