# PagerDuty Integration — Milonexa Admin

Sends alerts and incidents to PagerDuty via **Events API v2**.  
No external npm dependencies — uses Node.js built-in `https`.

---

## Setup

1. Create an **Events API v2** integration in your PagerDuty service.
2. Copy the **Routing Key** (32-char hex string).
3. Set the environment variable:

```bash
export PAGERDUTY_ROUTING_KEY=your_routing_key_here
```

Or add it to your `.env` file:

```
PAGERDUTY_ROUTING_KEY=your_routing_key_here
```

---

## CLI Usage

```bash
# Test connectivity (sends an info-level test incident)
node admin/bot/pagerduty/index.js test

# Trigger an incident
node admin/bot/pagerduty/index.js trigger "Database latency spike" critical

# Trigger with default severity (warning)
node admin/bot/pagerduty/index.js trigger "Disk usage above 90%"
```

---

## Programmatic Usage

```js
const { PagerDutyClient } = require('./admin/bot/pagerduty');

const pd = new PagerDutyClient(); // reads PAGERDUTY_ROUTING_KEY from env

// Trigger a new incident
await pd.triggerIncident({
  summary: 'User service returned 503',
  severity: 'critical',           // critical | error | warning | info
  source: 'milonexa-user-service',
  component: 'user-service',
  details: { endpoint: '/api/users', statusCode: 503 },
  dedupKey: 'user-service-503'    // optional; used for dedup/ack/resolve
});

// Acknowledge
await pd.acknowledgeIncident('user-service-503');

// Resolve
await pd.resolveIncident('user-service-503');

// Full event control
await pd.sendEvent({
  action: 'trigger',              // trigger | acknowledge | resolve
  severity: 'warning',
  summary: 'High memory usage',
  source: 'milonexa-admin',
  component: 'api-gateway',
  group: 'infrastructure',
  class: 'performance',
  customDetails: { memoryUsage: '92%' },
  dedupKey: 'api-gw-memory'
});
```

---

## Admin Panel Integration

The PagerDuty client is wired into `admin/shared/webhooks.js`.  
When a webhook of type `pagerduty` is registered, `WebhookManager.fire()` calls
`PagerDutyClient.triggerIncident()` instead of a raw HTTP POST, enabling:

- Proper dedup key management
- Acknowledge / resolve lifecycle support
- Severity mapping from admin alert levels

To register a PagerDuty webhook via the CLI:

```bash
node admin/cli/index.js webhook add pagerduty \
  --name "On-call escalation" \
  --token "$PAGERDUTY_ROUTING_KEY"
```

---

## API Reference

### `new PagerDutyClient(routingKey?)`

| Param | Type | Default |
|-------|------|---------|
| `routingKey` | `string` | `process.env.PAGERDUTY_ROUTING_KEY` |

### Methods

| Method | Description |
|--------|-------------|
| `triggerIncident(opts)` | Open a new incident |
| `acknowledgeIncident(dedupKey)` | Acknowledge an open incident |
| `resolveIncident(dedupKey)` | Resolve an incident |
| `sendEvent(opts)` | Low-level event send (full control) |
| `test()` | Send a test info-level incident |

### `triggerIncident` options

| Field | Type | Description |
|-------|------|-------------|
| `summary` | `string` | Human-readable incident title |
| `severity` | `string` | `critical \| error \| warning \| info` |
| `source` | `string` | Originating service/host |
| `component` | `string` | Affected component |
| `details` | `object` | Extra key/value context |
| `dedupKey` | `string` | Dedup / ack / resolve key |

---

*Part of the Milonexa Admin Panel — Q2 2026*
