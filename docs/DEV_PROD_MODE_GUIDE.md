# Frontend Development & Production Mode Guide

## Overview
The frontend now supports **both development and production modes** based on the `NODE_ENV` environment variable.

---

## 🚀 Development Mode (npm start with hot reload)

### ✅ What You Get:
- **Hot Reload**: Changes to code automatically refresh in the browser without rebuilding
- **Source Maps**: Full debugging with readable source code in DevTools (not minified)
- **Faster Development**: Skip the build step, instant feedback
- **Full Error Traces**: See actual file names and line numbers in console errors

### 🔧 Enable Development Mode:

**Option 1: Set in .env (Recommended for persistent development)**
```env
NODE_ENV=development
GENERATE_SOURCEMAP=true
```

Then run:
```bash
docker compose up -d
```

**Option 2: Override at startup**
```bash
NODE_ENV=development docker compose up -d
```

### 🌐 Access Frontend:
- **Development Server**: `http://localhost:3000` (runs `npm start`)
- **DevTools F12**: Full source maps, readable stack traces

---

## 📦 Production Mode (npm run build + Nginx)

### ✅ What You Get:
- **Optimized Bundle**: Minified, tree-shaken, code-split
- **Nginx Static Serve**: Fast CDN-like delivery
- **Sourcemap Disabled**: Smaller bundle size
- **Production Ready**: Runs like it would on a real server

### 🔧 Enable Production Mode:

**Option 1: Set in .env**
```env
NODE_ENV=production
GENERATE_SOURCEMAP=false
```

Then run:
```bash
docker compose up -d
```

**Option 2: Override at startup**
```bash
NODE_ENV=production docker compose up -d
```

### 🌐 Access Frontend:
- **Nginx Server**: `http://localhost:3000` (runs full build + Nginx)
- **Faster Performance**: Optimized bundle, minified CSS/JS
- **Production Testing**: Test as users would see it

---

## 📋 How It Works

### Docker Entrypoint (`frontend/docker-entrypoint.sh`)
The entrypoint script checks `NODE_ENV` at container startup:

```bash
if [ "$NODE_ENV" = "development" ]; then
  echo "Starting in DEVELOPMENT mode..."
  npm start  # Hot reload dev server
else
  echo "Starting in PRODUCTION mode..."
  npm run build  # Build optimized bundle
  nginx -g "daemon off;"  # Serve with Nginx
fi
```

### Docker Compose Environment Variables
The `docker-compose.yml` passes `NODE_ENV` and `GENERATE_SOURCEMAP` to the frontend service:

```yaml
frontend:
  build:
    context: ./frontend
    args:
      - REACT_APP_API_URL=${REACT_APP_API_URL}
  environment:
    - NODE_ENV=${NODE_ENV:-production}
    - GENERATE_SOURCEMAP=${GENERATE_SOURCEMAP:-false}
```

---

## 🔄 Switching Between Modes

### Stop All Services
```bash
docker compose down
```

### Switch to Development
```bash
# Update .env
echo "NODE_ENV=development" >> .env
echo "GENERATE_SOURCEMAP=true" >> .env

# Or use environment override
NODE_ENV=development docker compose up -d
```

### Switch to Production
```bash
# Update .env
echo "NODE_ENV=production" >> .env
echo "GENERATE_SOURCEMAP=false" >> .env

# Or use environment override
NODE_ENV=production docker compose up -d
```

### View Current Mode
Check the frontend container logs:
```bash
docker compose logs frontend | grep -i "starting in"
```

---

## 🐛 Debugging in Development Mode

### View Console Errors
1. Open frontend at `http://localhost:3000`
2. Press `F12` to open DevTools
3. Go to **Console** tab
4. Errors will show **actual file names and line numbers** (not minified like production)

### Example Error in Development:
```
TypeError: Cannot read properties of undefined (reading 'type')
    at decomposeColor (colorManipulator.js:75:1)  ← Real file and line!
    at App.js:145  ← Actual component code
```

### Edit & Test
- Edit `frontend/src/App.js` or any React component
- Save the file
- Browser auto-refreshes within seconds
- No need to rebuild or restart container

---

## 🎯 Frontend Fixes Applied

All the following defensive code improvements are active in both modes:

### ✅ Theme Color Defaults
- Added fallback colors to prevent `undefined` values in MUI palette
- Both primary and secondary colors have defaults
- High-contrast mode colors properly defined

### ✅ Service Worker
- Automatically disabled in development/Codespaces
- Enabled in production for PWA support

### ✅ Null-Safety Checks
- `App.js`: Avatar and profile display use optional chaining (`?.`)
- `NotificationCenter.js`: Notification objects safely accessed
- `SearchAutocomplete.js`: Autocomplete options handled defensively

---

## 📊 Performance Comparison

| Aspect | Development | Production |
|--------|------------|------------|
| **Startup Time** | ~5-10 seconds | ~30-40 seconds (first build) |
| **Hot Reload** | ✅ Instant | ❌ Need restart |
| **Bundle Size** | ~2-3 MB | ~500-700 KB |
| **Source Maps** | ✅ Full | ❌ Disabled |
| **Debugging** | ✅ Easy | ❌ Minified |
| **Production Ready** | ❌ No | ✅ Yes |

---

## ⚡ Quick Commands

```bash
# Start in development (with hot reload)
NODE_ENV=development docker compose up -d

# Start in production (optimized)
NODE_ENV=production docker compose up -d

# View frontend logs
docker compose logs -f frontend

# Stop all services
docker compose down

# Rebuild frontend only
docker compose build --no-cache frontend

# View running containers
docker compose ps
```

---

## 🔗 Related Files

- **Frontend Dockerfile**: `frontend/Dockerfile` (uses entrypoint.sh)
- **Entrypoint Script**: `frontend/docker-entrypoint.sh` (detects NODE_ENV)
- **Docker Compose**: `docker-compose.yml` (passes NODE_ENV)
- **Environment File**: `.env` (sets NODE_ENV and GENERATE_SOURCEMAP)
- **App Component**: `frontend/src/App.js` (theme with defensive defaults)

---

## 🎓 Example Workflow

### Day-to-Day Development:
1. Set `NODE_ENV=development` in `.env`
2. Start services: `docker compose up -d`
3. Open `http://localhost:3000`
4. Edit React components in `frontend/src/`
5. See changes instantly with hot reload
6. Use F12 DevTools to debug with full source maps
7. Commit code when ready

### Before Deployment:
1. Switch to `NODE_ENV=production`
2. Restart frontend: `docker compose restart frontend`
3. Test production build at `http://localhost:3000`
4. Verify minification and bundle size
5. Deploy with confidence!

---

## ✨ Key Improvements Made

| Issue | Solution | Benefit |
|-------|----------|---------|
| MUI color errors | Defensive palette defaults | No more "cannot read .type" errors |
| Long debugging cycles | Hot reload in dev mode | 10x faster iteration |
| Confusing errors | Source maps enabled | Real file names in stack traces |
| Environment confusion | NODE_ENV detection | Automatic mode selection |
| Missing manifest | SW disabled in dev | No CORS errors in Codespaces |

---

**Last Updated**: February 16, 2026  
**Frontend Framework**: React 18.3.1 with Material-UI v5  
**Supported**: Development (hot reload) & Production (optimized)
