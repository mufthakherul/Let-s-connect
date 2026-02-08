# Render Deployment Guide (with Supabase)

Complete guide for deploying Let's Connect to Render using Supabase as the database backend.

## Prerequisites

- GitHub account with Let's Connect repository
- Supabase account (free tier available)
- Cloudflare account for R2 storage (optional, can use Supabase Storage)
- Render account (no payment method required for free tier)

---

## Part 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Fill in details:
   - **Name:** lets-connect
   - **Database Password:** Generate strong password (save it!)
   - **Region:** Choose closest to your users
4. Click **Create new project** (takes ~2 minutes)

### 1.2 Configure Database Schema

Supabase uses a single PostgreSQL database. Let's Connect needs 6 separate databases, so we'll use **schemas** instead:

1. Go to **SQL Editor** in Supabase dashboard
2. Run this SQL to create schemas:

```sql
-- Create separate schemas for each service
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS messages;
CREATE SCHEMA IF NOT EXISTS collaboration;
CREATE SCHEMA IF NOT EXISTS media;
CREATE SCHEMA IF NOT EXISTS shop;

-- Grant permissions
GRANT ALL ON SCHEMA users TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA content TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA messages TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA collaboration TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA media TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA shop TO postgres, anon, authenticated, service_role;
```

3. Click **Run** to execute

### 1.3 Get Connection Details

1. Go to **Project Settings** → **Database**
2. Copy these values (you'll need them for Render):
   - **Host:** `db.xxxxxxxxxxxxx.supabase.co`
   - **Port:** `5432`
   - **Database:** `postgres`
   - **User:** `postgres`
   - **Password:** Your password from step 1.1

**Connection String Format:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

### 1.4 Configure Storage (Optional)

**Option A: Use Supabase Storage** (Recommended for simplicity)
1. Go to **Storage** in Supabase dashboard
2. Create new bucket: `lets-connect-media`
3. Set to **Public** bucket
4. Get API URL from Settings → API

**Option B: Use Cloudflare R2** (Better for large files)
1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Go to **R2 Object Storage**
3. Create bucket: `lets-connect-media`
4. Generate API token with R2 read/write permissions
5. Save: Access Key ID, Secret Access Key, Account ID

---

## Part 2: Redis Setup

### Option 1: Upstash Redis (Recommended - Free Tier)

1. Go to [upstash.com](https://upstash.com) and sign up
2. Click **Create Database**
3. Name: `lets-connect-redis`
4. Region: Same as Supabase
5. Copy **UPSTASH_REDIS_REST_URL** (format: `https://xxx.upstash.io`)

### Option 2: Render Redis

1. In Render dashboard → **New** → **Redis**
2. Name: `lets-connect-redis`
3. Free tier selected
4. Create Redis instance
5. Copy connection URL

---

## Part 3: Environment Variables Preparation

Create a text file with these values (you'll paste them into each Render service):

```bash
# Database (Supabase)
DATABASE_HOST=db.xxxxxxxxxxxxx.supabase.co
DATABASE_PORT=5432
DATABASE_NAME=postgres
DATABASE_USER=postgres
DATABASE_PASSWORD=your-supabase-password

# Redis (Upstash or Render)
REDIS_URL=redis://default:password@redis-hostname:port
# OR for Upstash:
# REDIS_URL=https://xxx.upstash.io

# JWT & Security
JWT_SECRET=your-super-secret-key-min-32-chars-long
ENCRYPTION_KEY=another-32-char-encryption-key

# Storage - Option A: Supabase Storage
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_BUCKET=lets-connect-media

# Storage - Option B: Cloudflare R2
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
S3_ACCESS_KEY=your-r2-access-key
S3_SECRET_KEY=your-r2-secret-key
S3_BUCKET=lets-connect-media

# AI Service (Optional)
OPENAI_API_KEY=sk-your-openai-api-key

# Service URLs (Fill in after deploying each service)
API_GATEWAY_URL=https://your-api-gateway.onrender.com
USER_SERVICE_URL=https://your-user-service.onrender.com
CONTENT_SERVICE_URL=https://your-content-service.onrender.com
MESSAGING_SERVICE_URL=https://your-messaging-service.onrender.com
COLLABORATION_SERVICE_URL=https://your-collaboration-service.onrender.com
MEDIA_SERVICE_URL=https://your-media-service.onrender.com
SHOP_SERVICE_URL=https://your-shop-service.onrender.com
AI_SERVICE_URL=https://your-ai-service.onrender.com
```

**Generate Random Secrets:**
```bash
# Run in terminal to generate secure secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Part 4: Deploy Services to Render

### 4.1 Connect GitHub Repository

1. Go to [render.com](https://render.com) and sign up
2. Dashboard → **New** → **Web Service**
3. Click **Connect GitHub** → Authorize Render
4. Select `Let-s-connect` repository

### 4.2 Deploy Backend Services (8 services)

For EACH service below, repeat these steps:

#### Service 1: User Service

1. **Create New Web Service**
   - Repository: `Let-s-connect`
   - Name: `lets-connect-user-service`
   - Root Directory: `services/user-service`
   - Environment: `Node`
   - Region: Same as Supabase
   - Branch: `main`

2. **Build & Start Commands:**
   ```
   Build Command: npm install --production
   Start Command: node server.js
   ```

3. **Instance Type:** Free

4. **Environment Variables:** (Click "Add Environment Variable")
   ```
   PORT=8001
   DATABASE_HOST=<supabase-host>
   DATABASE_PORT=5432
   DATABASE_NAME=postgres
   DATABASE_USER=postgres
   DATABASE_PASSWORD=<password>
   DATABASE_SCHEMA=users
   REDIS_URL=<redis-url>
   JWT_SECRET=<secret>
   ```

5. Click **Create Web Service**

6. **Copy Service URL** (e.g., `https://lets-connect-user-service.onrender.com`) - you'll need this for API Gateway

#### Service 2-8: Repeat for Each Service

Deploy each service with its specific settings:

| Service | Root Directory | Port | Schema |
|---------|---------------|------|--------|
| User Service | `services/user-service` | 8001 | `users` |
| Content Service | `services/content-service` | 8002 | `content` |
| Messaging Service | `services/messaging-service` | 8003 | `messages` |
| Collaboration Service | `services/collaboration-service` | 8004 | `collaboration` |
| Media Service | `services/media-service` | 8005 | `media` |
| Shop Service | `services/shop-service` | 8006 | `shop` |
| AI Service | `services/ai-service` | 8007 | N/A (uses Redis only) |
| API Gateway | `services/api-gateway` | 8000 | N/A (proxy layer) |

**Important for API Gateway:** Add these ADDITIONAL environment variables:
```bash
USER_SERVICE_URL=https://lets-connect-user-service.onrender.com
CONTENT_SERVICE_URL=https://lets-connect-content-service.onrender.com
MESSAGING_SERVICE_URL=https://lets-connect-messaging-service.onrender.com
COLLABORATION_SERVICE_URL=https://lets-connect-collaboration-service.onrender.com
MEDIA_SERVICE_URL=https://lets-connect-media-service.onrender.com
SHOP_SERVICE_URL=https://lets-connect-shop-service.onrender.com
AI_SERVICE_URL=https://lets-connect-ai-service.onrender.com
```

---

### 4.3 Deploy Frontend

1. **Create New Static Site** (NOT Web Service)
   - Click **New** → **Static Site**
   - Repository: `Let-s-connect`
   - Name: `lets-connect-frontend`
   - Root Directory: `frontend`
   - Branch: `main`

2. **Build Settings:**
   ```
   Build Command: npm install && npm run build
   Publish Directory: build
   ```

3. **Environment Variables:**
   ```
   REACT_APP_API_URL=https://lets-connect-api-gateway.onrender.com
   ```

4. Click **Create Static Site**

5. Wait for build to complete (~3-5 minutes)

6. **Your App URL:** `https://lets-connect-frontend.onrender.com`

---

## Part 5: Configure Service Communication

### 5.1 Update API Gateway Environment Variables

After deploying all services, go back to API Gateway settings and update:

```bash
USER_SERVICE_URL=https://lets-connect-user-service.onrender.com
CONTENT_SERVICE_URL=https://lets-connect-content-service.onrender.com
# ... (all other service URLs)
```

### 5.2 Enable Internal Routing (Optional - Faster)

Render services can communicate via private network:

1. Go to each service → **Settings** → **Environment**
2. Add: `RENDER_INTERNAL_HOSTNAME` (automatically provided by Render)
3. Update API Gateway to use internal URLs:
   ```
   USER_SERVICE_URL=http://lets-connect-user-service:8001
   ```

---

## Part 6: Database Migrations

Since Sequelize auto-syncs models, tables will be created automatically on first service start. However, if you need to run manual migrations:

1. Go to **User Service** in Render dashboard
2. Click **Shell** (right side menu)
3. Run:
   ```bash
   node -e "const {sequelize} = require('./server'); sequelize.sync({force: false}).then(() => console.log('DB synced'))"
   ```

---

## Part 7: Testing & Verification

### 7.1 Check Service Health

1. Open each service URL in browser:
   - API Gateway: `https://lets-connect-api-gateway.onrender.com/health`
   - User Service: `https://lets-connect-user-service.onrender.com/health`
   - (Repeat for all services)

2. Expected response: `{"status":"ok"}` or similar

### 7.2 Test Registration

```bash
curl -X POST https://lets-connect-api-gateway.onrender.com/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

Expected: `{"message":"User registered successfully", "token":"...", "user":{...}}`

### 7.3 Test Frontend

1. Open: `https://lets-connect-frontend.onrender.com`
2. Click **Get Started Free** → Register new account
3. Try logging in
4. Navigate to different features (Feed, Videos, Chat, etc.)

---

## Part 8: Monitoring & Logs

### 8.1 View Logs

1. Dashboard → Select service → **Logs** tab
2. Real-time logs appear here
3. Use search to filter errors

### 8.2 Check Metrics

1. **Metrics** tab shows:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

### 8.3 Set Up Alerts (Optional)

1. Go to service → **Settings** → **Notifications**
2. Add email for deploy notifications
3. Enable "Notify on deploy failure"

---

## Part 9: Performance Optimization

### 9.1 Enable Caching

Add to each service's environment variables:
```bash
NODE_ENV=production
ENABLE_CACHE=true
```

### 9.2 Connection Pooling

For better database performance, add to services:
```bash
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_POOL_IDLE=10000
```

### 9.3 Frontend Optimization

Ensure build includes:
- Minification (automatic with CRA)
- Code splitting (automatic with React Router)
- Image optimization (consider Cloudflare CDN)

---

## Part 10: Custom Domain (Optional)

### 10.1 Add Custom Domain to Frontend

1. Frontend service → **Settings** → **Custom Domains**
2. Click **Add Custom Domain**
3. Enter your domain: `www.letsconnect.com`
4. Add DNS records shown by Render to your domain registrar:
   ```
   CNAME www YOUR-APP.onrender.com
   ```

5. Wait for DNS propagation (~10-60 minutes)
6. SSL certificate automatically provisioned

### 10.2 Update API URL

After custom domain is active:
1. Update frontend env var:
   ```
   REACT_APP_API_URL=https://api.letsconnect.com
   ```
2. Set up `api.letsconnect.com` to point to API Gateway

---

## Troubleshooting

### Service Won't Start

**Check Logs:**
- Go to service → Logs
- Look for errors like:
  - `ECONNREFUSED` → Database connection failed (check credentials)
  - `MODULE_NOT_FOUND` → Build failed (check package.json)
  - `Port already in use` → Change PORT env var

**Common Fixes:**
- Verify DATABASE_PASSWORD has no special characters (URL encode if needed)
- Ensure REDIS_URL format is correct
- Check JWT_SECRET is set in all services

### Database Connection Issues

1. **Supabase Connection Pooling:**
   - Go to Supabase → Settings → Database
   - Enable "Connection Pooling" (Mode: Transaction)
   - Use pooler connection string in Render

2. **Schema Not Found:**
   ```sql
   -- Run in Supabase SQL Editor
   SET search_path TO users, public;
   ```

3. **SSL Required:**
   Add to DATABASE_URL:
   ```
   ?sslmode=require
   ```

### Frontend Not Loading

1. **Build Failed:**
   - Check Render build logs
   - Verify `npm run build` works locally
   - Check for missing dependencies

2. **API Calls Failing:**
   - Open browser DevTools → Network tab
   - Check if API_URL is correct
   - Verify CORS enabled on API Gateway

### Performance Issues (Free Tier)

**Render Free Tier Limitations:**
- Services spin down after 15 minutes of inactivity
- First request after sleep takes ~30 seconds (cold start)
- 750 hours/month free (multiple services share this)

**Solutions:**
1. Keep services warm with external ping service (e.g., UptimeRobot)
2. Upgrade to paid tier ($7/month per service)
3. Consolidate services (combine related microservices)

---

## Cost Breakdown

### Free Tier (Current Setup)

| Service | Cost |
|---------|------|
| Supabase (500MB DB, 1GB storage) | $0/month |
| Upstash Redis (10K commands/day) | $0/month |
| Render Web Services (8 services) | $0/month* |
| Render Static Site (frontend) | $0/month |
| Cloudflare R2 (10GB storage) | $0/month |
| **TOTAL** | **$0/month** |

*Share 750 free hours across all services; services spin down after 15 min idle

### Paid Tier (Recommended for Production)

| Service | Cost |
|---------|------|
| Supabase Pro (8GB DB, 100GB storage) | $25/month |
| Upstash Redis (100K commands/day) | $10/month |
| Render Individual Plan (per service) | $7/month × 8 = $56/month |
| Render Static Site | $0/month |
| Cloudflare R2 (100GB storage) | ~$1.50/month |
| **TOTAL** | **~$92/month** |

---

## Migration to VPS Later

When ready to move to VPS:

1. **Export Supabase Data:**
   ```bash
   pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
   ```

2. **Download Code from GitHub:**
   ```bash
   git clone https://github.com/mufthakherul/Let-s-connect
   ```

3. **Copy Environment Variables:**
   - Export from Render → Settings → Environment
   - Save to `.env` file on VPS

4. **Deploy with Docker Compose:**
   ```bash
   cd Let-s-connect
   docker-compose up -d
   ```

5. **Import Data:**
   ```bash
   docker exec -i postgres psql -U postgres < backup.sql
   ```

---

## Security Checklist

- [ ] JWT_SECRET is strong (min 32 characters)
- [ ] Supabase Row Level Security (RLS) enabled
- [ ] API rate limiting enabled (check API Gateway)
- [ ] CORS configured to allow only your domain
- [ ] Environment variables not exposed in frontend
- [ ] SSL/HTTPS enabled (automatic on Render)
- [ ] Database password is strong and unique
- [ ] Supabase project has restricted API keys (not service_role in frontend)

---

## Support & Resources

- **Render Docs:** https://render.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Let's Connect Repo:** https://github.com/mufthakherul/Let-s-connect
- **Issues:** Open GitHub issue for bugs/questions

---

**Deployment Time Estimate:** 1-2 hours (first time)

**Next Steps After Deployment:**
1. Test all features thoroughly
2. Set up monitoring/alerts
3. Configure custom domain
4. Plan migration to VPS when ready
