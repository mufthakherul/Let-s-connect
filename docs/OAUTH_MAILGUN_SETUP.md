# OAuth and Mailgun Configuration Guide

## 🚀 Quick Start

This guide walks you through setting up OAuth authentication (Google & GitHub) and Mailgun email service for the Let's Connect platform.

---

## 📧 Step 1: Configure Mailgun Email Service

### Register for Mailgun Account

1. Go to [mailgun.com](https://mailgun.com)
2. Click "Sign Up" and create an account (free tier available)
3. Confirm your email address

### Get Mailgun API Keys

1. Log in to Mailgun Dashboard
2. Go to **Account → API Keys** (sidebar)
3. Copy the following values:
   - **API Key** (starts with `key-`)
   - **Public Key** (starts with `pubkey-`)
4. Go to **Sending → Domains**
5. Note your sandbox domain (e.g., `sandbox.mailgun.org`)

### Update .env File

Create a `.env` file in your project root and add:

```bash
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxx
MAILGUN_PUBLIC_KEY=pubkey-xxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=sandbox.mailgun.org
MAILGUN_BASE_URL=https://api.mailgun.net
EMAIL_FROM=noreply@sandbox.mailgun.org
```

### For Production Email Sending

1. Add a **verified sender email** in Mailgun:
   - Go to **Sending → Domains**
   - Click your domain
   - Go to **Authorized Recipients**
   - Add your email address
   - Check confirmation email

2. Or use a **custom domain** (requires DNS configuration):
   - Go to **Sending → Domains**
   - Click "Add New Domain"
   - Follow DNS instructions
   - Once verified, update `MAILGUN_DOMAIN` to your custom domain

### Test Mailgun Setup

```bash
# These endpoints are already configured in the frontend
# Test via email preferences: http://localhost:3000/notifications/email
# Click "Send Test Email"
# Check Mailgun logs at: https://app.mailgun.com/app/logs
```

---

## 🔐 Step 2: Configure Google OAuth 2.0

### Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Create Project**
3. Enter project name (e.g., "Let's Connect")
4. Click **Create**
5. Wait for project to be created

### Enable Google+ API

1. In Google Cloud Console, go to **APIs & Services → Library**
2. Search for "Google+ API"
3. Click **Google+ API**
4. Click **Enable**
5. Wait for API to enable

### Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth 2.0 Client ID**
3. If prompted to create OAuth consent screen:
   - Choose **External** for User Type
   - Fill in app information:
     - App name: "Let's Connect"
     - User support email: Your email
     - Developer contact: Check your email
   - Click **Save and Continue**
   - Add scopes: `email`, `profile`, `openid`
   - Click **Save and Continue**
   - Add test users (your email) if desired
   - Click **Save and Continue**

4. Back to credentials page, click **Create Credentials → OAuth 2.0 Client ID**
5. Select **Web application**
6. Under **Authorized redirect URIs**, click **Add URI** and enter:
   ```
   http://localhost:8001/oauth/google/callback
   ```
   (For production, also add: `https://yourdomain.com/oauth/google/callback`)
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

### Update .env File

```bash
GOOGLE_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:8001/oauth/google/callback
```

---

## 🐙 Step 3: Configure GitHub OAuth 2.0

### Create GitHub OAuth App

1. Log in to [GitHub](https://github.com)
2. Go to **Settings → Developer settings → OAuth apps** (sidebar)
3. Click **New OAuth App**
4. Fill in the form:
   - **Application name:** Let's Connect
   - **Homepage URL:** `http://localhost:3000`
   - **Application description:** Social networking platform with OAuth authentication
   - **Authorization callback URL:** `http://localhost:8001/oauth/github/callback`
     (For production: `https://yourdomain.com/oauth/github/callback`)
5. Click **Register application**
6. Copy the **Client ID** and **Client Secret**

### Update .env File

```bash
GITHUB_CLIENT_ID=Ov23lixxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_REDIRECT_URI=http://localhost:8001/oauth/github/callback
```

---

## 📝 Complete .env Configuration

Create a `.env` file in your project root with all values:

```bash
# ==================== JWT & SECURITY ====================
JWT_SECRET=your-super-secret-jwt-key-change-this

# ==================== DATABASE ====================
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/users

# ==================== REDIS ====================
REDIS_URL=redis://redis:6379

# ==================== ELASTICSEARCH ====================
ELASTICSEARCH_URL=http://elasticsearch:9200

# ==================== MAILGUN ====================
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxx
MAILGUN_PUBLIC_KEY=pubkey-xxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=sandbox.mailgun.org
EMAIL_FROM=noreply@sandbox.mailgun.org

# ==================== GOOGLE OAUTH ====================
GOOGLE_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:8001/oauth/google/callback

# ==================== GITHUB OAUTH ====================
GITHUB_CLIENT_ID=Ov23lixxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_REDIRECT_URI=http://localhost:8001/oauth/github/callback

# ==================== FRONTEND ====================
REACT_APP_API_URL=http://localhost:8000
```

---

## 🐳 Update docker-compose with Environment File

The `docker-compose.yml` is already configured to use environment variables. Just ensure your `.env` file is in the root directory before starting:

```bash
# Copy .env.example to .env and fill in your values
cp .env.example .env

# Start services with environment variables loaded
docker-compose up -d
```

---

## ✅ Verification Checklist

### Mailgun

- [ ] API Key copied to .env
- [ ] Public Key copied to .env
- [ ] Domain set in .env
- [ ] Email FROM address set
- [ ] Test email sent successfully from email preferences page

### Google OAuth

- [ ] Google Cloud Project created
- [ ] Google+ API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 Client ID created
- [ ] Redirect URI added: `http://localhost:8001/oauth/google/callback`
- [ ] Client ID and Secret copied to .env
- [ ] Login page shows Google button

### GitHub OAuth

- [ ] GitHub OAuth App created
- [ ] Client ID and Secret copied to .env
- [ ] Redirect URI added: `http://localhost:8001/oauth/github/callback`
- [ ] Login page shows GitHub button

### Services Running

- [ ] `docker-compose up -d` completes successfully
- [ ] `http://localhost:8000/health` returns `{"status": "healthy"}`
- [ ] Frontend loads at `http://localhost:3000`
- [ ] Login page accessible at `http://localhost:3000/login`
- [ ] OAuth buttons visible on login page

---

## 🧪 Testing OAuth Login Flow

### Test Google OAuth

1. Navigate to `http://localhost:3000/login`
2. Click **"Sign in with Google"** button
3. Google login page should open
4. Sign in with your Google account
5. You should be redirected back to Let's Connect app
6. User account created automatically

### Test GitHub OAuth

1. Navigate to `http://localhost:3000/login`
2. Click **"Sign in with GitHub"** button
3. GitHub login page should open
4. Authorize the application
5. You should be redirected back to Let's Connect app
6. User account created automatically

### Test Email Service

1. Navigate to `http://localhost:3000/notifications/email`
2. Toggle "Email Notifications" ON
3. Enter your email address in test field
4. Click "Send Test Email"
5. Check your inbox for test email
6. Monitor Mailgun logs: https://app.mailgun.com/app/logs

---

## 🚨 Troubleshooting

### OAuth Redirect URI Mismatch Error

**Problem:** "The redirect_uri parameter does not match..."

**Solution:**
- Verify redirect URI matches exactly in OAuth provider settings
- Google: `http://localhost:8001/oauth/google/callback`
- GitHub: `http://localhost:8001/oauth/github/callback`
- Check for trailing slashes or protocol mismatches (http vs https)

### Mailgun Email Not Sending

**Problem:** "Failed to send email" error

**Solution:**
1. Verify `MAILGUN_API_KEY` is correct:
   ```bash
   curl -s --user 'api:YOUR_API_KEY' \
     https://api.mailgun.net/v3/sandbox.mailgun.org/messages
   ```
2. Check env variable is loaded: `docker logs user-service | grep MAILGUN`
3. Verify domain is correct (usually `sandbox` for free tier)
4. For custom domain, ensure it's verified in Mailgun

### OAuth Button Not Appearing

**Problem:** Login page missing OAuth buttons

**Solution:**
1. Clear browser cache
2. Restart frontend: `docker restart frontend`
3. Check browser console for errors
4. Verify environment variables passed to frontend

### "Invalid client" OAuth Error

**Problem:** "Invalid client" or "Client authentication failed"

**Solution:**
1. Verify Client ID and Client Secret are correct
2. Try revoking and creating new credentials
3. Ensure credentials match in `.env` file
4. Restart user-service after env changes

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::8000`

**Solution:**
```bash
# Find process using port
lsof -i :8000

# Kill process (replace PID)
kill -9 <PID>

# Or change port in docker-compose.yml
```

---

## 🔒 Production Deployment Checklist

### Mailgun

- [ ] Create custom domain (not using sandbox)
- [ ] DNS records verified
- [ ] SPF and DKIM configured
- [ ] Sender email verified in Mailgun
- [ ] MAILGUN_DOMAIN set to custom domain
- [ ] EMAIL_FROM set to verified sender

### OAuth

- [ ] Created production OAuth apps (separate from dev)
- [ ] Redirect URIs set to production domain
- [ ] CLIENT_ID and CLIENT_SECRET for production
- [ ] Verified email account for testing
- [ ] Two-factor authentication enabled on OAuth provider accounts

### Security

- [ ] `JWT_SECRET` changed to strong random value
- [ ] `ENCRYPTION_KEY` set securely
- [ ] `.env` file NOT committed to git
- [ ] `.gitignore` includes `.env`
- [ ] Environment variables set in deployment platform
- [ ] HTTPS enabled on frontend and API

### Deployment

- [ ] `.env` variables set in production environment
- [ ] `NODE_ENV=production` set
- [ ] Frontend built with production optimizations
- [ ] APIs configured for production domain
- [ ] SSL certificates installed
- [ ] Rate limiting verified
- [ ] Error handling configured

---

## 📚 Additional Resources

- [Mailgun Documentation](https://documentation.mailgun.com/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Express HTTP Proxy](https://github.com/villekulla-ngo/express-http-proxy)
- [simple-oauth2 Library](https://github.com/lelylan/simple-oauth2)

---

## 🎯 Summary

| Service | Status | Next Step |
|---------|--------|-----------|
| Mailgun | ✅ Configured | Send test email |
| Google OAuth | ✅ Configured | Test login flow |
| GitHub OAuth | ✅ Configured | Test login flow |
| API Gateway | ✅ Routes added | Verify health check |
| Docker Compose | ✅ Updated | Start services |
| Frontend | ✅ Components ready | Load app in browser |

All systems configured and ready for testing! 🚀
