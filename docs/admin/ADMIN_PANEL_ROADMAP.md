# Admin Panel (Non-AI) — Roadmap (2026+)

<!-- markdownlint-disable MD022 MD024 MD032 MD047 -->

**Version:** 1.0  
**Date:** March 11, 2026  
**Scope:** All non-AI admin panel components — CLI, REST API, Web Dashboard, SSH, Email, Bots, Webhooks, Shared utilities  
**Related:** [General Roadmap](../../ROADMAP.md) · [AI Admin Roadmap](./AI_ADMIN_ROADMAP.md)

---

## Overview

The admin panel is a collection of interfaces and utilities for platform operators:

| Component | Path | Description |
|-----------|------|-------------|
| **CLI** | `admin/cli/` | Interactive terminal admin panel |
| **REST API** | `admin/rest-api/` | RESTful admin backend |
| **Web Dashboard** | `admin/web/` | React admin web frontend |
| **SSH** | `admin/ssh/` | Secure shell access panel |
| **Email** | `admin/email/` | Transactional email admin server |
| **Slack Bot** | `admin/bot/slack/` | Slack notification/control bot |
| **Telegram Bot** | `admin/bot/telegram/` | Telegram notification/control bot |
| **Webhook** | `admin/webhook/` | Inbound/outbound webhook handler |
| **Shared** | `admin/shared/` | Metrics, alerts, SLA, audit, policies, compliance, recommendations, webhooks |

---

## ✅ Shipped — March 2026

### CLI (`admin/cli/`)
- [x] Interactive menu-driven terminal admin panel
- [x] Service management: start, stop, restart, rollout undo
- [x] Health status overview across all services
- [x] Role-based access with `role.json` stored in `.admin-cli/`
- [x] Audit log appended on every destructive action
- [x] Confirmation prompt guard for risky operations
- [x] TUI helpers (`admin/shared/tui.js`) for colour/table rendering

### REST API (`admin/rest-api/`)
- [x] RESTful admin endpoints for user management, service control
- [x] JWT authentication with role validation (`admin/shared/auth.js`)
- [x] Rate limiting and CORS protection
- [x] Swagger/OpenAPI documentation

### Web Dashboard (`admin/web/`)
- [x] React 18 SPA with Material-UI v7
- [x] AdminLogin and AdminDashboard pages
- [x] Auth store (Zustand) with JWT refresh
- [x] Notification centre with real-time push
- [x] Error page suite (401, 403, 404, 429, 500, 503)
- [x] PWA: Service Worker, offline page, install banner
- [x] Playwright E2E smoke tests (`tests/smoke.spec.js`, `tests/auth-content-flow.spec.js`)
- [x] Opt-in Docker Compose profile (`--profile admin`)

### Shared Utilities
- [x] `metrics.js` — Service metrics collector with historical storage
- [x] `alerts.js` — Alert manager with severity routing
- [x] `sla.js` — SLA breach detection and reporting
- [x] `audit.js` — Immutable audit log writer
- [x] `auth.js` — JWT token generation/verification
- [x] `compliance.js` — Policy compliance scanner
- [x] `cost-analyzer.js` — Infrastructure cost tracking
- [x] `multi-cluster.js` — Multi-cluster health aggregation
- [x] `policies.js` — Policy rule engine
- [x] `recommendations.js` — Recommendation history and retrieval
- [x] `trend-analysis.js` — Metric trend computation
- [x] `webhooks.js` — Outbound webhook dispatcher

### Notification Channels
- [x] Slack bot (`admin/bot/slack/`) — alerts and approval requests
- [x] Telegram bot (`admin/bot/telegram/`) — alerts and approval requests
- [x] Email (`admin/email/`) — SMTP/Nodemailer integration
- [x] Webhook (`admin/webhook/`) — generic outbound dispatcher

---

## 🔜 Planned — Q2 2026

### CLI Enhancements
- [ ] Plugin system: load additional CLI commands from `admin/cli/plugins/`
- [ ] Batch operations: apply command to multiple services at once
- [ ] Diff viewer: show what would change before applying a config update
- [ ] Auto-complete for service names and command flags (readline hints)
- [ ] `tail-logs` command: stream live service logs via Docker/k8s API
- [ ] Config snapshot/restore: save and restore service configuration
- [ ] Side-by-side service comparison: CPU, memory, error rate, latency

### REST API Enhancements
- [ ] GraphQL layer: expose platform metrics and audit log via GraphQL
- [ ] Bulk user management: batch suspend/activate/export users
- [ ] Webhook management endpoints: CRUD for outbound webhook registrations
- [ ] API key management: issue, rotate, revoke per-service API keys
- [ ] Rate-limit dashboard endpoint: view per-IP/per-user limit status
- [ ] Event sourcing: replay admin events from audit log for debugging

### Web Dashboard Enhancements
- [ ] **Live service health dashboard** — real-time CPU, memory, latency, error rate per service
- [ ] **User management table** — search, filter, bulk actions (suspend, role change)
- [ ] **Audit log viewer** — filterable table with export (CSV/JSON)
- [ ] **SLA breach timeline** — visual timeline of breaches and resolutions
- [ ] **Alert rule editor** — create/edit alert rules via UI (no YAML required)
- [ ] **Cost breakdown chart** — service-level cost visualization
- [ ] **Permission approval UI** — review and approve/deny AI agent actions inline
- [ ] **Dark mode** — toggle via appearance store (already stubbed in `appearanceStore.js`)
- [ ] **Keyboard shortcuts** — modal showing all shortcuts (`useKeyboardShortcuts.js`)
- [ ] Responsive mobile layout (tablet + phone breakpoints)
- [ ] Internationalization (i18n) scaffolding

---

## 🔜 Planned — Q3 2026

### Security Hardening
- [ ] **2FA enforcement** for admin login (`ENABLE_ADMIN_2FA=true`)
- [ ] **IP allowlist** enforcement at REST API and SSH layers
- [ ] **mTLS** between CLI/API and internal services
- [ ] **Session management**: concurrent session limits, forced logout
- [ ] **Admin activity anomaly detection**: flag unusual access patterns (off-hours, bulk queries)
- [ ] **Secrets vault integration** (HashiCorp Vault / AWS Secrets Manager) for admin credentials
- [ ] Rate limiting on admin REST API (per-IP and per-user)
- [ ] OWASP Top 10 audit of admin REST API endpoints

### Compliance & Governance
- [ ] **GDPR data export** endpoint: export all user data as structured JSON
- [ ] **Right to erasure** workflow: multi-step approval before data deletion
- [ ] **Consent audit trail**: track consent changes per user
- [ ] **Data retention policy enforcer**: automated cleanup of expired data
- [ ] **Compliance report generator**: PDF/HTML compliance snapshot on demand
- [ ] SOC 2 evidence collection automation

### SSH Administration
- [ ] Bastion-mode SSH gateway with full session recording
- [ ] Key rotation workflow: generate, distribute, revoke SSH keys via CLI
- [ ] SSH session audit: timestamps, commands run, duration
- [ ] Emergency break-glass procedure: temporary elevated access with mandatory MFA

---

## 🔜 Planned — Q4 2026

### Observability & Operations
- [ ] **OpenTelemetry integration**: traces from admin actions to backend services
- [ ] **Admin Grafana dashboards**: pre-built panels for service health, SLA, cost
- [ ] **Incident management**: create, track, and resolve incidents from the admin panel
- [ ] **Runbook automation**: trigger documented recovery steps from the UI
- [ ] **Change management log**: link every admin action to a ticket/jira card
- [ ] **SLA report exporter**: scheduled PDF reports to stakeholders

### Multi-Tenancy & Scale
- [ ] **Tenant management**: create/suspend/configure tenants (for SaaS mode)
- [ ] **Resource quota management**: set per-tenant CPU/memory/storage limits
- [ ] **Billing dashboard**: usage-based cost breakdown per tenant
- [ ] **White-labelling**: custom logos, colours, domains per tenant from admin UI

### Developer Experience
- [ ] **Feature flag management**: toggle feature flags per environment from admin UI
- [ ] **Config management UI**: edit service environment variables with change history
- [ ] **Deployment pipeline viewer**: visualize current deploy status and history
- [ ] **Database migration runner**: trigger and monitor DB migrations from admin UI
- [ ] **Log aggregation viewer**: centralized structured log search (ElasticSearch/Loki)

### Enter Connection Between several Admin Panels
- [ ] **AI<->CLI**: If AI & CLI both enabled then Admin cam monitor AI admin panels works from CLI also admin can approve and have full control AI admins workflow
- [ ] **AI<->Web Dashboard**: If AI & Web Dashboard both enabled then Admin cam monitor AI admin panels works from Web Dashboard/AI admin monitor page also admin can approve and control AI admins workflow and view graphical vision of AI admin and manage it
- [ ] **AI<->SSH**: If AI & SSH both enabled then Admin cam monitor AI admin panels works from SSH also admin can approve and control AI admins workflow those possible
- [ ] **AI<->REST API**: If AI & REST API both enabled then Admin cam monitor AI admin panels works from REST API also admin can approve and control AI admins workflow those possible
- [ ] **AI<->WEBHOOK**: If AI & WEBHOOK both enabled then Admin cam monitor AI admin panels works from WEBHOOK also admin can approve and control AI admins workflow those possible

---

## Web Dashboard Component Plan

| Status | Component | Description |
|--------|-----------|-------------|
| ✅ | `AdminLogin.js` | Login page with JWT auth |
| ✅ | `AdminDashboard.js` | Overview dashboard (stub) |
| ✅ | Error pages suite | 401, 403, 404, 429, 500, 503 |
| ✅ | `NotificationCenter.js` | Bell icon with alert list |
| 🔜 | `ServiceHealthGrid.js` | Live service cards with spark lines |
| 🔜 | `UserManagementTable.js` | Searchable, filterable user table |
| 🔜 | `AuditLogTable.js` | Filterable audit log with export |
| 🔜 | `SLATimeline.js` | Visual breach timeline |
| 🔜 | `AlertRuleEditor.js` | Alert rule CRUD UI |
| 🔜 | `CostBreakdown.js` | Cost chart by service |
| 🔜 | `AIPermissionInbox.js` | Review/approve AI agent actions |
| 🔜 | `IncidentTracker.js` | Create/track/resolve incidents |
| 🔜 | `FeatureFlagToggle.js` | Per-environment flag management |
| 🔜 | `TenantManager.js` | Multi-tenant management (SaaS) |

---

## Notification Channel Plan

| Channel | Status | Improvements |
|---------|--------|-------------|
| Slack | ✅ operational | Interactive approval buttons (v2.0) |
| Telegram | ✅ operational | Inline keyboard for approve/deny (v2.0) |
| Email (SMTP) | ✅ operational | HTML templates, unsubscribe link |
| Webhook | ✅ operational | Retry with exponential backoff |
| PagerDuty | 🔜 Q2 | Integration for on-call escalations |
| MS Teams | 🔜 Q3 | Adaptive Card notifications |
| Opsgenie | 🔜 Q3 | Alert sync and dedup |

---

## Key Metrics / Success Criteria

| KPI | Target |
|-----|--------|
| Admin action to approval time (P50) | < 5 minutes |
| False-positive alert rate | < 5% |
| Admin panel uptime | > 99.5% |
| CLI command response time (P95) | < 500 ms |
| Web dashboard Time-to-Interactive | < 2 s |
| Audit log coverage | 100% of destructive actions |

---

*Last updated: March 11, 2026*
