# Deployment & Operations Documentation

Guides for deploying, configuring, and operating the Milonexa platform.

## Contents

| Document | Description |
|----------|-------------|
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Complete step-by-step Docker Compose & Kubernetes deployment |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Quick deployment reference |
| [DEV_PROD_MODE_GUIDE.md](DEV_PROD_MODE_GUIDE.md) | Development vs production mode differences |
| [OAUTH_MAILGUN_SETUP.md](OAUTH_MAILGUN_SETUP.md) | OAuth (Google/GitHub) and Mailgun email setup |
| [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) | Deploy to Render.com |
| [GITLAB_HOSTING.md](GITLAB_HOSTING.md) | Self-host on GitLab |
| [HOME_SERVER_SUBDOMAIN_STAGING_GUIDE.md](HOME_SERVER_SUBDOMAIN_STAGING_GUIDE.md) | Staging on home server with subdomain |
| [REVERSE_PROXY_STAGING_SETUP.md](REVERSE_PROXY_STAGING_SETUP.md) | Nginx/Caddy reverse proxy setup |
| [V2_QUICK_DEPLOYMENT.md](V2_QUICK_DEPLOYMENT.md) | Quick deployment for v2 |

## Quick Start

```bash
# Development (docker-compose)
docker compose up postgres redis -d
cd frontend && npm install --legacy-peer-deps && npm start

# Production (docker-compose)
cp .env.example .env  # configure secrets
docker compose up --build -d

# With admin frontend
docker compose --profile admin up --build -d
```

## Infrastructure Overview

| Component | Port | Purpose |
|-----------|------|---------|
| Frontend | 3000 | React user interface |
| Admin Frontend | 3001 | Admin panel (opt-in via `admin` profile) |
| API Gateway | 8000 | Request routing, auth, rate limiting |
| User Service | 8001 | Authentication & profiles |
| Content Service | 8002 | Posts, feeds, groups |
| Messaging Service | 8003 | Chat, WebRTC, notifications |
| Collaboration Service | 8004 | Docs, wikis, tasks |
| Media Service | 8005 | File uploads, storage |
| Shop Service | 8006 | E-commerce |
| AI Service | 8007 | AI features |
| Streaming Service | 8008 | Radio, TV, live streaming |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache & session store |
| MinIO | 9000 | Object storage |
