# Reverse Proxy Setup for Staging (Namecheap + Home Server)

This document provides **project-specific**, copy/paste-ready reverse proxy setup for Let's Connect staging using:

- `staging.yourdomain.com` → `frontend` (`localhost:3000`)
- `api-staging.yourdomain.com` → `api-gateway` (`localhost:8000`)

It is designed for your current `docker-compose.yml` service map.

---

## What this setup assumes

From your current compose stack:

- Frontend container is exposed on `3000:3000`
- API Gateway is exposed on `8000:8000`
- API Gateway routes internal service traffic (`/api/user`, `/api/content`, `/api/messaging`, etc.)

So reverse proxy only needs to send:

- frontend host → port `3000`
- API host → port `8000`

---

## DNS records in Namecheap

Create the following **A records**:

1. Host: `staging` → Value: `<YOUR_HOME_PUBLIC_IP>`
2. Host: `api-staging` → Value: `<YOUR_HOME_PUBLIC_IP>`

If IP is dynamic, enable Namecheap DDNS and keep the A records updated.

---

## Router and firewall requirements

1. Port forward `80` → home server `80`
2. Port forward `443` → home server `443`
3. Allow inbound TCP `80` and `443`

Do **not** expose internal service ports (8000, 5432, 6379, etc.) publicly.

---

## Option A: Nginx (recommended if you already use Nginx)

Template file:

- `deploy/reverse-proxy/nginx/staging.conf`

### Steps

1. Copy template into your system Nginx sites config.
2. Replace placeholders:
   - `staging.yourdomain.com`
   - `api-staging.yourdomain.com`
3. Test and reload Nginx.
4. Issue TLS certs with Certbot for both hosts.

### Why this template is tuned for this project

- Includes WebSocket upgrade headers (useful for real-time routes)
- Preserves forwarding headers (`X-Forwarded-*`, `X-Request-Id`)
- Enables gzip for common text payloads
- Uses dedicated API host instead of path-based host sharing

---

## Option B: Caddy (fastest HTTPS path)

Template file:

- `deploy/reverse-proxy/caddy/Caddyfile.staging`

### Steps

1. Copy Caddyfile template.
2. Replace domain placeholders.
3. Start/reload Caddy.

Caddy automatically handles certificate issuance/renewal when DNS and ports are correct.

---

## Required `.env` updates for staging

Set/update values:

1. `REACT_APP_API_URL=https://api-staging.yourdomain.com`
2. `CORS_ORIGINS=https://staging.yourdomain.com`
3. OAuth callback values (if enabled):
   - `GOOGLE_REDIRECT_URI=https://api-staging.yourdomain.com/api/auth/oauth/google/callback`
   - `GITHUB_REDIRECT_URI=https://api-staging.yourdomain.com/api/auth/oauth/github/callback`

Then rebuild frontend image (important because API URL is build-time sensitive):

- Rebuild `frontend` service and restart stack.

---

## Verification checklist

1. `https://staging.yourdomain.com` loads frontend
2. `https://api-staging.yourdomain.com/health` returns healthy response
3. Login/register works without CORS errors
4. WebSocket-dependent features connect successfully
5. OAuth redirects return to staging successfully

---

## Migration to VPS later

When moving to VPS production:

1. Reuse same proxy pattern on VPS
2. Point production records (`@`, `www`, `api`) to VPS IP
3. Keep staging subdomains on home server (optional) for pre-release testing

This keeps your deployment workflow stable while you transition infrastructure.
