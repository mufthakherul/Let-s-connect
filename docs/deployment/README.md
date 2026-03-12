# Deployment Guide

Complete deployment documentation for Milonexa platform across different environments.

## Deployment Options

| Option | Best For | Effort | Scalability |
|--------|----------|--------|-------------|
| [Docker Compose](./DOCKER.md) | Development, small production | Low | Limited |
| [Kubernetes](./KUBERNETES.md) | Production, high availability | High | Excellent |
| [Quick Start](./QUICK_START.md) | 10-minute setup | Minimal | N/A |

## Minimum System Requirements

### Docker Compose
- 4 CPU cores
- 8GB RAM
- 50GB SSD storage
- Docker 24+, Docker Compose 2.20+

### Kubernetes
- 8+ CPU cores
- 16GB+ RAM
- 100GB+ storage
- Kubernetes 1.24+, kubectl 1.24+

## Quick Start Commands

```bash
# Clone repository
git clone https://github.com/milonexa/platform.git
cd milonexa

# Copy and configure environment
cp .env.example .env
# Edit .env with your settings

# Start with Docker Compose
docker compose up -d

# Or use quick start script
bash scripts/quick-start.sh
```

Access platform:
- Frontend: http://localhost:3000
- Admin (optional): http://localhost:3001 (with `--profile admin`)
- API: http://localhost:8000
- GraphQL: http://localhost:8000/graphql

## Documentation

- [Quick Start](./QUICK_START.md) — 10-minute setup guide
- [Docker Compose](./DOCKER.md) — Full Docker deployment
- [Kubernetes](./KUBERNETES.md) — Production K8s setup
- [Environment Variables](./ENVIRONMENT.md) — Complete reference
- [CI/CD Pipeline](./CI_CD.md) — GitHub Actions setup
- [Production Hardening](./PRODUCTION.md) — Security setup
- [Reverse Proxy](./REVERSE_PROXY.md) — Nginx/Caddy config

---

Last updated: March 12, 2026
