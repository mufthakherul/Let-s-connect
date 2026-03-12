# Admin REST API Reference

## Overview

The Admin REST API exposes all Milonexa platform admin operations over HTTP. It runs at `admin/rest-api/server.js` on port **8888** by default.

Use it to integrate admin operations into CI/CD pipelines, external monitoring systems, custom dashboards, or automation scripts.

---

## Starting the REST API

### Via Docker Compose (recommended)

```bash
docker compose --profile admin-api up -d
```

### Directly (development)

```bash
ADMIN_API_KEY=your-secret-key node admin/rest-api/server.js
```

---

## Authentication

All endpoints (except `/health`) require a Bearer token matching the `ADMIN_API_KEY` environment variable.

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/dashboard
```

Missing or invalid tokens receive `401 Unauthorized`.

---

## Rate Limiting

| Scope | Limit |
|---|---|
| Per IP address | 100 requests/minute |
| Per authenticated user | 200 requests/minute |

Exceeding the limit returns `429 Too Many Requests` with a `Retry-After` header.

---

## Security Headers

All responses include OWASP-recommended security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'none'
Cache-Control: no-store
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `ADMIN_API_KEY` | Bearer token for authentication | *(required)* |
| `ADMIN_REST_PORT` | Port to listen on | `8888` |
| `ADMIN_REST_HOST` | Bind host | `127.0.0.1` |
| `ADMIN_ALLOWED_IPS` | IP allowlist | `127.0.0.1,::1` |

---

## Endpoint Reference

### Health

#### `GET /health`

Server health check. Does **not** require authentication.

```bash
curl http://localhost:8888/health
```

**Response:**
```json
{ "status": "ok", "timestamp": "2026-03-09T12:00:00Z" }
```

---

### Dashboard

#### `GET /api/v1/dashboard`

Returns a full dashboard summary including platform stats, service health, and active alerts.

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/dashboard
```

**Response:**
```json
{
  "stats": { "users": 12400, "posts": 89200, "activeSessions": 340 },
  "health": { "api-gateway": "healthy", "user-service": "healthy" },
  "alerts": [ { "id": "a1", "severity": "warning", "message": "High CPU on user-service" } ]
}
```

---

### Metrics

#### `GET /api/v1/metrics`

Query recorded metrics.

**Query parameters:**

| Param | Description |
|---|---|
| `name` | Filter by metric name |
| `since` | ISO 8601 timestamp — return metrics after this time |
| `limit` | Max results to return (default: 100) |

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  "http://localhost:8888/api/v1/metrics?name=cpu_usage&since=2026-03-01T00:00:00Z&limit=50"
```

#### `POST /api/v1/metrics`

Record a custom metric.

**Request body:**
```json
{ "name": "custom_metric", "value": 42.5, "tags": { "service": "user-service" } }
```

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"custom_metric","value":42.5,"tags":{"service":"user-service"}}' \
  http://localhost:8888/api/v1/metrics
```

---

### Alerts

#### `GET /api/v1/alerts`

List alerts with optional filters.

**Query parameters:** `severity` (critical/high/medium/low), `status` (active/resolved)

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  "http://localhost:8888/api/v1/alerts?severity=critical&status=active"
```

#### `GET /api/v1/alerts/stats`

Alert statistics (counts by severity, resolution rate, MTTD/MTTR).

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/alerts/stats
```

---

### SLA

#### `GET /api/v1/sla`

SLA status for all services.

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/sla
```

#### `GET /api/v1/sla/predict`

AI-powered SLA breach predictions.

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/sla/predict
```

#### `POST /api/v1/sla/record`

Record an SLA measurement.

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"service":"api-gateway","value":99.95,"metric":"uptime"}' \
  http://localhost:8888/api/v1/sla/record
```

---

### Webhooks

#### `GET /api/v1/webhooks`

List all configured webhooks.

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/webhooks
```

#### `POST /api/v1/webhooks`

Add a new webhook.

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/hook","events":["alert.triggered"],"secret":"mysecret"}' \
  http://localhost:8888/api/v1/webhooks
```

#### `DELETE /api/v1/webhooks/:id`

Remove a webhook by ID.

```bash
curl -X DELETE -H "Authorization: Bearer $ADMIN_API_KEY" \
  http://localhost:8888/api/v1/webhooks/wh_abc123
```

#### `POST /api/v1/webhooks/fire`

Manually fire webhooks for a given event (useful for testing).

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"event":"alert.triggered","payload":{"message":"Test alert"}}' \
  http://localhost:8888/api/v1/webhooks/fire
```

---

### Clusters

#### `GET /api/v1/clusters`

List all registered Kubernetes clusters.

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/clusters
```

#### `POST /api/v1/clusters`

Register a new cluster.

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"prod-eu","endpoint":"https://k8s.prod-eu.example.com","kubeconfig":"<base64>"}' \
  http://localhost:8888/api/v1/clusters
```

#### `GET /api/v1/clusters/status`

Multi-cluster status summary.

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/clusters/status
```

---

### Trends & Anomalies

#### `GET /api/v1/trends`

Trend analysis report.

**Query parameter:** `service` — filter by service name

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  "http://localhost:8888/api/v1/trends?service=user-service"
```

#### `GET /api/v1/trends/anomalies`

Anomaly detection results from the AI analysis engine.

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/trends/anomalies
```

---

### AI Remediation

#### `POST /api/v1/remediate`

Submit an issue description for AI-powered remediation analysis.

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"issue":"user-service pod OOMKilled, memory usage at 98%"}' \
  http://localhost:8888/api/v1/remediate
```

**Response:**
```json
{
  "analysis": "Memory leak detected in connection pool. Recommended action: restart pod and increase memory limit to 512Mi.",
  "steps": ["kubectl rollout restart deployment/user-service", "Update memory limit in k8s manifest"],
  "confidence": 0.87
}
```

---

### Compliance

#### `GET /api/v1/compliance`

Compliance status for GDPR, SOC2, and HIPAA.

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/compliance
```

---

### Costs

#### `GET /api/v1/costs`

Cost summary.

**Query parameter:** `period` — e.g. `7d`, `30d`, `90d` (default: `30d`)

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  "http://localhost:8888/api/v1/costs?period=30d"
```

---

### Recommendations

#### `GET /api/v1/recommendations`

Top cost and performance optimization recommendations.

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/recommendations
```

---

### Audit Log

#### `GET /api/v1/audit`

Retrieve audit log entries.

**Query parameters:**

| Param | Description |
|---|---|
| `tail` | Return last N entries (default: 100) |
| `level` | Filter by level: `info`, `warn`, `critical` |
| `since` | ISO 8601 timestamp |

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  "http://localhost:8888/api/v1/audit?tail=50&level=critical"
```

---

## Q4 2026 Endpoints

These endpoints are planned for the Q4 2026 release.

### Tenants

#### `GET /api/v1/tenants`

List all tenants.

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/tenants
```

#### `POST /api/v1/tenants`

Create a new tenant.

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"acme-corp","plan":"enterprise"}' \
  http://localhost:8888/api/v1/tenants
```

---

### Feature Flags

#### `GET /api/v1/features`

List all feature flags.

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/features
```

#### `POST /api/v1/features`

Create a feature flag.

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"new-ui","enabled":false,"description":"New UI experiment"}' \
  http://localhost:8888/api/v1/features
```

#### `PUT /api/v1/features/:name`

Toggle a feature flag.

```bash
curl -X PUT -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}' \
  http://localhost:8888/api/v1/features/new-ui
```

#### `DELETE /api/v1/features/:name`

Delete a feature flag.

```bash
curl -X DELETE -H "Authorization: Bearer $ADMIN_API_KEY" \
  http://localhost:8888/api/v1/features/new-ui
```

---

### Runbooks

#### `GET /api/v1/runbooks`

List all available runbooks.

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/runbooks
```

#### `POST /api/v1/runbooks/:name/run`

Execute a named runbook.

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  http://localhost:8888/api/v1/runbooks/restart-all-services/run
```

---

### Changelog

#### `GET /api/v1/changelog`

Get platform changelog entries.

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" http://localhost:8888/api/v1/changelog
```

#### `POST /api/v1/changelog`

Add a changelog entry.

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"version":"2.4.0","summary":"Added multi-cluster support","author":"admin"}' \
  http://localhost:8888/api/v1/changelog
```

---

## Error Responses

| Status | Meaning |
|---|---|
| `401 Unauthorized` | Missing or invalid `Authorization` header |
| `403 Forbidden` | IP not in allowlist |
| `404 Not Found` | Endpoint or resource does not exist |
| `429 Too Many Requests` | Rate limit exceeded; check `Retry-After` header |
| `500 Internal Server Error` | Unexpected server error; check admin logs |

**Example 401 response:**
```json
{ "error": "Unauthorized", "message": "Invalid or missing API key" }
```

**Example 429 response:**
```json
{ "error": "Too Many Requests", "retryAfter": 30 }
```
