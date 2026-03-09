# Deployment Guide

> **📖 For a comprehensive, step-by-step deployment guide covering both Docker Compose and Kubernetes, see [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) in the repository root.**

This document provides a quick reference for deployment. For detailed instructions, troubleshooting, and production best practices, refer to the comprehensive guide.

---

## Self-Hosted Deployment with Docker

### Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Minimum 4GB RAM, 2 CPU cores
- 20GB storage space
- Domain name (optional, for production)

### Production Deployment

1. **Clone and Configure**

```bash
git clone https://github.com/mufthakherul/Let-s-connect.git
cd Let-s-connect
cp .env.example .env
```

2. **Edit Environment Variables**

```bash
# Security
JWT_SECRET=your-super-secret-jwt-key-change-this
ENCRYPTION_KEY=your-encryption-key-for-sensitive-data

# AI Service (optional)
GEMINI_API_KEY=your-gemini-api-key-here

# Object Storage
S3_BUCKET=lets-connect-media
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
```

3. **Start Services**

```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

4. **Initialize MinIO Bucket**

```bash
# Access MinIO console at http://localhost:9001
# Login: minioadmin / minioadmin
# Create bucket: lets-connect-media
# Set bucket policy to public for public media
```

5. **Access the Platform**

- Frontend: http://localhost:3000
- API Gateway: http://localhost:8000

### Production with HTTPS

1. **Install Nginx and Certbot**

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

2. **Configure Nginx**

Create `/etc/nginx/sites-available/lets-connect`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **Enable Site and Get SSL**

```bash
sudo ln -s /etc/nginx/sites-available/lets-connect /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d yourdomain.com
```

### Scaling Services

Scale individual services:

```bash
# Scale content service to 3 instances
docker-compose up -d --scale content-service=3

# Scale messaging service
docker-compose up -d --scale messaging-service=2
```

### Backup and Restore

**Backup Database:**

```bash
# Backup all databases
docker exec lets-connect-postgres-1 pg_dumpall -U postgres > backup.sql

# Backup specific database
docker exec lets-connect-postgres-1 pg_dump -U postgres users > users_backup.sql
```

**Restore Database:**

```bash
docker exec -i lets-connect-postgres-1 psql -U postgres < backup.sql
```

**Backup MinIO Data:**

```bash
docker run --rm \
  -v lets-connect_minio-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/minio-backup.tar.gz /data
```

### Monitoring

**View Logs:**

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f user-service

# Last 100 lines
docker-compose logs --tail=100
```

**Resource Usage:**

```bash
docker stats
```

### Troubleshooting

**Services not starting:**

```bash
# Check container status
docker-compose ps

# View service logs
docker-compose logs [service-name]

# Restart service
docker-compose restart [service-name]
```

**Database connection issues:**

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Connect to database
docker exec -it lets-connect-postgres-1 psql -U postgres
```

**Clear and rebuild:**

```bash
docker-compose down -v
docker-compose up --build
```

### Security Best Practices

1. **Change Default Credentials**
   - Update JWT_SECRET
   - Change MinIO credentials
   - Use strong passwords

2. **Enable HTTPS**
   - Use Let's Encrypt for free SSL
   - Force HTTPS redirects

3. **Firewall Configuration**
   - Only expose ports 80 and 443
   - Use internal Docker network for services

4. **Regular Updates**
   ```bash
   git pull origin main
   docker-compose up -d --build
   ```

5. **Backup Strategy**
   - Daily database backups
   - Weekly full system backups
   - Test restore procedures

### Performance Optimization

1. **Redis Caching**
   - Configure Redis maxmemory policy
   - Use caching for frequently accessed data

2. **Database Indexing**
   - Add indexes on frequently queried columns
   - Optimize slow queries

3. **CDN for Media**
   - Use CloudFlare or similar CDN
   - Serve static assets from CDN

4. **Load Balancing**
   - Use nginx or HAProxy
   - Scale services horizontally

### Environment-Specific Configuration

**Development:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**Production:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Staging:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```
