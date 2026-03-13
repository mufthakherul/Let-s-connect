# Local Development Setup Guide

This guide walks you through setting up the full Milonexa platform on your local machine for development.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone the Repository](#2-clone-the-repository)
3. [Start Infrastructure](#3-start-infrastructure)
4. [Configure Environment](#4-configure-environment)
5. [Initialize Databases](#5-initialize-databases)
6. [Frontend Setup](#6-frontend-setup)
7. [Backend Services Setup](#7-backend-services-setup)
8. [Starting All Services](#8-starting-all-services)
9. [Accessing Services](#9-accessing-services)
10. [Hot Reloading](#10-hot-reloading)
11. [VS Code Setup](#11-vs-code-setup)
12. [Common Issues](#12-common-issues)

---

## 1. Prerequisites

### Required

| Tool | Minimum Version | Install |
|---|---|---|
| Node.js | 20.x | [nodejs.org](https://nodejs.org) or `nvm install 20` |
| npm | 9.x+ | Bundled with Node.js |
| Docker Desktop | 24.x | [docker.com/get-docker](https://docs.docker.com/get-docker/) |
| Docker Compose | v2.20+ | Bundled with Docker Desktop |
| Git | 2.x+ | [git-scm.com](https://git-scm.com) |

### Verify Prerequisites

```bash
node --version     # Should output v20.x.x
npm --version      # Should output 9.x or 10.x
docker --version   # Should output Docker version 24.x
docker compose version  # Should output Docker Compose version v2.x
git --version      # Should output git version 2.x
```

---

## 2. Clone the Repository

```bash
git clone https://github.com/mufthakherul/Let-s-connect.git
cd Let-s-connect
```

---

## 3. Start Infrastructure

Start PostgreSQL, Redis, MinIO, and Elasticsearch using Docker Compose:

```bash
docker compose up postgres redis minio elasticsearch -d
```

Verify all infrastructure services are running:

```bash
docker compose ps
```

Wait until all services show `Up (healthy)` — PostgreSQL may take 15–20 seconds on first run.

---

## 4. Configure Environment

```bash
cp .env.example .env
```

Minimum required values for local development:

```dotenv
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=milonexa
DB_PASSWORD=milonexa_dev
DB_NAME=milonexa
DB_SCHEMA_MODE=alter

REDIS_URL=redis://localhost:6379

MINIO_ENDPOINT=http://localhost:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_BUCKET=milonexa-media

JWT_SECRET=local_dev_jwt_secret_replace_with_32_chars_min
ENCRYPTION_KEY=local_dev_encryption_key_32chars!
INTERNAL_GATEWAY_TOKEN=local_dev_gateway_token_32chars_x

CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=debug
```

See [ENVIRONMENT.md](../deployment/ENVIRONMENT.md) for the full variable reference.

---

## 5. Initialize Databases

On first run, create the required PostgreSQL databases:

```bash
bash scripts/init-databases.sh
```

This creates the `milonexa`, `admin`, and `milonexa_admin` databases.

---

## 6. Frontend Setup

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

The `--legacy-peer-deps` flag is required due to peer dependency conflicts in Material-UI v5 + React 18.

Frontend will be available at **http://localhost:3000** with hot-module replacement enabled.

Production build:

```bash
DISABLE_ESLINT_PLUGIN=true npx react-scripts build
```

---

## 7. Backend Services Setup

Each service is a standalone Node.js app. Run each in a separate terminal:

### API Gateway (port 8000)

```bash
cd services/api-gateway && npm install && npm start
```

### User Service (port 8001)

```bash
cd services/user-service && npm install && npm start
```

### Content Service (port 8002)

```bash
cd services/content-service && npm install && npm start
```

### Messaging Service (port 8003)

```bash
cd services/messaging-service && npm install && npm start
```

### Collaboration Service (port 8004)

```bash
cd services/collaboration-service && npm install && npm start
```

### Media Service (port 8005)

```bash
cd services/media-service && npm install && npm start
```

### Shop Service (port 8006)

```bash
cd services/shop-service && npm install && npm start
```

### AI Service (port 8007)

```bash
cd services/ai-service && npm install && npm start
```

### Streaming Service (port 8009)

```bash
cd services/streaming-service && npm install && npm start
```

### Security Service (port 9102)

```bash
cd services/security-service && npm install && npm start
```

---

## 8. Starting All Services

### Option A: Full Docker Compose stack

```bash
docker compose up --build -d
# With admin panel:
docker compose --profile admin up --build -d
```

### Option B: Infrastructure in Docker, services run locally

```bash
# Terminal 1: Infrastructure
docker compose up postgres redis minio elasticsearch -d

# Terminal 2: API Gateway
cd services/api-gateway && npm install && npm run dev

# Terminal 3: User Service
cd services/user-service && npm install && npm run dev

# Terminal 4+: Other services as needed
# Terminal N: Frontend
cd frontend && npm install --legacy-peer-deps && npm start
```

---

## 9. Accessing Services

| Service | URL | Notes |
|---|---|---|
| **Frontend** | http://localhost:3000 | React SPA |
| **Admin Frontend** | http://localhost:3001 | Requires `--profile admin` |
| **API Gateway** | http://localhost:8000 | Main API entry point |
| **Swagger UI** | http://localhost:8000/api-docs | Interactive API docs |
| **GraphQL Playground** | http://localhost:8000/graphql | Open in browser (GET request) |
| **User Service** | http://localhost:8001/health | |
| **Content Service** | http://localhost:8002/health | |
| **Messaging Service** | http://localhost:8003/health | |
| **Collaboration Service** | http://localhost:8004/health | |
| **Media Service** | http://localhost:8005/health | |
| **Shop Service** | http://localhost:8006/health | |
| **AI Service** | http://localhost:8007/health | |
| **Streaming Service** | http://localhost:8009/health | |
| **Security Service** | http://localhost:9102/health | |
| **MinIO Console** | http://localhost:9001 | Login: minioadmin/minioadmin |
| **Elasticsearch** | http://localhost:9200 | |
| **PostgreSQL** | localhost:5432 | User: milonexa |
| **Redis** | localhost:6379 | |

### Quick health check

```bash
for port in 8000 8001 8002 8003 8004 8005 8006 8007 8009 9102; do
  status=$(curl -sf http://localhost:$port/health 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "DOWN")
  echo "Port $port: $status"
done
```

---

## 10. Hot Reloading

### Frontend

CRA includes Webpack HMR out of the box. Browser reloads automatically on file changes.

### Backend

If `npm run dev` is available, it uses nodemon for auto-restart on file changes:

```bash
npm run dev   # nodemon — restarts on change
npm start     # node directly — no hot reload
```

---

## 11. VS Code Setup

### Recommended Extensions

- `dbaeumer.vscode-eslint` — ESLint integration
- `esbenp.prettier-vscode` — Code formatting
- `GraphQL.vscode-graphql` — GraphQL schema support
- `ms-azuretools.vscode-docker` — Docker integration
- `eamodio.gitlens` — Git history and blame

### Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Debug Node.js Service

```bash
node --inspect src/index.js   # Attach debugger to port 9229
```

---

## 12. Common Issues

### `npm install` fails with peer dependency errors (frontend)

```bash
# Always use --legacy-peer-deps for the frontend
cd frontend && npm install --legacy-peer-deps
```

### Database connection refused

```bash
# Verify postgres is running
docker compose ps postgres
docker compose logs postgres

# Test connection
docker compose exec postgres psql -U milonexa -d milonexa -c "SELECT 1;"
```

### `Required environment variable JWT_SECRET is not set`

Your `.env` file is missing a required value. Ensure all required variables are set. See step 4 above.

### Port already in use

Find the process using a port and terminate it using your OS's process manager (Task Manager on Windows, Activity Monitor on macOS, or `ps aux | grep node` on Linux).

### MinIO bucket not created

```bash
# Create via MinIO Console at http://localhost:9001
# Or restart the media service — it auto-creates the bucket on startup
docker compose restart media-service
```

### Frontend shows "Network Error" or 404 for API calls

The frontend proxy in `frontend/src/setupProxy.js` forwards `/api/*` to `http://localhost:8000`. Ensure:

1. API gateway is running on port 8000
2. `REACT_APP_API_URL` is **not** set in `.env` (it overrides the proxy)
3. You're running `npm start`, not a production build

### Elasticsearch connection errors

If you don't need search features, stop Elasticsearch to save memory:

```bash
docker compose stop elasticsearch
```

Services degrade gracefully when Elasticsearch is unavailable.
