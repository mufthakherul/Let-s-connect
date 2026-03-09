# Let's Connect

<!-- markdownlint-disable MD022 MD032 MD047 MD060 -->

A modular, self-hostable social collaboration platform built with a microservices backend, React frontends, and Docker/Kubernetes deployment support.

This repository contains:
- A **user-facing frontend** (`frontend/`)
- An **admin frontend** (`admin_frontend/`, opt-in)
- An **API gateway** plus domain microservices (`services/`)
- **Deployment assets** for Docker and Kubernetes (`docker-compose.yml`, `k8s/`)
- Structured documentation under `docs/`

---

## Platform Overview

Let's Connect combines social, communication, collaboration, commerce, media, and AI capabilities in one platform:

- Social feed, profiles, friends, groups, pages, bookmarks
- Real-time messaging and notifications
- Documents/wiki/collaboration workflows
- Video/media management + streaming (radio/TV)
- E-commerce (products and orders)
- AI-assisted features
- Admin/security service for operations and moderation

---

## Architecture at a Glance

### Runtime topology
- **Frontend clients** talk to the **API Gateway**
- **API Gateway** routes requests to domain services
- Services use **PostgreSQL**, **Redis**, and **MinIO** (plus Elasticsearch for search workloads)

### Core services

| Service | Responsibility | Internal Port |
|---|---|---:|
| `api-gateway` | Routing, auth boundary, docs, proxy orchestration | `8000` |
| `user-service` | Authentication, users, profiles | `8001` |
| `content-service` | Posts, feed, engagement, content entities | `8002` |
| `messaging-service` | Chat/realtime messaging | `8003` |
| `collaboration-service` | Docs/wiki/task collaboration | `8004` |
| `media-service` | Uploads and media metadata/storage plumbing | `8005` |
| `shop-service` | Product and order workflows | `8006` |
| `ai-service` | AI endpoints and assistant features | `8007` |
| `streaming-service` | Radio/TV/streaming experiences | `8009` |
| `security-service` | Admin security and protected admin proxying | `9102` (default) |

---

## Repository Structure

```text
frontend/                 User web app (React)
admin_frontend/           Admin web app (React, optional profile)
services/                 API gateway + backend microservices + shared modules
docs/                     Admin/user/deployment/development documentation
k8s/                      Kubernetes manifests
deploy/                   Reverse proxy and deployment helpers
scripts/                  Utility and operational scripts
Archives/                 Historical archived code/docs
```

---

## Quick Start (Docker)

1. Create local environment file:
   - Copy `.env.example` to `.env`
   - Fill required secrets and runtime values
2. Start the platform:
   - Run Docker Compose build/up for services
3. Open:
   - User frontend: `http://localhost:3000`
   - API gateway: `http://localhost:8000`

### Enable admin frontend (optional)
Run compose with the `admin` profile to include `admin_frontend`.

---

## Local Development

Typical flow:
- Start infra dependencies (Postgres + Redis)
- Run `frontend/` in dev mode
- Run one or more services from `services/<service-name>/`

For detailed commands and variants, use:
- `docs/deployment/QUICK_START.md`
- `docs/development/DEVELOPER_GUIDE.md`

---

## Testing & Health

Current test and health entry points include:
- Frontend unit/integration: `frontend` npm test scripts
- Frontend E2E: Playwright specs in `frontend/tests/`
- Admin E2E: Playwright specs in `admin_frontend/tests/`
- Service health endpoints: `GET /health` on each service

For operational checklists:
- `docs/development/FULL_FEATURE_TEST_PLAN_2026-03-02.md`
- `docs/deployment/DEPLOYMENT_GUIDE.md`

---

## Documentation Map

- **Main docs index:** `docs/README.md`
- **Admin:** `docs/admin/`
- **User:** `docs/user/`
- **Deployment:** `docs/deployment/`
- **Development:** `docs/development/`

### Strategic planning
- Product roadmap (legacy feature planning context): `docs/development/ROADMAP.md`
- Platform modernization roadmap (current execution plan): `ROADMAP.md`

---

## Security & Configuration Notes

- Do **not** commit real secrets.
- Keep `JWT_SECRET`, `INTERNAL_GATEWAY_TOKEN`, admin secrets, and DB credentials strong and unique.
- Use `services/shared/db-sync-policy.js` migration mode intentionally in production-like environments.
- Validate CORS and proxy settings for containerized development (`frontend/src/setupProxy.js`).

---

## Current Priorities (Engineering)

1. Raise quality gates (tests + CI)
2. Improve UX consistency and frontend maintainability
3. Strengthen API and service reliability/security posture
4. Modernize observability and production readiness

See the full implementation plan in:
`ROADMAP.md`

---

## Contributing

When contributing:
- Follow conventions in `.github/copilot-instructions.md`
- Keep docs updated with code changes
- Archive deprecated code/docs under `Archives/`
- Prefer incremental, testable changes

---

Built for extensibility, reliability, and long-term maintainability.