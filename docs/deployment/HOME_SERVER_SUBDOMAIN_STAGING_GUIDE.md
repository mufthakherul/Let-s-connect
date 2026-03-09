# Home Server Staging with Namecheap Subdomain (VPS Production Later)

This guide helps you run **Milonexa** from your **local machine/home server** for testing and performance checks using a **subdomain from your existing Namecheap domain**, then move to a **VPS for production** when ready.

---

## Table of Contents

1. [Why this approach works](#why-this-approach-works)
2. [High-level architecture](#high-level-architecture)
3. [Prerequisites](#prerequisites)
4. [Choose your staging subdomains](#choose-your-staging-subdomains)
5. [Configure DNS in Namecheap](#configure-dns-in-namecheap)
6. [Prepare home network and server](#prepare-home-network-and-server)
7. [Deploy Milonexa on home server](#deploy-milonexa-on-home-server)
8. [Configure reverse proxy + HTTPS](#configure-reverse-proxy--https)
9. [Environment variables and CORS checklist](#environment-variables-and-cors-checklist)
10. [Validation checklist](#validation-checklist)
11. [Performance testing recommendations](#performance-testing-recommendations)
12. [Security hardening for home-server staging](#security-hardening-for-home-server-staging)
13. [Migration plan to VPS production](#migration-plan-to-vps-production)
14. [Cutover day checklist (zero-drama version)](#cutover-day-checklist-zero-drama-version)
15. [Troubleshooting](#troubleshooting)

---

## Why this approach works

You can avoid buying a new domain immediately by using subdomains like:

- `staging.yourdomain.com` → frontend
- `api-staging.yourdomain.com` → API gateway

Benefits:

- Test with a real domain and HTTPS early
- Validate OAuth/callback URLs before production
- Keep costs low while building
- Switch to VPS later with minimal DNS and env var updates

---

## High-level architecture

### Staging now (home server)

Internet → Namecheap DNS → Home Router (port forwarding) → Reverse Proxy (Nginx/Caddy) → Docker Compose services

### Production later (VPS)

Internet → Namecheap DNS → VPS Reverse Proxy/LB → Docker/Kubernetes services

---

## Prerequisites

1. Active domain in Namecheap (e.g., `yourdomain.com`)
2. Home server (Windows/Linux/macOS machine that stays on)
3. Docker + Docker Compose installed
4. Router admin access (for port forwarding)
5. Ability to allow inbound ports **80** and **443**
6. Public IP from ISP (static preferred, dynamic acceptable)

> If your ISP blocks inbound 80/443, use a Cloud Tunnel or reverse tunnel alternative for staging.

---

## Choose your staging subdomains

Recommended:

- `staging.yourdomain.com` for frontend
- `api-staging.yourdomain.com` for API

Optional extras:

- `grafana-staging.yourdomain.com`
- `minio-staging.yourdomain.com`

Keep production names clean for later:

- `yourdomain.com` (frontend prod)
- `api.yourdomain.com` (API prod)

---

## Configure DNS in Namecheap

Go to: **Domain List → Manage → Advanced DNS**

### If your home internet has static public IP

Create records:

- **A Record**
  - Host: `staging`
  - Value: `<YOUR_PUBLIC_IP>`
- **A Record**
  - Host: `api-staging`
  - Value: `<YOUR_PUBLIC_IP>`

### If your home internet has dynamic public IP

Use Namecheap Dynamic DNS (DDNS):

1. Enable Dynamic DNS in Namecheap for your domain.
2. Configure your router or a DDNS client on home server.
3. Keep A records for `staging` and `api-staging` and update automatically.

TTL: keep low (e.g., automatic / 5 min) during testing.

---

## Prepare home network and server

### Router settings

Port-forward:

- External `80` → home server `80`
- External `443` → home server `443`

Reserve a static LAN IP for your home server (DHCP reservation).

### Firewall settings

Allow inbound TCP:

- `80` (HTTP challenge and redirects)
- `443` (HTTPS)

---

## Deploy Milonexa on home server

From project root:

1. Configure `.env` for staging values
2. Build and run Compose stack
3. Ensure API gateway and frontend are healthy internally first

Use existing project deployment docs for full local stack setup:

- `docs/DEPLOYMENT_GUIDE.md`
- `docs/DEPLOYMENT.md`

---

## Configure reverse proxy + HTTPS

You need TLS even for staging to test real-browser behavior, OAuth, cookies, and security headers.

### Option A: Nginx + Let's Encrypt (Certbot)

Create virtual hosts:

- `staging.yourdomain.com` → frontend container/service
- `api-staging.yourdomain.com` → API gateway container/service

Then issue certificates using HTTP challenge.

### Option B: Caddy (simpler)

Caddy auto-provisions and renews certificates if DNS and ports are correctly configured.

---

## Environment variables and CORS checklist

For staging, update app settings consistently:

1. Frontend base API URL
   - `REACT_APP_API_URL=https://api-staging.yourdomain.com`
2. API CORS allowlist should include
   - `https://staging.yourdomain.com`
3. OAuth callback URLs (Google/GitHub/etc.)
   - Add staging callback endpoints
4. Cookie/security settings
   - Secure cookies for HTTPS
   - Correct SameSite policy for your auth flow

### Important project note

In this repository, frontend API URL is build-time sensitive. If changed, rebuild frontend image to apply it.

---

## Validation checklist

After DNS + proxy + app setup:

1. `https://staging.yourdomain.com` loads frontend
2. `https://api-staging.yourdomain.com/health` returns healthy response
3. Browser network calls succeed (no mixed content)
4. Register/login works
5. File upload works (if enabled)
6. OAuth login works with staging callback URLs
7. TLS certificate is valid and trusted

---

## Performance testing recommendations

Home-server staging is great for functional testing and early perf checks, but treat results as directional.

### Best practice

1. Run baseline tests on home server
2. Repeat the same scenarios on VPS before launch
3. Compare key metrics:
   - p95/p99 latency
   - error rate
   - throughput
   - CPU/memory usage per service

### Scope guidance

- Use home server for:
  - feature validation
  - integration tests
  - lightweight load tests
- Use VPS for final:
  - realistic load tests
  - network latency validation
  - production sizing

---

## Security hardening for home-server staging

Even for staging, do the basics:

1. Use strong secrets in `.env`
2. Disable default credentials (especially storage/admin tools)
3. Restrict non-public ports (DB, Redis, internal services)
4. Keep only 80/443 exposed publicly
5. Enable fail2ban / rate limits at proxy layer
6. Keep OS and Docker updated
7. Back up data snapshots before major tests

> Never expose PostgreSQL/Redis directly to the internet.

---

## Migration plan to VPS production

When the website is complete, move compute to VPS while keeping the same domain.

### Phase 1: Provision VPS

1. Create VPS with enough CPU/RAM/storage
2. Install Docker, Compose, reverse proxy
3. Harden server (SSH keys, firewall, fail2ban)

### Phase 2: Deploy application to VPS

1. Copy project and `.env` production values
2. Start stack and verify locally on VPS
3. Configure HTTPS and domain vhosts on VPS

### Phase 3: DNS cutover

Update Namecheap records:

- `@` / `www` (or prod frontend host) → VPS IP
- `api` → VPS IP

Keep staging records pointed to home server (optional) for ongoing testing.

### Phase 4: Post-cutover checks

1. Validate frontend, API, login, uploads, search, messaging
2. Monitor logs and errors for 24–48h
3. Rollback plan: revert A records to previous endpoint if critical issue

---

## Cutover day checklist (zero-drama version)

1. Lower DNS TTL 24h before cutover
2. Deploy and verify on VPS by direct IP/host mapping first
3. Switch DNS records at low traffic window
4. Watch health dashboards + logs
5. Keep home staging online for quick rollback and parity testing

---

## Troubleshooting

### DNS not resolving

- Wait for propagation
- Verify A/CNAME records in Namecheap
- Confirm no conflicting records

### SSL certificate issuance fails

- Ensure ports 80/443 are open and forwarded correctly
- Ensure DNS points to correct public IP
- Confirm proxy hostnames match certificate request

### Site opens but API fails (CORS/network)

- Verify frontend points to `https://api-staging.yourdomain.com`
- Confirm backend CORS allowlist includes staging frontend URL
- Check API gateway and service logs

### Works locally but not from internet

- Check CGNAT/ISP restrictions
- Verify router port forwarding target IP
- Confirm home firewall inbound rules

---

## Recommended rollout strategy

Use this practical sequence:

1. Home server + subdomain staging now
2. Complete development and major feature testing
3. Provision VPS and run staging parity tests
4. Move production traffic to VPS
5. Keep subdomain staging as permanent pre-release environment

This gives you low-cost iteration now and a cleaner production launch later.
