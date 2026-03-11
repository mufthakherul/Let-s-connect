# AI Admin Panel — Roadmap (2026+)

<!-- markdownlint-disable MD022 MD024 MD032 MD047 -->

**Version:** 1.0  
**Date:** March 11, 2026  
**Scope:** Milonexa AI Admin Agent — autonomous monitoring, code intelligence, feedback analysis, documentation, and testing capabilities  
**Related:** [General Roadmap](../../ROADMAP.md) · [Admin Panel Roadmap](./ADMIN_PANEL_ROADMAP.md)

---

## Overview

The AI Admin Agent (`admin/ai/`) is an autonomous background process that continuously monitors, analyzes, and improves the platform using a local Ollama LLM — fully private, no external API keys.  
The agent runs as a Docker service and exposes an HTTP control API on `AI_STATUS_PORT` (default: 8890).

---

## ✅ Shipped — v1.0 (February 2026)

### Core Agent
- State machine: `IDLE → MONITORING → ANALYZING → ACTING → NOTIFYING → EMERGENCY`
- 60-second monitoring cycle (configurable)
- Metrics collection, alert management, SLA tracking
- Remediation engine and recommendation engine
- Notifier (multi-channel: Slack, email, webhook)
- PermissionGate: human-approval gate for destructive actions
- HTTP status API: `/health`, `/status`, `/permissions/:id/approve|deny`
- Emergency mode: cycle reduced to 10 s, immediate notifications

### Runtime Modules (v1.0)
| Module | Capability |
|--------|-----------|
| `healer.js` | Auto-restart/stop/rollback services; CPU/memory/error-rate thresholds |
| `security.js` | Brute-force detection, DoS spike detection, config drift monitoring, IP blocking |
| `optimizer.js` | Cache warming, query hints, right-sizing, auto-scaling rule proposals |
| `notifier.js` | Slack, email, webhook, CLI notification dispatch |
| `permission.js` | PermissionGate: pending/history persistence, timeout, approve/deny |

### LLM Providers (v1.0)
- `demo` — rule-based only, no API key
- `openai` — GPT-4o-mini via API key
- `anthropic` — Claude Haiku via API key

---

## ✅ Shipped — v2.0 (March 2026)

### Local LLM: Ollama
- [x] Replaced all external LLM calls with local Ollama runtime
- [x] `ollama` provider added: `callOllama()` via Node built-in `http`
- [x] Custom `Modelfile` persona on `llama3.2` with platform-specific context
- [x] Docker Compose: `ollama` + `ollama-init` services with persistent model volume
- [x] `AI_STATUS_TOKEN` bearer-auth guard on HTTP control endpoints

### New Modules (v2.0)

#### `code-analyzer.js` — AI Code Intelligence
- [x] Walks entire project source tree on configurable cadence
- [x] 15 static analysis rules (9 security, 6 quality)
- [x] Security rules: hardcoded secrets, `eval()`, SQL injection, prototype pollution, path traversal, weak crypto, XSS, open redirects, insecure `Math.random()`
- [x] Quality rules: empty catch blocks, TODO/FIXME markers, sensitive data in logs
- [x] LLM-assisted fix proposals for critical/high severity findings
- [x] Admin-gated code fix application (backup created before overwrite)
- [x] Reports written to `.admin-cli/ai/code-analysis/YYYY-MM-DD.json`

#### `feedback-processor.js` — User Feedback Intelligence
- [x] Reads feedback JSON from `.admin-cli/feedback/` and `POST /feedback` endpoint
- [x] LLM categorization: `bug`, `feature_request`, `ux_issue`, `performance`, `praise`, `other`
- [x] Priority scoring: `high`, `medium`, `low`
- [x] Developer ticket title + description generation
- [x] Weekly summary reports (ISO 8601 week) in `.admin-cli/ai/feedback-analysis/`
- [x] High-priority items queued for admin review via PermissionGate

#### `doc-generator.js` — AI Documentation Generator
- [x] Walks all services, extracts Express route definitions
- [x] LLM generates user-friendly markdown guides per service
- [x] Combined `PLATFORM_GUIDE.md` with cross-service index
- [x] Admin-gated write to `docs/generated/` tree
- [x] Staged docs in `.admin-cli/ai/generated-docs/`

#### `test-generator.js` — AI Test Stub Generator
- [x] Discovers untested routes per service (no existing test file)
- [x] LLM generates complete Jest stubs: success, 401, 400 cases
- [x] Inline Express stub app in fallback (no dependency on `require('../server')`)
- [x] Admin-gated write to `services/<svc>/tests/ai-generated.test.js`
- [x] Staged stubs in `.admin-cli/ai/generated-tests/`

### Agent Orchestrator (v2.0)
- [x] New `REVIEWING` FSM state for heavy analysis sub-cycles
- [x] Staggered sub-cycle scheduling: feedback → cycle 1, code → cycle 2, docs → cycle 3, tests → cycle 4
- [x] `AGENT_VERSION` constant
- [x] 8 new HTTP endpoints: `GET/POST /code-analysis`, `/feedback`, `/docs`, `/tests` (+`/trigger`)
- [x] Extended permission handler for `apply_code_fix`, `write_generated_docs`, `write_generated_tests`

---

## 🔜 Planned — v2.1 (Q2 2026)

### Streaming & Real-Time Intelligence
- [ ] SSE streaming for LLM responses in long-running analysis cycles
- [ ] Real-time code analysis on file-save (inotify/FSWatcher integration)
- [ ] Incremental analysis: only re-scan changed files (git diff-based)
- [ ] Live finding dashboard via WebSocket push to admin web panel

### Enhanced Code Analysis
- [ ] AST-based analysis (acorn/esprima) for deeper control-flow checks
- [ ] Dependency vulnerability scanner (npm audit API integration)
- [ ] Dead code detection (unused exports, unreachable branches)
- [ ] Duplicate code detection (jscpd integration)
- [ ] Cyclomatic complexity scoring per function
- [ ] Auto-fix dry-run mode: show diff without writing to disk

### LLM Enhancement
- [ ] Multi-turn context for code fix proposals (explain → propose → refine)
- [ ] Model routing: use smaller model for classification, larger for generation
- [ ] Prompt caching for repeated analysis patterns
- [ ] LLM confidence scoring shown in findings report
- [ ] Custom prompt templates per rule ID (operator-configurable)

---

## 🔜 Planned — v2.2 (Q3 2026)

### Advanced Feedback & Feature Intelligence
- [ ] User feedback ingestion from multiple channels (email, in-app widget, GitHub issues API)
- [ ] Sentiment trend analysis across time (weekly/monthly charts)
- [ ] Automatic GitHub issue creation for approved `feature_request` items
- [ ] Feature impact scoring: estimate effort × user demand
- [ ] Admin approval workflow for feature suggestions → backlog items
- [ ] NLP keyword clustering for feedback topic discovery

### Test Intelligence
- [ ] Coverage gap analysis: parse Jest/Istanbul reports to find untested branches
- [ ] Property-based test generation (fast-check integration)
- [ ] Mutation testing integration (Stryker) — LLM interprets survival report
- [ ] Auto-fix test failures: LLM proposes corrected assertion or fixture
- [ ] Flaky test detection and quarantine

### Documentation Intelligence
- [ ] Diff-based doc updates: only regenerate changed service sections
- [ ] OpenAPI spec generation from route analysis
- [ ] Changelog generation from git log + LLM summarization
- [ ] Admin-facing runbook generation for each service
- [ ] Localization: LLM translates generated docs to configured languages

---

## 🔜 Planned — v3.0 (Q4 2026)

### Autonomous Development Loop
- [ ] Full PR generation: LLM writes code change, creates branch, submits PR for review
- [ ] Automated regression test before proposing any fix
- [ ] A/B feature flagging: deploy LLM-proposed changes to canary users
- [ ] Rollback trigger: revert PR if canary error rate spikes
- [ ] Self-healing documentation: agent detects doc/code drift and proposes sync

### Multi-Agent Architecture
- [ ] Separate specialized agents: security-agent, performance-agent, quality-agent
- [ ] Agent orchestrator with priority queue and resource budget
- [ ] Inter-agent message bus for coordinated analysis
- [ ] Human-in-the-loop escalation for cross-agent conflicts

### Advanced Observability
- [ ] Agent performance metrics (LLM latency, tokens used, fix acceptance rate)
- [ ] Audit trail for every AI action (immutable append-only log)
- [ ] Cost tracking per model call (token-level)
- [ ] Admin web dashboard integration: AI findings panel in admin web UI

---

## HTTP API Reference (current: v2.0)

All endpoints except `GET /health` require `Authorization: Bearer <AI_STATUS_TOKEN>`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Liveness probe (always public) |
| `GET` | `/status` | Full agent state snapshot |
| `GET` | `/permissions` | List pending admin-approval requests |
| `POST` | `/permissions/:id/approve` | Approve a pending action |
| `POST` | `/permissions/:id/deny` | Deny a pending action |
| `GET` | `/code-analysis` | Last analysis summary + findings + proposed fixes |
| `POST` | `/code-analysis/trigger` | Trigger immediate analysis (async) |
| `GET` | `/feedback` | Feedback summary, suggestions, recent processed |
| `POST` | `/feedback` | Ingest a new feedback entry |
| `GET` | `/docs` | Doc generation summary |
| `POST` | `/docs/trigger` | Trigger immediate doc generation (async) |
| `GET` | `/tests` | Test stub generation summary |
| `POST` | `/tests/trigger` | Trigger immediate test generation (async) |

---

## Environment Variables (current: v2.0)

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_ADMIN_AI` | `false` | Must be `true` to start agent |
| `AI_PROVIDER` | `ollama` | `demo` \| `ollama` \| `openai` \| `anthropic` |
| `OLLAMA_MODEL` | `llama3.2` | Ollama model to use |
| `OLLAMA_HOST` | `localhost` | Ollama server hostname |
| `OLLAMA_PORT` | `11434` | Ollama server port |
| `AI_STATUS_TOKEN` | *(empty)* | Bearer token for HTTP API auth |
| `AI_STATUS_PORT` | `8890` | HTTP control server port |
| `AI_CYCLE_INTERVAL_SECONDS` | `60` | Main monitoring cycle interval |
| `AI_CODE_ANALYSIS_EVERY_N_CYCLES` | `10` | Code analysis cadence |
| `AI_DOC_GEN_EVERY_N_CYCLES` | `20` | Doc generation cadence |
| `AI_TEST_GEN_EVERY_N_CYCLES` | `30` | Test generation cadence |
| `AI_FEEDBACK_EVERY_N_CYCLES` | `5` | Feedback processing cadence |
| `AI_AUTO_HEAL` | `true` | Auto-heal non-critical issues |
| `AI_AUTO_SECURITY` | `true` | Auto-respond to low-severity threats |
| `AI_EMERGENCY_NOTIFY` | `true` | Notify on emergency mode entry |
| `AI_PERMISSION_TIMEOUT_MINUTES` | `30` | Auto-expire pending permissions |

---

## Security Posture

| Control | Status |
|---------|--------|
| All actions gated via PermissionGate | ✅ |
| Bearer token auth on HTTP endpoints | ✅ v2.0 |
| Code fixes backed up before apply | ✅ |
| File writes restricted to project root | ✅ |
| Ollama runs locally (no external network) | ✅ |
| Audit log of all AI actions | ✅ |
| Permission auto-expiry | ✅ |
| Destructive actions require prod confirmation | ✅ |
| Sensitive field masking in logs | 🔜 v2.1 |
| mTLS between agent and services | 🔜 v2.2 |

---

*Last updated: March 11, 2026*
