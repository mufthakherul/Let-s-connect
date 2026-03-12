# Docker Compose Deployment Guide

This guide covers deploying the full Milonexa platform stack using Docker Compose. For Kubernetes deployment see [KUBERNETES.md](KUBERNETES.md).

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Service Overview](#2-service-overview)
3. [Docker Compose Profiles](#3-docker-compose-profiles)
4. [Environment Configuration](#4-environment-configuration)
5. [Starting the Platform](#5-starting-the-platform)
6. [Verifying Health](#6-verifying-health)
7. [Viewing Logs](#7-viewing-logs)
8. [Stopping the Platform](#8-stopping-the-platform)
9. [Rebuilding & Updating](#9-rebuilding--updating)
10. [Scaling Services](#10-scaling-services)
11. [Persistent Volumes](#11-persistent-volumes)
12. [Networking](#12-networking)
13. [Backup & Restore](#13-backup--restore)

---

## 1. Prerequisites

- Docker Engine 24.0+
- Docker Compose v2.20+ (`docker compose` — not the legacy `docker-compose`)
- At least 8 GB RAM available to Docker
- Ports 3000, 8000–8009, 9000–9001, 9200, 5432, 6379 available on host

```bash
docker --version        # Docker version 24.x+
docker compose version  # Docker Compose version v2.x
```

---

## 2. Service Overview

The `docker-compose.yml` defines 15+ services organised into logical groups:

### Infrastructure Services

| Service | Image | Host Port | Internal Port | Description |
|---|---|---|---|---|
| `postgres` | `postgres:15-alpine` | `5432` | `5432` | Primary PostgreSQL database server |
| `redis` | `redis:7-alpine` | `6379` | `6379` | Cache, pub/sub, rate limiting, sessions |
| `minio` | `minio/minio:latest` | `9000`, `9001` | `9000`, `9001` | S3-compatible object storage (API + Console) |
| `elasticsearch` | `elasticsearch:8.13.0` | `9200` | `9200` | Full-text search engine |

### Application Services

| Service | Build Context | Host Port | Internal Port | Description |
|---|---|---|---|---|
| `api-gateway` | `services/api-gateway` | `8000` | `8000` | Auth boundary, routing, docs, GraphQL |
| `user-service` | `services/user-service` | `8001` | `8001` | Auth, users, profiles, friends, OAuth |
| `content-service` | `services/content-service` | `8002` | `8002` | Posts, feed, groups, communities, blogs |
| `messaging-service` | `services/messaging-service` | `8003` | `8003` | Chat, servers, channels, WebRTC, Socket.io |
| `collaboration-service` | `services/collaboration-service` | `8004` | `8004` | Documents, wiki, tasks, issues, meetings |
| `media-service` | `services/media-service` | `8005` | `8005` | File uploads, media metadata, MinIO proxy |
| `shop-service` | `services/shop-service` | `8006` | `8006` | Products, orders, cart, Stripe payments |
| `ai-service` | `services/ai-service` | `8007` | `8007` | AI completions, recommendations (Gemini/Ollama) |
| `streaming-service` | `services/streaming-service` | `8009` | `8009` | Radio stations, TV channels |
| `security-service` | `services/security-service` | `9102` | `9102` | Admin security, audit trail, moderation |

### Frontend Services

| Service | Build Context | Host Port | Description |
|---|---|---|---|
| `frontend` | `frontend/` | `3000` | User-facing React SPA |
| `admin_frontend` | `admin_frontend/` | `3001` | Admin React SPA (opt-in via `admin` profile) |

---

## 3. Docker Compose Profiles

Profiles allow selectively enabling optional services without modifying the compose file.

| Profile | Services Enabled | Use Case |
|---|---|---|
| *(default)* | All infrastructure + all application services + frontend | Standard deployment |
| `admin` | `admin_frontend` | Enable admin web panel |
| `admin-ssh` | Admin SSH server | Enable SSH admin shell |
| `admin-api` | Admin REST API extensions | Enable admin REST API |
| `admin-webhook` | Webhook dispatcher | Enable admin webhook events |
| `admin-email` | Email notification service | Enable admin email alerts |
| `admin-ai` | AI admin assistant | Enable AI log analysis |
| `admin-bot-telegram` | Telegram bot service | Enable Telegram admin alerts |
| `admin-bot-slack` | Slack bot service | Enable Slack admin alerts |

Profiles can be combined:

```bash
docker compose --profile admin --profile admin-bot-slack up --build -d
```

---

## 4. Environment Configuration

Before starting, create your environment file:

```bash
cp .env.example .env
```

Edit `.env` with your values. At minimum for development:

```dotenv
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
DB_HOST=postgres
DB_PORT=5432
DB_USER=milonexa
DB_PASSWORD=milonexa_dev
DB_NAME=milonexa
DB_SCHEMA_MODE=alter
REDIS_URL=redis://redis:6379
MINIO_ENDPOINT=http://minio:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
JWT_SECRET=replace_with_64_random_chars_minimum_xxxxxxxxxxxxx
ENCRYPTION_KEY=replace_with_32_random_chars_xxxxx
INTERNAL_GATEWAY_TOKEN=replace_with_32_random_chars_xxxxx
CORS_ORIGINS=http://localhost:3000
```

> **Note:** Inside Docker networks, use service names (e.g. `postgres`, `redis`, `minio`) rather than `localhost`.

See [ENVIRONMENT.md](ENVIRONMENT.md) for the full variable reference.

---

## 5. Starting the Platform

### Full platform (default profile)

```bash
docker compose up --build -d
```

### With admin panel

```bash
docker compose --profile admin up --build -d
```

### With multiple optional profiles

```bash
docker compose --profile admin --profile admin-bot-telegram up --build -d
```

### Infrastructure only (for local service development)

```bash
docker compose up postgres redis minio elasticsearch -d
```

### Start without rebuilding images

```bash
docker compose up -d
```

### First-time database initialisation

The `postgres` service automatically creates databases listed in `POSTGRES_MULTIPLE_DATABASES` on first run via `scripts/init-databases.sh`. No manual step is needed.

---

## 6. Verifying Health

### Check service status

```bash
docker compose ps
```

All services should show `Up` with their health status. Services with health checks will show `Up (healthy)` once ready.

### Check individual service health

```bash
# API Gateway
curl -s http://localhost:8000/health | jq .

# User service
curl -s http://localhost:8001/health | jq .

# Content service
curl -s http://localhost:8002/health | jq .

# Messaging service
curl -s http://localhost:8003/health | jq .

# Collaboration service
curl -s http://localhost:8004/health | jq .

# Media service
curl -s http://localhost:8005/health | jq .

# Shop service
curl -s http://localhost:8006/health | jq .

# AI service
curl -s http://localhost:8007/health | jq .

# Streaming service
curl -s http://localhost:8009/health | jq .

# Security service
curl -s http://localhost:9102/health | jq .
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "api-gateway",
  "version": "1.0.0"
}
```

### Check service logs

```bash
docker compose logs api-gateway
docker compose logs -f api-gateway          # Follow logs
docker compose logs --tail=100 user-service # Last 100 lines
```

### Check all services at once

```bash
for svc in api-gateway user-service content-service messaging-service collaboration-service media-service shop-service ai-service streaming-service security-service; do
  port=$(docker compose port $svc 8000 2>/dev/null | cut -d: -f2 || echo "")
  echo "--- $svc ---"
done
```

---

## 7. Viewing Logs

```bash
# All services
docker compose logs

# Follow a specific service
docker compose logs -f api-gateway

# Multiple services
docker compose logs -f api-gateway user-service

# Last N lines
docker compose logs --tail=50 content-service

# Timestamps
docker compose logs -t api-gateway

# Since a time
docker compose logs --since="2024-01-01T12:00:00" api-gateway
```

---

## 8. Stopping the Platform

### Stop services (keep volumes)

```bash
docker compose down
```

### Stop and remove volumes (⚠️ deletes all data)

```bash
docker compose down -v
```

### Stop a single service

```bash
docker compose stop api-gateway
```

### Restart a single service

```bash
docker compose restart api-gateway
```

### Stop all containers but keep them

```bash
docker compose stop
```

---

## 9. Rebuilding & Updating

### Rebuild all images

```bash
docker compose build --no-cache
docker compose up -d
```

### Rebuild and restart a single service

```bash
docker compose up --build -d api-gateway
```

### Pull updated base images

```bash
docker compose pull
docker compose up --build -d
```

### Zero-downtime update pattern

For production updates with minimal downtime:

```bash
# 1. Build new images
docker compose build --no-cache content-service

# 2. Restart with new image (Docker will perform a rolling restart)
docker compose up -d --no-deps content-service

# 3. Verify health
curl -s http://localhost:8002/health
```

---

## 10. Scaling Services

Scale stateless application services horizontally:

```bash
# Scale content-service to 2 replicas
docker compose up -d --scale content-service=2

# Scale multiple services
docker compose up -d --scale content-service=2 --scale media-service=2
```

> **Note:** The API gateway must be configured with load balancing if scaling services. Stateful services (postgres, redis, minio, elasticsearch) should not be scaled this way — use their native clustering instead.

---

## 11. Persistent Volumes

The following named volumes persist data across container restarts:

| Volume | Used By | Contents |
|---|---|---|
| `postgres_data` | `postgres` | All PostgreSQL databases and WAL |
| `redis_data` | `redis` | Redis RDB snapshots and AOF |
| `minio_data` | `minio` | All uploaded media files and object metadata |
| `elasticsearch_data` | `elasticsearch` | Elasticsearch indices and snapshots |

### Inspect a volume

```bash
docker volume inspect lets-connect_postgres_data
```

### List all volumes

```bash
docker volume ls | grep lets-connect
```

---

## 12. Networking

All services communicate on the internal `milonexa-net` bridge network.

| Network | Driver | Subnet | Description |
|---|---|---|---|
| `milonexa-net` | `bridge` | (auto-assigned) | Internal network for all services |

Services are accessible by their service name within the network (e.g. `http://user-service:8001`). The API gateway is the only service that needs to be accessible from the host on port `8000`.

Only the following ports are exposed to the host:

- `3000` — Frontend
- `3001` — Admin Frontend (when profile `admin` is active)
- `8000` — API Gateway
- `9000` — MinIO API
- `9001` — MinIO Console
- `5432` — PostgreSQL (development only; remove in production)
- `6379` — Redis (development only; remove in production)
- `9200` — Elasticsearch (development only; remove in production)

> **Production:** Remove host port bindings for `5432`, `6379`, and `9200` from `docker-compose.yml` before deploying.

---

## 13. Backup & Restore

### PostgreSQL backup

```bash
# Dump all databases
docker compose exec postgres pg_dumpall -U milonexa > backup_$(date +%Y%m%d_%H%M%S).sql

# Dump a specific database
docker compose exec postgres pg_dump -U milonexa milonexa > milonexa_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
docker compose exec postgres pg_dump -U milonexa -Fc milonexa > milonexa_$(date +%Y%m%d_%H%M%S).dump
```

### PostgreSQL restore

```bash
# Restore from SQL file
cat milonexa_backup.sql | docker compose exec -T postgres psql -U milonexa

# Restore from custom format
docker compose exec -T postgres pg_restore -U milonexa -d milonexa < milonexa_backup.dump
```

### Redis backup

```bash
# Trigger a BGSAVE and copy RDB file
docker compose exec redis redis-cli BGSAVE
docker compose cp redis:/data/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb
```

### MinIO backup

```bash
# Install mc (MinIO Client) and mirror bucket
docker run --rm --network milonexa-net \
  minio/mc mirror minio/milonexa-media /backup/minio
```

### Automated backups

For automated production backups, see `k8s/backup-cronjob.yaml` for the Kubernetes CronJob that backs up PostgreSQL to MinIO daily.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Service exits immediately | Missing required env var | Check `docker compose logs <service>` for `Required environment variable` errors |
| `Connection refused` on port 8000 | api-gateway not started | `docker compose up -d api-gateway` |
| Database connection errors | postgres not yet healthy | Wait for postgres health check; check `POSTGRES_MULTIPLE_DATABASES` |
| 502 from api-gateway | Downstream service not running | `docker compose ps`, restart the failing service |
| `no space left on device` | Docker volumes full | `docker system prune -f` (⚠️ removes unused images/volumes) |
| MinIO bucket not found | First-run init incomplete | `docker compose restart media-service` to trigger bucket creation |
