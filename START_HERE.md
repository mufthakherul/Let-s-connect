# ⚡ OAUTH & MAILGUN - QUICK START (Do This First!)

**Status:** ✅ Code is ready. Just need your credentials!  
**Time to complete:** ~50 minutes  
**Difficulty:** Easy

---

## 🎯 What You Need to Do

### Step 1: Get 3 Credentials (30 min)

#### Mailgun (10 minutes)
1. Go to: https://mailgun.com
2. Click "Sign Up" → Create account
3. Go to: Account → API Keys
4. Copy these 2 values:
   - `API Key` (starts with `key-`)
   - `Public Key` (starts with `pubkey-`)
5. Note your domain (usually `sandbox.mailgun.org`)

#### Google OAuth (10 minutes)
1. Go to: https://console.cloud.google.com
2. Create new project
3. Search: "Google+ API" → Enable it
4. Go to: APIs & Services → Credentials
5. Create OAuth 2.0 Client ID (Web app)
6. Add redirect URI: `http://localhost:8001/oauth/google/callback`
7. Copy: Client ID and Client Secret

#### GitHub OAuth (10 minutes)
1. Go to: https://github.com/settings/developers
2. New OAuth App
3. Set callback URL: `http://localhost:8001/oauth/github/callback`
4. Copy: Client ID and Client Secret

---

### Step 2: Create .env File (5 min)

```bash
# In project root, copy template
cp .env.example .env

# Open .env and fill in your 6 credentials:
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxx         # From Mailgun
MAILGUN_PUBLIC_KEY=pubkey-xxxxxxxxxxxxxxxx       # From Mailgun
MAILGUN_DOMAIN=sandbox.mailgun.org                # From Mailgun
GOOGLE_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com        # From Google
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx     # From Google
GITHUB_CLIENT_ID=Ov23lixxxxxxxxxxxxxxxxxx        # From GitHub
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxx # From GitHub

# The rest are already filled in .env.example
```

---

### Step 3: Start Services (5 min)

```bash
# Start all services
docker-compose up -d

# Verify it's running
curl http://localhost:8000/health

# Should return: {"status":"healthy","timestamp":"..."}
```

---

### Step 4: Test Features (10 min)

#### Test Email Service
1. Go to: http://localhost:3000/notifications/email
2. Click "Send Test Email"
3. Check your inbox for test email
4. ✅ If you got email, Mailgun is working!

#### Test Google OAuth
1. Go to: http://localhost:3000/login
2. Click "Sign in with Google"
3. Sign in to your Google account
4. ✅ If redirected back to app, it works!

#### Test GitHub OAuth
1. Go to: http://localhost:3000/login
2. Click "Sign in with GitHub"
3. Authorize the app
4. ✅ If redirected back to app, it works!

---

## 📋 Files Changed by Us

✅ **services/api-gateway/server.js** - Added OAuth routes
✅ **docker-compose.yml** - Added environment variables
✅ **.env.example** - Created configuration template

No other files were modified. Everything is ready to go!

---

## 📚 Need More Info?

### Quick Links
- **Stuck?** → [OAUTH_MAILGUN_QUICK_REF.md](OAUTH_MAILGUN_QUICK_REF.md)
- **Detailed steps?** → [OAUTH_MAILGUN_SETUP.md](OAUTH_MAILGUN_SETUP.md)
- **Troubleshooting?** → [OAUTH_MAILGUN_SETUP.md#-troubleshooting-guide](OAUTH_MAILGUN_SETUP.md)
- **Full technical?** → [OAUTH_MAILGUN_CONFIG_COMPLETE.md](OAUTH_MAILGUN_CONFIG_COMPLETE.md)

---

## ⚠️ Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| `.env` file not found | Run: `cp .env.example .env` |
| Credentials are empty | Fill them in .env and restart docker |
| Port already in use | Run: `docker ps` and check what's running |
| OAuth button not showing | Clear browser cache, restart frontend |
| Email not sending | Check Mailgun dashboard for logs |

---

## ✅ Success Looks Like

After these 4 steps:

```
✓ docker-compose up -d succeeds
✓ curl http://localhost:8000/health returns healthy
✓ http://localhost:3000 loads the app  
✓ Google OAuth button visible on login page
✓ GitHub OAuth button visible on login page
✓ Email preferences page loads and can send test email
✓ All 7 Phase 3 features accessible in navigation
```

If all these check out, you're done! 🎉

---

## 🚀 What Happens Next?

Once everything works:

1. **Users can log in via Google or GitHub**
   - Account auto-created
   - JWT token issued
   - Session maintained

2. **Email notifications work**
   - Users receive test emails
   - Email settings saved
   - Notifications configurable

3. **All 7 Phase 3 features available**
   - Advanced Search (Elasticsearch)
   - Calls (WebRTC)
   - Folders (Document management)
   - Wiki Diff (Version control)
   - Databases (Notion-like views)
   - Email Settings (Notifications)

---

## 🎯 Just the Commands

```bash
# Step 1: Copy config template
cp .env.example .env

# Step 2: Edit .env and add your 6 credentials
nano .env
# or use your favorite editor

# Step 3: Start all services
docker-compose up -d

# Step 4: Verify setup
curl http://localhost:8000/health

# Step 5: Open and test
open http://localhost:3000/login
```

---

**That's it! 45 minutes and you're live!** ✨

For detailed instructions, see: [OAUTH_MAILGUN_QUICK_REF.md](OAUTH_MAILGUN_QUICK_REF.md)
