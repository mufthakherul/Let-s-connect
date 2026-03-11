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

## ✅ Shipped — v2.1 (Q2 2026)

### Streaming & Real-Time Intelligence
- [x] SSE streaming for LLM responses in long-running analysis cycles (`GET /stream`)
- [x] Real-time code analysis on file-save (`file-watcher.js` — Node.js FSWatcher with debounce)
- [x] Incremental analysis: only re-scan changed files (git diff-based via `analyzeIncremental()`)
- [x] Live finding dashboard via WebSocket push to admin web panel (`GET /ws`, RFC 6455 pure Node.js)

### Enhanced Code Analysis
- [x] AST-based analysis (acorn) for deeper control-flow checks (`with`, `new Function`, `setTimeout(string)`, unreachable code)
- [x] Dependency vulnerability scanner (npm audit API integration — `dep-scanner.js`)
- [x] Dead code detection (unused exports via two-pass require/exports analysis)
- [x] Duplicate code detection (content-hash of normalised function bodies)
- [x] Cyclomatic complexity scoring per function
- [x] Auto-fix dry-run mode: show diff without writing to disk (`dryRunFix()` / `POST /code-analysis/dry-run`)

### LLM Enhancement
- [x] Multi-turn context for code fix proposals (explain → propose → refine in `_generateFixMultiTurn()`)
- [x] Model routing: use smaller model for classification, larger for generation (`OLLAMA_MODEL_SMALL` / `OLLAMA_MODEL_LARGE` env vars)
- [x] Prompt caching for repeated analysis patterns (`prompt-cache.js` — LRU + TTL, `GET /prompt-cache/stats`)
- [x] LLM confidence scoring shown in findings report (surfaced in `source: 'ast'` findings and fix proposals)
- [x] Custom prompt templates per rule ID (`prompt-templates.js` — operator-configurable via `PUT /prompt-templates/:ruleId`)

### New HTTP Endpoints (v2.1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/dep-scan` | Last dependency vulnerability scan summary + findings |
| `POST` | `/dep-scan/trigger` | Trigger immediate npm audit scan |
| `GET`  | `/complexity` | Cyclomatic complexity report (sorted by score) |
| `GET`  | `/duplicates` | Duplicate code groups |
| `GET`  | `/dead-code` | Dead code / unused export symbols |
| `POST` | `/code-analysis/dry-run` | Preview fix diff without writing to disk |
| `GET`  | `/prompt-templates` | List custom + built-in prompt templates |
| `POST` | `/prompt-templates/reload` | Hot-reload templates from disk |
| `PUT`  | `/prompt-templates/:ruleId` | Save a custom template |
| `DELETE` | `/prompt-templates/:ruleId` | Remove a custom template |
| `GET`  | `/prompt-cache/stats` | Cache hit/miss/eviction counters |
| `POST` | `/prompt-cache/clear` | Flush prompt cache |
| `GET`  | `/file-watcher/status` | File-watcher running status |
| `POST` | `/file-watcher/start` | Start FSWatcher (real-time analysis) |
| `POST` | `/file-watcher/stop` | Stop FSWatcher |
| `GET`  | `/stream` | SSE event stream (text/event-stream) |
| `GET`  | `/ws` | WebSocket live finding dashboard (RFC 6455) |

---

## ✅ Implemented — v2.2 (Q3 2026)

### Advanced Feedback & Feature Intelligence
- [x] User feedback ingestion from multiple channels (email, in-app widget, GitHub issues API) — `feedback-channels.js`
- [x] Sentiment trend analysis across time (weekly/monthly charts) — `feedback-intelligence.js`
- [x] Automatic GitHub issue creation for approved `feature_request` items — `feedback-intelligence.js`
- [x] Feature impact scoring: estimate effort × user demand — `feedback-intelligence.js`
- [x] Admin approval workflow for feature suggestions → backlog items — `feedback-intelligence.js` + PermissionGate
- [x] NLP keyword clustering for feedback topic discovery — `feedback-intelligence.js`

### Test Intelligence
- [x] Coverage gap analysis: parse Jest/Istanbul reports to find untested branches — `test-intelligence.js`
- [x] Property-based test generation (fast-check integration) — `test-intelligence.js`
- [x] Mutation testing integration (Stryker) — LLM interprets survival report — `test-intelligence.js`
- [x] Auto-fix test failures: LLM proposes corrected assertion or fixture — `test-intelligence.js`
- [x] Flaky test detection and quarantine — `test-intelligence.js`

### Documentation Intelligence
- [x] Diff-based doc updates: only regenerate changed service sections — `doc-intelligence.js`
- [x] OpenAPI spec generation from route analysis — `doc-intelligence.js`
- [x] Changelog generation from git log + LLM summarization — `doc-intelligence.js`
- [x] Admin-facing runbook generation for each service — `doc-intelligence.js`
- [x] Localization: LLM translates generated docs to configured languages — `doc-intelligence.js`

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

## HTTP API Reference (current: v2.2)

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
| `POST` | `/code-analysis/dry-run` | Preview fix diff without writing to disk *(v2.1)* |
| `GET` | `/feedback` | Feedback summary, suggestions, recent processed |
| `POST` | `/feedback` | Ingest a new feedback entry |
| `GET` | `/docs` | Doc generation summary |
| `POST` | `/docs/trigger` | Trigger immediate doc generation (async) |
| `GET` | `/tests` | Test stub generation summary |
| `POST` | `/tests/trigger` | Trigger immediate test generation (async) |
| `GET` | `/dep-scan` | Dependency vulnerability scan summary + findings *(v2.1)* |
| `POST` | `/dep-scan/trigger` | Trigger immediate npm audit scan *(v2.1)* |
| `GET` | `/complexity` | Cyclomatic complexity report per function *(v2.1)* |
| `GET` | `/duplicates` | Duplicate code groups *(v2.1)* |
| `GET` | `/dead-code` | Unused exported symbols *(v2.1)* |
| `GET` | `/prompt-templates` | List custom + built-in prompt templates *(v2.1)* |
| `POST` | `/prompt-templates/reload` | Hot-reload templates from disk *(v2.1)* |
| `PUT` | `/prompt-templates/:ruleId` | Save a custom template *(v2.1)* |
| `DELETE` | `/prompt-templates/:ruleId` | Remove a custom template *(v2.1)* |
| `GET` | `/prompt-cache/stats` | Cache hit/miss/eviction counters *(v2.1)* |
| `POST` | `/prompt-cache/clear` | Flush prompt cache *(v2.1)* |
| `GET` | `/file-watcher/status` | FSWatcher running status *(v2.1)* |
| `POST` | `/file-watcher/start` | Start real-time file watching *(v2.1)* |
| `POST` | `/file-watcher/stop` | Stop file watching *(v2.1)* |
| `GET` | `/stream` | SSE event stream (`text/event-stream`) *(v2.1)* |
| `GET` | `/ws` | WebSocket live finding dashboard (RFC 6455) *(v2.1)* |
| `GET` | `/feedback-channels/status` | Multi-channel ingestion status *(v2.2)* |
| `POST` | `/feedback-channels/ingest` | Trigger email + GitHub channel ingestion *(v2.2)* |
| `GET` | `/feedback-intelligence/trends` | Weekly sentiment trend history *(v2.2)* |
| `GET` | `/feedback-intelligence/backlog` | Feature backlog items with impact scores *(v2.2)* |
| `GET` | `/feedback-intelligence/issues` | Auto-created GitHub issues *(v2.2)* |
| `POST` | `/feedback-intelligence/analyze` | Trigger feedback intelligence analysis *(v2.2)* |
| `GET` | `/test-intelligence` | Coverage gaps, flaky tests, fix proposals *(v2.2)* |
| `POST` | `/test-intelligence/analyze` | Trigger test intelligence analysis *(v2.2)* |
| `GET` | `/doc-intelligence` | OpenAPI specs, runbooks, changelog summary *(v2.2)* |
| `GET` | `/doc-intelligence/openapi/:service` | OpenAPI 3.0 JSON spec for a service *(v2.2)* |
| `GET` | `/doc-intelligence/runbook/:service` | Operational runbook for a service *(v2.2)* |
| `GET` | `/doc-intelligence/changelog` | Latest generated changelog entry *(v2.2)* |
| `POST` | `/doc-intelligence/analyze` | Trigger documentation intelligence analysis *(v2.2)* |

---

## Environment Variables (current: v2.2)

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_ADMIN_AI` | `false` | Must be `true` to start agent |
| `AI_PROVIDER` | `ollama` | `demo` \| `ollama` \| `openai` \| `anthropic` |
| `OLLAMA_MODEL` | `llama3.2` | Ollama model to use (default for all tasks) |
| `OLLAMA_MODEL_SMALL` | *(OLLAMA_MODEL)* | Small model for classification tasks *(v2.1)* |
| `OLLAMA_MODEL_LARGE` | *(OLLAMA_MODEL)* | Large model for generation tasks *(v2.1)* |
| `OLLAMA_HOST` | `localhost` | Ollama server hostname |
| `OLLAMA_PORT` | `11434` | Ollama server port |
| `AI_STATUS_TOKEN` | *(empty)* | Bearer token for HTTP API auth |
| `AI_STATUS_PORT` | `8890` | HTTP control server port |
| `AI_CYCLE_INTERVAL_SECONDS` | `60` | Main monitoring cycle interval |
| `AI_CODE_ANALYSIS_EVERY_N_CYCLES` | `10` | Code analysis cadence |
| `AI_DOC_GEN_EVERY_N_CYCLES` | `20` | Doc generation cadence |
| `AI_TEST_GEN_EVERY_N_CYCLES` | `30` | Test generation cadence |
| `AI_FEEDBACK_EVERY_N_CYCLES` | `5` | Feedback processing cadence |
| `AI_DEP_SCAN_EVERY_N_CYCLES` | `15` | Dependency vulnerability scan cadence *(v2.1)* |
| `AI_AUTO_HEAL` | `true` | Auto-heal non-critical issues |
| `AI_AUTO_SECURITY` | `true` | Auto-respond to low-severity threats |
| `AI_EMERGENCY_NOTIFY` | `true` | Notify on emergency mode entry |
| `AI_PERMISSION_TIMEOUT_MINUTES` | `30` | Auto-expire pending permissions |
| `AI_WATCH_FILES` | `false` | Enable real-time FSWatcher for incremental analysis *(v2.1)* |
| `AI_PROMPT_CACHE_TTL_MINUTES` | `30` | Prompt cache TTL *(v2.1)* |
| `FEEDBACK_CHANNELS` | *(empty)* | Enabled channels: `email,github` *(v2.2)* |
| `FEEDBACK_GITHUB_OWNER` | *(empty)* | GitHub org/owner for issue ingestion and creation *(v2.2)* |
| `FEEDBACK_GITHUB_REPO` | *(empty)* | GitHub repository for issue ingestion and creation *(v2.2)* |
| `FEEDBACK_GITHUB_TOKEN` | *(empty)* | GitHub PAT (required for issue creation, raises API rate limit) *(v2.2)* |
| `FEEDBACK_GITHUB_LABEL` | `user-feedback` | Label filter for GitHub issue ingestion *(v2.2)* |
| `FEEDBACK_GITHUB_ISSUE_LABEL` | `ai-suggestion` | Label applied to auto-created GitHub issues *(v2.2)* |
| `FEEDBACK_EMAIL_DIR` | `.admin-cli/feedback-channels/email` | Email drop-folder path *(v2.2)* |
| `AI_FEEDBACK_CHANNELS_EVERY_N_CYCLES` | `3` | Channel ingestion cadence *(v2.2)* |
| `AI_FEEDBACK_INTEL_EVERY_N_CYCLES` | `8` | Feedback intelligence cadence *(v2.2)* |
| `AI_TEST_INTEL_EVERY_N_CYCLES` | `25` | Test intelligence cadence *(v2.2)* |
| `AI_DOC_INTEL_EVERY_N_CYCLES` | `20` | Documentation intelligence cadence *(v2.2)* |
| `DOC_TARGET_LANGUAGES` | *(empty)* | ISO 639-1 codes for doc translation, e.g. `es,fr,de` *(v2.2)* |
| `DOC_OUTPUT_DIR` | `docs/generated` | Output directory for generated documentation *(v2.2)* |

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
| Sensitive field masking in logs | ✅ v2.1 (prompt cache avoids re-logging) |
| mTLS between agent and services | 🔜 v2.2 |

---

*Last updated: March 11, 2026 (v2.1)*
