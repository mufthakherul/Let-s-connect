# Quick Start Guide

Get Milonexa running in under 10 minutes with Docker Compose.

## Prerequisites
- Docker 24+ and Docker Compose 2.20+
- 4 CPU cores, 8GB RAM, 50GB disk
- Git

## 10-Minute Setup

```bash
# 1. Clone
git clone https://github.com/milonexa/platform.git
cd milonexa

# 2. Configure
cp .env.example .env
# Edit .env - set JWT_SECRET, DB_PASSWORD, REDIS_PASSWORD, MINIO_ROOT_PASSWORD

# 3. Initialize databases
bash scripts/init-databases.sh

# 4. Start
docker compose up -d

# 5. Verify
curl http://localhost:8000/health
```

Access:
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/api-docs
- Admin (optional): http://localhost:3001 (add `--profile admin`)

## Environment Setup

```bash
# Generate secure secrets
JWT_SECRET=$(openssl rand -base64 64)
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
MINIO_ROOT_PASSWORD=$(openssl rand -base64 32)

# Edit these values into your .env file (replace any existing entries for these keys)
echo "Add/replace these in your .env:"
echo "JWT_SECRET=$JWT_SECRET"
echo "DB_PASSWORD=$DB_PASSWORD"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
echo "MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD"
```

## Troubleshooting

**Port already in use**: Change PORTS in .env
**Database connection failed**: Run `docker compose logs postgres`
**Services not starting**: Check `docker compose ps` for errors

## Next Steps

- Read [DOCKER.md](./DOCKER.md) for full configuration
- See [ENVIRONMENT.md](./ENVIRONMENT.md) for all variables
- Check [PRODUCTION.md](./PRODUCTION.md) for hardening

---
Last Updated: 2024
