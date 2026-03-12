# 📧 Email Admin Interface

The Email Admin interface (`admin/email/server.js`) lets you run admin commands by sending plain-text emails.

---

## Enabling

```bash
docker compose --profile admin-email up -d
```

---

## Environment Variables

```
ADMIN_EMAIL_ADDRESS=admin@yourdomain.com
ADMIN_EMAIL_PASSWORD=<app password>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
ADMIN_ALLOWED_EMAIL_SENDERS=you@example.com,other@example.com
```

> For Gmail, create an App Password at https://myaccount.google.com/apppasswords

---

## Available Commands

Send a plain-text email to `ADMIN_EMAIL_ADDRESS` with one of these subjects or body commands:

| Command | Response |
|---------|---------|
| `STATUS` | Platform-wide status summary |
| `HEALTH` | Health check for all services |
| `ALERTS` | List of active alerts |
| `METRICS` | Key metrics snapshot |
| `USERS` | User count and recent registrations |
| `BACKUP` | Trigger an immediate backup |
| `HELP` | List all available commands |

---

## Security

- Only emails from addresses in `ADMIN_ALLOWED_EMAIL_SENDERS` are processed
- All command executions are logged in the admin audit log
- Responses are sent back to the sender's email address

[← Back to Admin README](./README.md)
