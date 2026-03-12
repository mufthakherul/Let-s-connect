# Development Documentation

Technical references for contributors and developers building on Let's Connect.

## Contents

### Getting Started

| Document | Description |
|----------|-------------|
| [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | **Complete developer guide** — architecture, setup, best practices |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Quick reference card for common tasks |

### Technical Architecture & API

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture and microservices design |
| [WORKFLOW.md](WORKFLOW.md) | Request lifecycle, data flows, and system diagrams |
| [API.md](API.md) | Complete REST API reference for all services |
| [CHANGELOG.md](CHANGELOG.md) | Version history and changes |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | Current implementation status |

### Data & Seeding

| Document | Description |
|----------|-------------|
| [ELASTICSEARCH_IMPLEMENTATION.md](ELASTICSEARCH_IMPLEMENTATION.md) | Elasticsearch search setup |
| [DYNAMIC_SEEDING_GUIDE.md](DYNAMIC_SEEDING_GUIDE.md) | Database seeding guide |
| [DYNAMIC_SEEDING_QUICK_START.md](DYNAMIC_SEEDING_QUICK_START.md) | Quick start for seeding data |
| [STREAMING_SEEDING_QUICK_START.md](STREAMING_SEEDING_QUICK_START.md) | Seed streaming data quickly |
| [STREAMING_SEEDING_OPTIMIZATION.md](STREAMING_SEEDING_OPTIMIZATION.md) | Streaming data optimization guide |

### Streaming & TV Features

| Document | Description |
|----------|-------------|
| [TV_QUICK_START.md](TV_QUICK_START.md) | Get started with the TV system in 5 minutes |
| [TV_ADVANCED_FEATURES.md](TV_ADVANCED_FEATURES.md) | Search, health checks, recommendations |
| [TV_PROFESSIONAL_UPGRADE.md](TV_PROFESSIONAL_UPGRADE.md) | 60,000+ TV channels with enrichment |
| [TV_API_INTEGRATION.md](TV_API_INTEGRATION.md) | TV API integration reference |

### Testing & Audits

| Document | Description |
|----------|-------------|
| [ENGINEERING_AUDIT_REPORT_2026-03-02.md](ENGINEERING_AUDIT_REPORT_2026-03-02.md) | Full code/runtime audit |
| [FULL_FEATURE_TEST_PLAN_2026-03-02.md](FULL_FEATURE_TEST_PLAN_2026-03-02.md) | Feature test plan |

### Operations & Reliability

| Document | Description |
|----------|-------------|
| [operations/INCIDENT_RESPONSE_RUNBOOK.md](operations/INCIDENT_RESPONSE_RUNBOOK.md) | Production incident triage, mitigation, escalation |
| [operations/POST_INCIDENT_REVIEW_TEMPLATE.md](operations/POST_INCIDENT_REVIEW_TEMPLATE.md) | Standard PIR template for SEV incidents |
| [operations/ERROR_BUDGET_POLICY.md](operations/ERROR_BUDGET_POLICY.md) | SLO policy, burn-rate thresholds, delivery guardrails |
| [operations/RELEASE_HEALTH_AND_CANARY_CHECKLIST.md](operations/RELEASE_HEALTH_AND_CANARY_CHECKLIST.md) | Release gate checklist and canary rollback criteria |
| [operations/OPERATIONAL_DRILL_CADENCE.md](operations/OPERATIONAL_DRILL_CADENCE.md) | Bi-weekly/monthly game-day and rollback drill schedule |
| [operations/GAME_DAY_SCENARIO_TEMPLATE.md](operations/GAME_DAY_SCENARIO_TEMPLATE.md) | Reusable template for incident/rollback drill scenarios |

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Material-UI v5, Zustand, React Query |
| Backend | Node.js, Express (microservices) |
| Database | PostgreSQL 15, Sequelize ORM |
| Cache | Redis 7 (ioredis) |
| Storage | MinIO (S3-compatible) |
| Real-time | Socket.IO |
| Logging | Pino (structured JSON logs) |
| Auth | JWT + OAuth (Google, GitHub) |
| Infra | Docker, Kubernetes, Nginx/Caddy |
| Monitoring | Prometheus, Grafana |

## Shared Modules

All shared backend utilities live in `services/shared/`:

| Module | Purpose |
|--------|---------|
| `logger.js` | Pino structured logging |
| `errorHandling.js` | AppError classes + global error handler |
| `response-wrapper.js` | Standardized API responses |
| `caching.js` | Redis cache with TTL helpers |
| `db-sync-policy.js` | Safe Sequelize schema sync |
| `monitoring.js` | Prometheus metrics + health checks |
| `security-utils.js` | Env validation, identity guards |
| `startup.js` | Graceful startup/shutdown |
| `cache-policy.js` | Unified Redis cache policy and invalidation helpers |

## Development Workflow

```bash
# 1. Start infrastructure
docker compose up postgres redis -d

# 2. Install frontend dependencies
cd frontend && npm install --legacy-peer-deps

# 3. Start frontend dev server
PORT=3000 REACT_APP_API_URL=http://localhost:8000 npm start

# 4. Run a specific backend service (e.g. user-service)
cd services/user-service && npm install && npm start
```

## Code Organization

```
services/
├── shared/              # Shared utilities (logger, cache, error handling)
├── api-gateway/         # API Gateway (auth, routing, rate limiting)
├── user-service/        # User auth & profiles (modular: models/routes/controllers)
├── content-service/     # Posts, feeds, groups (modular)
├── messaging-service/   # Chat & WebRTC
├── collaboration-service/ # Docs, wikis, tasks
├── media-service/       # File uploads & storage
├── shop-service/        # E-commerce
├── streaming-service/   # Radio, TV, live streaming
└── ai-service/          # AI features (Gemini)
```
