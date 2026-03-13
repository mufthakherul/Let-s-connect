# Developer Setup

> This guide is for **developers and contributors** setting up a local development environment for the Milonexa platform.
>
> **New user looking to create an account?** See [Getting Started](Getting-Started) instead.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone the Repository](#2-clone-the-repository)
3. [Environment Configuration](#3-environment-configuration)
4. [Start Infrastructure](#4-start-infrastructure)
5. [Run Services Locally](#5-run-services-locally)
6. [Run the Frontend](#6-run-the-frontend)
7. [Health Checks](#7-health-checks)
8. [Running Tests](#8-running-tests)
9. [First-Day Checklist](#9-first-day-checklist)
10. [Further Reading](#10-further-reading)

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 20.x LTS | Required for all services and frontend |
| **npm** | 9+ | Included with Node.js |
| **Docker** | 24+ | For Postgres, Redis, and containerised runs |
| **Docker Compose** | v2.x | `docker compose` (not `docker-compose`) |
| **Git** | 2.30+ | Version control |

---

## 2. Clone the Repository

```bash
git clone https://github.com/mufthakherul/Let-s-connect.git
cd Let-s-connect
```

---

## 3. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` and set the required values:

```env
# Required
JWT_SECRET=your-strong-secret-here-min-32-chars
POSTGRES_PASSWORD=your-db-password

# Optional for local dev
REACT_APP_API_URL=   # leave blank for Codespaces/containers (uses proxy)
API_VERSION=v2
```

> ⚠️ Do **not** set `REACT_APP_API_URL` when working in Codespaces or dev containers — the frontend proxy handles routing automatically.

---

## 4. Start Infrastructure

Start the required database and cache services:

```bash
docker compose up postgres redis -d
```

Verify they are running:

```bash
docker compose ps
```

---

## 5. Run Services Locally

Each service runs independently. Example for `user-service`:

```bash
cd services/user-service
npm install
npm start
```

Repeat for other services as needed. See each service's `README.md` for specific config requirements.

### Run All Services (Docker)

To run the full stack via Docker:

```bash
docker compose up --build -d
```

With the admin panel:

```bash
docker compose --profile admin up --build -d
```

---

## 6. Run the Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

> Use `--legacy-peer-deps` due to peer dependency resolution requirements.

The frontend is available at **http://localhost:3000**.

---

## 7. Health Checks

```bash
# API Gateway
curl http://localhost:8000/health

# User Service
curl http://localhost:3001/health

# Content Service
curl http://localhost:3002/health

# Messaging Service
curl http://localhost:3003/health
```

All should return `{"status":"ok"}` or similar.

---

## 8. Running Tests

### API Gateway Tests

```bash
npm test --prefix services/api-gateway
```

### Frontend Tests

```bash
cd frontend
npm test

# End-to-end tests
npm run test:e2e
```

### Production Build (Frontend)

```bash
cd frontend
DISABLE_ESLINT_PLUGIN=true npx react-scripts build
```

> ESLint plugin has compatibility issues with some rule configs — use `DISABLE_ESLINT_PLUGIN=true` for builds.

---

## 9. First-Day Checklist

- [ ] Clone and configure `.env`
- [ ] Start infrastructure (`docker compose up postgres redis -d`)
- [ ] Run the frontend locally (`npm start`)
- [ ] Run at least one backend service
- [ ] Verify API gateway health endpoint
- [ ] Run frontend unit tests
- [ ] Read the [Architecture](Architecture) overview
- [ ] Review [API Lifecycle](API-Lifecycle) and versioning standards

---

## 10. Further Reading

| Resource | Description |
|----------|-------------|
| [Architecture](Architecture) | System design, services, and data flow |
| [API Lifecycle](API-Lifecycle) | API versioning, standards, deprecation |
| [Release Process](Release-Process) | How releases and changelogs work |
| [Architecture Decisions](Architecture-Decisions) | ADR records for key design choices |
| [Operations Runbook](Operations-Runbook) | Operational procedures and incident response |
| `docs/development/SETUP.md` | Deep-dive setup documentation |
| `docs/deployment/QUICK_START.md` | Quick production deployment guide |
| `TESTING.md` | Full testing guide |

---

> ← [Home](Home) | [Architecture →](Architecture)
