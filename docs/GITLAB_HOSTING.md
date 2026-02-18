# GitLab Hosting Guide for Let's Connect

This guide will help you deploy Let's Connect on GitLab infrastructure in 1-3 hours.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Setup (1-3 Hours)](#quick-setup-1-3-hours)
3. [GitLab Pages Deployment (Frontend Only)](#gitlab-pages-deployment-frontend-only)
4. [Full Stack Deployment](#full-stack-deployment)
5. [Environment Configuration](#environment-configuration)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- GitLab account (free tier works)
- Server for full-stack deployment (optional for GitLab Pages)
- Domain name (optional but recommended)
- SSH access to deployment server (for full-stack)

---

## Quick Setup (1-3 Hours)

### Option 1: Frontend Only on GitLab Pages (30 minutes)

Perfect for demos and static hosting of the React frontend.

**Steps:**

1. **Push to GitLab**
   ```bash
   git remote add gitlab https://gitlab.com/your-username/lets-connect.git
   git push gitlab main
   ```

2. **Enable GitLab Pages**
   - Go to Settings → Pages
   - The `.gitlab-ci.yml` is already configured
   - Pipeline will automatically build and deploy

3. **Configure Frontend API URL**
   - Set `REACT_APP_API_URL` in GitLab CI/CD variables
   - Go to Settings → CI/CD → Variables
   - Add: `REACT_APP_API_URL` = `https://your-backend-url.com`

4. **Access Your Site**
   - Pages URL: `https://your-username.gitlab.io/lets-connect`
   - Configure custom domain in Settings → Pages

**Estimated Time:** 30 minutes

---

### Option 2: Full Stack on GitLab + VPS (2-3 hours)

Complete deployment with all microservices.

**Steps:**

#### Step 1: Prepare Your Server (30 min)

1. **Get a VPS** (DigitalOcean, Linode, AWS, etc.)
   - Minimum: 4GB RAM, 2 CPU cores, 50GB storage
   - Recommended: 8GB RAM, 4 CPU cores, 100GB storage
   - OS: Ubuntu 22.04 LTS

2. **Install Docker and Docker Compose**
   ```bash
   # SSH into your server
   ssh root@your-server-ip

   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh

   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose

   # Verify installations
   docker --version
   docker-compose --version
   ```

3. **Setup Deployment Directory**
   ```bash
   mkdir -p /var/www/lets-connect
   cd /var/www/lets-connect
   ```

#### Step 2: Configure GitLab CI/CD (20 min)

1. **Generate SSH Key for Deployment**
   ```bash
   # On your local machine
   ssh-keygen -t rsa -b 4096 -C "gitlab-ci@lets-connect"
   # Save as: gitlab-deploy-key
   ```

2. **Add Public Key to Server**
   ```bash
   # Copy public key content
   cat gitlab-deploy-key.pub

   # On server, add to authorized_keys
   ssh root@your-server-ip
   mkdir -p ~/.ssh
   echo "YOUR_PUBLIC_KEY" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

3. **Add Private Key to GitLab**
   - Go to GitLab → Settings → CI/CD → Variables
   - Add variable:
     - Key: `SSH_PRIVATE_KEY`
     - Value: Content of `gitlab-deploy-key` (private key)
     - Type: File
     - Protected: Yes
     - Masked: No

4. **Add Server Configuration Variables**
   Go to Settings → CI/CD → Variables and add:
   
   | Variable | Value | Description |
   |----------|-------|-------------|
   | `DEPLOY_SERVER` | `your-server-ip` | Server IP or domain |
   | `DEPLOY_USER` | `root` | SSH user |
   | `DEPLOY_PATH` | `/var/www/lets-connect` | Deployment directory |
   | `PRODUCTION_URL` | `https://yourdomain.com` | Your domain |

#### Step 3: Configure Environment Variables (30 min)

Create `.env` file on your server:

```bash
ssh root@your-server-ip
cd /var/www/lets-connect
nano .env
```

Add the following (customize as needed):

```bash
# Application
NODE_ENV=production
JWT_SECRET=your-very-secure-random-string-here
FRONTEND_URL=https://yourdomain.com

# Database
DATABASE_PASSWORD=your-secure-database-password

# Seeding (use minimal for fast startup)
SEED_MODE=minimal
RUN_SEED=true

# Email (Mailgun)
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-domain.com
EMAIL_FROM=noreply@your-domain.com

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# hCaptcha (optional)
HCAPTCHA_SECRET=your-hcaptcha-secret
REACT_APP_HCAPTCHA_SITEKEY=your-hcaptcha-sitekey

# API URL for frontend
REACT_APP_API_URL=https://yourdomain.com
```

#### Step 4: Initial Deployment (30 min)

1. **Clone Repository on Server**
   ```bash
   ssh root@your-server-ip
   cd /var/www/lets-connect
   git clone https://gitlab.com/your-username/lets-connect.git .
   ```

2. **Start Services**
   ```bash
   docker-compose up -d
   ```

3. **Check Status**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

#### Step 5: Setup Reverse Proxy with Nginx (30 min)

1. **Install Nginx**
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Configure Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/lets-connect
   ```

   Add configuration:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       # Frontend
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # API Gateway
       location /api/ {
           proxy_pass http://localhost:8000/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # WebSocket for real-time features
       location /socket.io/ {
           proxy_pass http://localhost:8003;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

3. **Enable Site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/lets-connect /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **Setup SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

#### Step 6: Enable GitLab CI/CD Auto-Deployment (10 min)

1. **Push to GitLab**
   ```bash
   git push gitlab main
   ```

2. **Monitor Pipeline**
   - Go to GitLab → CI/CD → Pipelines
   - Watch the build, test, and deploy stages

3. **Manual Deployment**
   - The deployment stage is set to manual by default
   - Click "Deploy" button in the pipeline

**Estimated Time:** 2-3 hours total

---

## GitLab Pages Deployment (Frontend Only)

### Automatic Deployment

The `.gitlab-ci.yml` is pre-configured for GitLab Pages:

```yaml
pages:
  stage: deploy
  script:
    - mkdir -p public
    - cp -r frontend/build/* public/
  artifacts:
    paths:
      - public
  only:
    - main
```

### Custom Domain Setup

1. **Add Custom Domain**
   - Settings → Pages → New Domain
   - Enter your domain (e.g., `app.yourdomain.com`)

2. **Configure DNS**
   - Add A record: `185.199.108.153`
   - Or CNAME: `your-username.gitlab.io`

3. **Enable HTTPS**
   - GitLab automatically provisions Let's Encrypt SSL
   - Wait a few minutes for SSL certificate

### Build Configuration

The frontend build uses environment variables:

```yaml
build:frontend:
  variables:
    REACT_APP_API_URL: $REACT_APP_API_URL
  script:
    - cd frontend
    - npm ci
    - npm run build
```

Set `REACT_APP_API_URL` in GitLab CI/CD Variables.

---

## Full Stack Deployment

### Architecture

```
┌─────────────────────────────────────────────┐
│            Internet / Users                 │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │   Nginx (Port 80)  │
         │   SSL Termination  │
         └─────────┬──────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼────┐   ┌────▼─────┐   ┌───▼─────┐
│Frontend│   │   API    │   │ Socket  │
│ :3000  │   │ Gateway  │   │  :8003  │
└────────┘   │  :8000   │   └─────────┘
             └──────┬───┘
                    │
     ┌──────────────┼──────────────┬──────────┐
     │              │              │          │
┌────▼─────┐  ┌────▼────┐   ┌─────▼────┐ ┌──▼───┐
│ User Svc │  │Content  │   │Messaging │ │ ...  │
│  :8001   │  │  :8002  │   │  :8003   │ │      │
└──────────┘  └─────────┘   └──────────┘ └──────┘
     │              │              │
     └──────────────┼──────────────┘
                    │
            ┌───────▼────────┐
            │   PostgreSQL   │
            │     :5432      │
            └────────────────┘
```

### Docker Compose Services

The `docker-compose.yml` includes:

- **Frontend** (React) - Port 3000
- **API Gateway** - Port 8000
- **User Service** - Port 8001
- **Content Service** - Port 8002
- **Messaging Service** - Port 8003
- **Collaboration Service** - Port 8004
- **Media Service** - Port 8005
- **Shop Service** - Port 8006
- **AI Service** - Port 8008
- **Streaming Service** - Port 8009
- **PostgreSQL** - Port 5432
- **Redis** - Port 6379
- **Elasticsearch** - Port 9200

### Resource Requirements

| Environment | RAM | CPU | Storage | Users |
|-------------|-----|-----|---------|-------|
| Development | 4GB | 2 cores | 20GB | 1-10 |
| Small Team | 8GB | 4 cores | 50GB | 10-100 |
| Production | 16GB+ | 8+ cores | 100GB+ | 100+ |

---

## Environment Configuration

### Required Variables

#### Application Core
```bash
NODE_ENV=production
JWT_SECRET=<random-32-character-string>
FRONTEND_URL=https://yourdomain.com
```

#### Database
```bash
DATABASE_PASSWORD=<secure-password>
```

#### Seeding (Streaming Service)
```bash
SEED_MODE=minimal          # minimal, full, or skip
RUN_SEED=true             # Set to false to skip seeding
```

### Optional Variables

#### Email (Mailgun)
```bash
MAILGUN_API_KEY=key-xxxxx
MAILGUN_DOMAIN=mg.yourdomain.com
EMAIL_FROM=noreply@yourdomain.com
```

#### OAuth Providers
```bash
# Google
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx

# GitHub
GITHUB_CLIENT_ID=xxxxx
GITHUB_CLIENT_SECRET=xxxxx
```

#### Security (hCaptcha)
```bash
HCAPTCHA_SECRET=0x0000000000000000000000000000000000000000
REACT_APP_HCAPTCHA_SITEKEY=10000000-ffff-ffff-ffff-000000000001
```

---

## CI/CD Pipeline

### Pipeline Stages

1. **Build** - Builds frontend and services
2. **Test** - Runs tests and security scans
3. **Deploy** - Deploys to Pages or production server

### Pipeline Flow

```
┌─────────┐     ┌──────────┐     ┌─────────┐
│  Build  │────▶│   Test   │────▶│ Deploy  │
│Frontend │     │ Frontend │     │  Pages  │
└─────────┘     └──────────┘     └─────────┘
     │                                 │
     │          ┌──────────┐           │
     └─────────▶│ Security │           │
                │   Scan   │           │
                └──────────┘           │
                                       ▼
                              ┌────────────────┐
                              │   Production   │
                              │ (Manual Deploy)│
                              └────────────────┘
```

### Triggering Deployments

- **Automatic**: Pages deploy on every push to `main`
- **Manual**: Production deployment requires manual trigger
- **Scheduled**: Can be configured for nightly builds

### Monitoring Pipelines

1. Go to GitLab → CI/CD → Pipelines
2. Click on a pipeline to see stages
3. Click on a job to see logs
4. Failed jobs can be retried

---

## Troubleshooting

### Common Issues

#### 1. Frontend Build Fails

**Problem:** `npm install` fails or build errors

**Solution:**
```bash
# Check Node version (should be 18+)
node --version

# Clear cache and reinstall
rm -rf frontend/node_modules frontend/package-lock.json
cd frontend && npm install
```

#### 2. Services Won't Start

**Problem:** `docker-compose up` fails

**Solution:**
```bash
# Check Docker is running
docker ps

# Check logs
docker-compose logs -f

# Restart services
docker-compose down
docker-compose up -d
```

#### 3. Database Connection Errors

**Problem:** Services can't connect to PostgreSQL

**Solution:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Verify environment variables
docker-compose config
```

#### 4. GitLab Pipeline Fails

**Problem:** CI/CD pipeline errors

**Solution:**
- Check `.gitlab-ci.yml` syntax
- Verify CI/CD variables are set
- Check pipeline logs in GitLab
- Ensure SSH keys are correct

#### 5. Streaming Service Takes Too Long

**Problem:** Startup is slow

**Solution:**
```bash
# Use minimal seeding mode
SEED_MODE=minimal

# Or skip seeding entirely
RUN_SEED=false
```

#### 6. Pages Not Loading

**Problem:** GitLab Pages shows 404

**Solution:**
- Ensure `public/` directory has files
- Check pipeline completed successfully
- Wait 5-10 minutes for Pages to update
- Verify custom domain DNS settings

### Getting Help

1. **Check Logs**
   ```bash
   # All services
   docker-compose logs -f

   # Specific service
   docker-compose logs -f streaming-service
   ```

2. **Check Service Health**
   ```bash
   docker-compose ps
   curl http://localhost:8000/health
   ```

3. **Restart Services**
   ```bash
   docker-compose restart
   ```

4. **Full Reset**
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

---

## Production Checklist

Before going live:

- [ ] Set strong JWT_SECRET
- [ ] Configure secure database password
- [ ] Setup SSL/HTTPS
- [ ] Configure email service (Mailgun)
- [ ] Setup OAuth providers
- [ ] Enable hCaptcha for security
- [ ] Configure backup strategy
- [ ] Setup monitoring (optional)
- [ ] Test all features
- [ ] Configure firewall rules
- [ ] Setup domain and DNS
- [ ] Review logs for errors
- [ ] Load test the application

---

## Next Steps

After deployment:

1. **Monitor Application**
   - Setup uptime monitoring (UptimeRobot, Pingdom)
   - Configure log aggregation (optional)

2. **Backup Strategy**
   - Regular database backups
   - Volume backups for media files

3. **Scaling**
   - Add more server resources as needed
   - Consider load balancer for multiple servers

4. **Updates**
   - Pull latest changes: `git pull`
   - Rebuild: `docker-compose up -d --build`

---

## Support

For questions or issues:
- Check the main `README.md`
- Review `QUICK_START.md` for development setup
- See `docs/DEPLOYMENT_GUIDE.md` for more deployment options
- Refer to `docs/STREAMING_SEEDING_OPTIMIZATION.md` for seeding details

---

## Estimated Costs

### GitLab Pages Only (Free)
- GitLab: Free tier
- Total: **$0/month**

### Full Stack Deployment
- VPS (DigitalOcean/Linode): $20-40/month
- Domain: $10-15/year
- GitLab: Free tier
- Total: **$20-40/month**

### Production Grade
- VPS: $80-120/month
- Domain: $10-15/year
- Email (Mailgun): $0-35/month
- Backups: $5-10/month
- Total: **$85-165/month**

---

**Deployment Time Summary:**
- Frontend Only (Pages): 30 minutes
- Full Stack (Basic): 2 hours
- Full Stack (Production): 3 hours

Good luck with your deployment! 🚀
