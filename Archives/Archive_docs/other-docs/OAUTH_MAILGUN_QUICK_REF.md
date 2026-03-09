# OAuth & Mailgun Configuration - Quick Reference Card

## ✅ COMPLETED

### API Gateway Routes
```javascript
// 4 new OAuth routes added to /services/api-gateway/server.js
GET /api/auth/oauth/google/authorize      (public)
GET /api/auth/oauth/google/callback       (public)
GET /api/auth/oauth/github/authorize      (public)
GET /api/auth/oauth/github/callback       (public)
```

### Environment Variables Added
```yaml
# docker-compose.yml - user-service section
MAILGUN_API_KEY, MAILGUN_PUBLIC_KEY, MAILGUN_DOMAIN, EMAIL_FROM
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI
```

### Documentation
✅ .env.example - Complete template with instructions
✅ OAUTH_MAILGUN_SETUP.md - Step-by-step setup guide
✅ OAUTH_MAILGUN_CONFIG_COMPLETE.md - Complete configuration summary

---

## 🔧 REQUIRED NEXT STEPS

### 1. Create .env File (5 minutes)
```bash
cp .env.example .env
```

### 2. Get Mailgun Credentials (10 minutes)
- Sign up: https://mailgun.com
- Account → API Keys
- Copy API Key and Public Key
- Note sandbox domain

Add to `.env`:
```
MAILGUN_API_KEY=key-xxxxx
MAILGUN_PUBLIC_KEY=pubkey-xxxxx
MAILGUN_DOMAIN=sandbox.mailgun.org
EMAIL_FROM=noreply@sandbox.mailgun.org
```

### 3. Get Google OAuth Credentials (10 minutes)
- Go to: https://console.cloud.google.com
- Create project
- Enable Google+ API
- Create OAuth 2.0 Web App credentials
- Add redirect URI: `http://localhost:8001/oauth/google/callback`

Add to `.env`:
```
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

### 4. Get GitHub OAuth Credentials (5 minutes)
- Go to: https://github.com/settings/developers
- Create new OAuth App
- Set callback: `http://localhost:8001/oauth/github/callback`

Add to `.env`:
```
GITHUB_CLIENT_ID=Ov23lixxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxx
```

### 5. Start Services (2 minutes)
```bash
docker-compose up -d
```

### 6. Verify Setup (5 minutes)
```bash
# Health check
curl http://localhost:8000/health          # ✅ should return {"status": "healthy"}

# Check logs
docker logs api-gateway | grep OAuth       # ✅ should show route config
docker logs user-service | grep MAILGUN    # ✅ should show env vars loaded
```

### 7. Test Features (10 minutes)
- [ ] Email notifications: http://localhost:3000/notifications/email → Send test email
- [ ] Google OAuth: http://localhost:3000/login → Click Google button
- [ ] GitHub OAuth: http://localhost:3000/login → Click GitHub button

---

## 📊 Status Checklist

| Item | Status | Notes |
|------|--------|-------|
| API Gateway OAuth routes | ✅ | 4 routes added |
| Env vars in docker-compose | ✅ | 9 variables added |
| .env.example template | ✅ | Complete with instructions |
| Mailgun setup doc | ✅ | OAUTH_MAILGUN_SETUP.md |
| **Mailgun credentials** | ❌ | **USER ACTION NEEDED** |
| **Google OAuth app** | ❌ | **USER ACTION NEEDED** |
| **GitHub OAuth app** | ❌ | **USER ACTION NEEDED** |
| **.env file created** | ❌ | **USER ACTION NEEDED** |
| Services started | ❌ | Once .env is ready |
| Feature testing | ❌ | After services start |

---

## 📞 Commands Reference

```bash
# Create .env from template
cp .env.example .env

# Start all services
docker-compose up -d

# View service logs
docker logs api-gateway
docker logs user-service
docker logs frontend

# Health checks
curl http://localhost:8000/health          # API Gateway
curl http://localhost:8001/                # User Service
curl http://localhost:3000/login           # Frontend Login

# Stop services
docker-compose down

# Rebuild services
docker-compose up -d --build

# Check running containers
docker ps
```

---

## 🌐 Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Web application |
| API Gateway | http://localhost:8000 | API routing |
| User Service | http://localhost:8001 | Auth & OAuth |
| Mailgun | https://app.mailgun.com | Email logs |
| Google Console | https://console.cloud.google.com | OAuth credentials |
| GitHub Settings | https://github.com/settings/developers | OAuth app |

---

## 📋 Environment Variables Checklist

Copy-paste template into `.env`:

```bash
# Core
JWT_SECRET=your-secret-key-change-this

# Database & Cache
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/users
REDIS_URL=redis://redis:6379
ELASTICSEARCH_URL=http://elasticsearch:9200

# Mailgun (get from: https://app.mailgun.com)
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxx
MAILGUN_PUBLIC_KEY=pubkey-xxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=sandbox.mailgun.org
EMAIL_FROM=noreply@sandbox.mailgun.org

# Google OAuth (get from: https://console.cloud.google.com)
GOOGLE_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:8001/oauth/google/callback

# GitHub OAuth (get from: https://github.com/settings/developers)
GITHUB_CLIENT_ID=Ov23lixxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_REDIRECT_URI=http://localhost:8001/oauth/github/callback

# Frontend
REACT_APP_API_URL=http://localhost:8000

# AI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🎯 Development Quick Start (3 steps)

1. **Setup credentials:**
   ```bash
   cp .env.example .env
   # Fill in Mailgun, Google, GitHub credentials in .env
   ```

2. **Start services:**
   ```bash
   docker-compose up -d
   ```

3. **Test:**
   - Open http://localhost:3000/login
   - Click "Sign in with Google" or "Sign in with GitHub"
   - Or go to http://localhost:3000/notifications/email to test email

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `Redirect URI mismatch` | Ensure exact match in OAuth provider settings |
| `Mailgun email not sending` | Verify API key and domain in .env |
| `OAuth button not showing` | Clear browser cache, restart frontend |
| `Port already in use` | Stop other services using that port |
| `Services won't start` | Check .env file exists and has all required vars |

---

## 📞 Support Links

- **Email Issues:** https://documentation.mailgun.com/
- **Google OAuth:** https://developers.google.com/identity/protocols/oauth2
- **GitHub OAuth:** https://docs.github.com/en/developers/apps/building-oauth-apps
- **Docker Compose:** https://docs.docker.com/compose/

---

**Time to Complete: ~45 minutes** ⏱️

**Current Status: Configuration Complete ✅**
**Pending: User Action (Credentials Setup) ⏳**
