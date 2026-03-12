# 🔔 Webhook System

The webhook system allows external services to receive real-time notifications about platform events.

---

## Webhook Hub Server

**File:** `admin/webhook/server.js`  
**Port:** 8889  
**Enable:** Docker profile `admin-webhook`

---

## Managing Webhooks

### Via CLI
```bash
node admin-cli/index.js webhooks list
node admin-cli/index.js webhooks add --url https://example.com/hook --events user.registered,post.created --secret mysecret
node admin-cli/index.js webhooks remove --id <webhook-id>
node admin-cli/index.js webhooks fire --event test.ping --payload '{"test":true}'
```

### Via REST API
```bash
# List
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/webhooks

# Add
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  http://localhost:8888/api/v1/webhooks \
  -d '{"url":"https://example.com/hook","events":["user.registered"],"secret":"mysecret"}'

# Delete
curl -X DELETE -H "Authorization: Bearer $ADMIN_API_KEY" \
  http://localhost:8888/api/v1/webhooks/<id>
```

### Via Web Dashboard
Use the **WebhookPanel** tab in the admin web dashboard.

---

## Platform Events

| Event | Trigger |
|-------|---------|
| `user.registered` | New user account created |
| `user.deleted` | User account deleted |
| `post.created` | New post published |
| `post.flagged` | Post flagged by AI or user report |
| `post.deleted` | Post deleted |
| `order.placed` | New shop order |
| `order.completed` | Order fulfilled |
| `meeting.started` | Video meeting started |
| `meeting.ended` | Video meeting ended |
| `alert.triggered` | Admin alert fired |
| `alert.resolved` | Admin alert resolved |
| `service.health.changed` | Service health status changed |
| `backup.completed` | Backup finished successfully |
| `backup.failed` | Backup failed |

---

## Signature Verification

Each webhook request includes an `X-Milonexa-Signature` header (HMAC-SHA256):

```js
const crypto = require('crypto');
const sig = req.headers['x-milonexa-signature'];
const expected = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
if (sig !== `sha256=${expected}`) { throw new Error('Invalid signature'); }
```

---

## Retry Policy

Failed deliveries are retried 3 times with exponential backoff (1s, 5s, 30s). Delivery logs are stored in `.admin-cli/webhooks/`.

[← Back to Admin README](./README.md)
