# Quick Start Guide

Get Let's Connect running in 5 minutes!

## Prerequisites

- Docker and Docker Compose installed
- 4GB RAM minimum
- 10GB free disk space

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/mufthakherul/Let-s-connect.git
cd Let-s-connect
```

### 2. Configure Environment

```bash
cp .env.example .env
```

**Important:** Edit `.env` and set a secure JWT_SECRET:

```bash
# Generate a secure secret
openssl rand -hex 32

# Or use this simple method
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
```

### 3. Start All Services

```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f
```

### 4. Wait for Services

Services need 1-2 minutes to fully start. Check status:

```bash
docker-compose ps
```

All services should show "Up" status.

### 5. Access Platform

- **Frontend:** http://localhost:3000
- **API Gateway:** http://localhost:8000
- **MinIO Console:** http://localhost:9001 (minioadmin/minioadmin)

## First Steps

### Create Account

1. Open http://localhost:3000
2. Click "Register"
3. Fill in:
   - Username: johndoe
   - Email: john@example.com
   - Password: password123
   - First Name: John
   - Last Name: Doe
4. Click "Register" - you'll be logged in automatically

### Explore Public Features (No Login Required)

- **Videos:** Click "Videos" to browse public videos
- **Shop:** Click "Shop" to browse products
- **Docs:** Click "Docs" to read documentation

### Try Private Features (Requires Login)

After logging in:

- **Feed:** Create and view posts
- **Chat:** Real-time messaging (create conversation first)
- **Profile:** Update your profile information

## Testing API Directly

### Register User

```bash
curl -X POST http://localhost:8000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Login

```bash
curl -X POST http://localhost:8000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the token from response!

### Create Post (Authenticated)

```bash
# Replace YOUR_TOKEN with actual token
curl -X POST http://localhost:8000/api/content/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "YOUR_USER_ID",
    "content": "Hello from Let'\''s Connect!",
    "type": "text",
    "visibility": "public"
  }'
```

### Browse Public Posts (No Auth)

```bash
curl http://localhost:8000/api/content/public/posts
```

## Setup MinIO Storage

1. Open http://localhost:9001
2. Login: minioadmin / minioadmin
3. Create bucket: `lets-connect-media`
4. Set Access Policy to Public for public media

## Common Issues

### Services won't start

```bash
# Check Docker is running
docker info

# Check logs for errors
docker-compose logs

# Restart services
docker-compose restart
```

### Port already in use

Edit `docker-compose.yml` and change conflicting ports:

```yaml
ports:
  - "3001:3000"  # Change 3000 to 3001
```

### Database connection errors

```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check PostgreSQL logs
docker-compose logs postgres
```

### Reset everything

```bash
# Stop and remove all containers, volumes
docker-compose down -v

# Rebuild and start fresh
docker-compose up --build
```

## Development Mode

For development with hot reload:

### Start Backend Services

```bash
# Start infrastructure only
docker-compose up postgres redis minio -d

# Install dependencies and start each service
cd services/api-gateway
npm install
npm start

# Repeat for other services in separate terminals
```

### Start Frontend

```bash
cd frontend
npm install
npm start
```

Frontend will open at http://localhost:3000

## Next Steps

- Read [Full Documentation](./docs/README.md)
- Check [API Reference](./docs/API.md)
- Learn about [Architecture](./docs/ARCHITECTURE.md)
- Deploy to production: [Deployment Guide](./docs/DEPLOYMENT.md)

## Support

- **Issues:** https://github.com/mufthakherul/Let-s-connect/issues
- **Documentation:** ./docs/

## Feature Checklist

✅ Public video browsing
✅ Public shop browsing
✅ Public documentation
✅ User registration/login
✅ Social feed (posts, likes, comments)
✅ Real-time chat
✅ File uploads
✅ Document collaboration
✅ E-commerce (products, orders)
✅ AI assistant
✅ JWT authentication
✅ Role-based access control
✅ Microservices architecture
✅ Docker deployment
✅ Self-hosted solution

Enjoy building with Let's Connect! 🚀
