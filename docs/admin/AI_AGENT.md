# 🤖 AI Autonomous Admin Agent

The AI Admin Agent (`admin/ai/agent.js`) is an autonomous AI-powered admin assistant that monitors the platform, detects anomalies, and can take remediation actions with admin approval.

---

## Enabling

```bash
# Docker Compose (profile: admin-ai)
docker compose --profile admin-ai up -d

# Environment variable required
ENABLE_ADMIN_AI=true
```

---

## Capabilities

| Capability | Description |
|-----------|-------------|
| **Anomaly Detection** | Continuously monitors metrics and flags unusual patterns |
| **Auto-Remediation** | Suggests or automatically applies fixes (with approval) |
| **Alert Correlation** | Groups related alerts to reduce noise |
| **Capacity Planning** | Forecasts resource usage trends |
| **Incident Summarization** | Generates natural-language incident summaries |
| **Log Analysis** | Scans logs for errors and patterns |

---

## Web Dashboard Panels

| Panel | Location | Purpose |
|-------|----------|---------|
| **AIAgentPanel.jsx** | Dashboard tab | Autonomous agent control and status |
| **AIIntegrationPanel.jsx** | Dashboard tab | AI integration configuration |
| **AIPermissionInbox.jsx** | Dashboard tab | Review/approve AI-proposed actions |
| **AIRemediationPanel.jsx** | Dashboard tab | Remediation history and outcomes |

> **Safety**: All AI actions require admin approval via the Permission Inbox before execution.

---

## CLI Interaction

```bash
# Run AI remediation analysis
node admin-cli/index.js remediate --issue "high memory on content-service"

# Via admin REST API
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  -X POST http://localhost:8888/api/v1/remediate \
  -H "Content-Type: application/json" \
  -d '{"issue": "elevated error rate on api-gateway"}'
```

---

## AI Models

- **Google Gemini 2.5 Flash** — cloud inference (requires `GEMINI_API_KEY`)
- **Ollama (llama3.2)** — local inference, no data leaves your server

The agent uses the `AIIntegrationBridge` (`admin/shared/ai-integration.js`) to route requests to the configured provider.

[← Back to Admin README](./README.md)
