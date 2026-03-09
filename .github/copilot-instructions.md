# Workspace Instructions for AI Agents

## Overview
This workspace uses a modular microservices architecture with a React frontend, API gateway, and multiple backend services. All build, test, and deployment commands, conventions, and pitfalls are documented below to help AI agents operate productively.

---

## Build & Test Commands

### Development
- Start infrastructure:
  ```bash
  docker compose up postgres redis -d
  ```
- Frontend:
  ```bash
  cd frontend && npm install --legacy-peer-deps && npm start
  ```
- Backend (example: user-service):
  ```bash
  cd services/user-service && npm install && npm start
  ```
- Run all services (production):
  ```bash
  docker compose up --build -d
  ```
- With admin panel:
  ```bash
  docker compose --profile admin up --build -d
  ```

### Testing
- Health checks:
  ```bash
  curl http://localhost:8000/health
  # ...repeat for each service
  ```
- Frontend tests:
  ```bash
  cd frontend && npm test
  npm run test:e2e
  ```
- Backend tests:
  (Check each service's package.json for scripts)

---

## Architecture & Code Organization
- Microservices: 9 backend services + API gateway
- Frontend: React 18, Material-UI, Zustand, React Query
- Backend: Node.js 18+, Express, Sequelize ORM
- Shared backend utilities: `services/shared/`
- Docs: `docs/` subdivided into admin, user, deployment, development
- Archive unused code/docs: `Archives/Archive_codes/`, `Archives/Archive_docs/`

---

## Conventions & Patterns
- Admin frontend is opt-in via Docker Compose profile
- Use `--legacy-peer-deps` for frontend dependency install
- Set secure JWT_SECRET in `.env` (see QUICK_START.md)
- Avoid setting `REACT_APP_API_URL` in `.env` for Codespaces/dev containers (use proxy)
- Health endpoints: `/health` on each service
- Use `services/.dockerignore` and per-service `.dockerignore` to prevent host node_modules from being copied
- Shared modules resolve dependencies from calling service's root package.json

---

## Additional Instructions
- When modifying or removing code or documentation, always move old code to `Archives/Archive_codes/` and old docs to `Archives/Archive_docs/` as needed.
- Always git commit and push after finishing work to ensure changes are tracked and shared.

---

## Pitfalls & Common Issues
- CORS errors if `REACT_APP_API_URL` is set incorrectly
- Missing dependencies if `.dockerignore` is not respected
- Archive unused code/docs in correct location
- Secure environment variables before deployment

---

## References
- [QUICK_START.md](QUICK_START.md): Fast setup
- [TESTING.md](TESTING.md): Testing guide
- [ROADMAP.md](ROADMAP.md): Future plans
- [SECURITY_NOTES.md](SECURITY_NOTES.md): Security practices
- [docs/development/ARCHITECTURE.md](docs/development/ARCHITECTURE.md): Full architecture
- [docs/deployment/DEPLOYMENT_GUIDE.md](docs/deployment/DEPLOYMENT_GUIDE.md): Deployment

---

## Example Prompts
- "Build and run all services for development"
- "Test user registration flow end-to-end"
- "Deploy with admin panel enabled"
- "Archive unused code from content-service"
- "Generate API documentation for messaging-service"

---

## Agent Customization Suggestions
- `create-agent frontend-test-runner` — Automate frontend tests and report results
- `create-hook docker-healthcheck` — Monitor health endpoints and auto-restart failed services
- `create-instruction archive-strategy` — Enforce correct archiving of unused code/docs
- `create-prompt deploy-with-admin` — Guide deployment with admin panel enabled

---

## ApplyTo-based Instructions
For complex workspaces, consider instructions scoped to:
- `frontend/` — React build/test/deploy
- `services/` — Microservice conventions, shared utilities
- `docs/` — Documentation structure and update patterns
- `k8s/` — Kubernetes manifests and deployment

---

_Last updated: March 9, 2026_
