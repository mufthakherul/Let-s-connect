# Reverse Proxy Setup Guide

This guide covers configuring Nginx and Caddy as reverse proxies in front of the Milonexa platform.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Nginx Configuration](#2-nginx-configuration)
3. [WebSocket Proxying](#3-websocket-proxying)
4. [TLS with Let's Encrypt](#4-tls-with-lets-encrypt)
5. [Caddy Alternative](#5-caddy-alternative)
6. [Security Headers](#6-security-headers)
7. [Rate Limiting](#7-rate-limiting)
8. [Gzip Compression](#8-gzip-compression)
9. [Static File Caching](#9-static-file-caching)
10. [API Proxy Configuration](#10-api-proxy-configuration)
11. [Health Check Endpoints](#11-health-check-endpoints)

---

## 1. Architecture Overview

```
Internet
    │
    ▼
[Nginx / Caddy]   ports 80, 443
    │
    ├── milonexa.com ──────────────→ frontend:3000
    ├── api.milonexa.com ──────────→ api-gateway:8000
    │       └── /ws, /socket.io ──→ messaging-service:8003 (WebSocket)
    └── admin.milonexa.com ────────→ admin-web:3001 (IP restricted)
```

All upstream services listen on the internal Docker/Kubernetes network. The reverse proxy is the only component with public internet access.

---

## 2. Nginx Configuration

### Installation

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y nginx

# RHEL/CentOS
sudo yum install -y nginx

# Start and enable
sudo systemctl enable --now nginx
```

### Full nginx.conf

Save this to `/etc/nginx/nginx.conf`:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct=$upstream_connect_time urt=$upstream_response_time';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Buffer sizes
    client_body_buffer_size    128k;
    client_max_body_size       50m;
    client_header_buffer_size  1k;
    large_client_header_buffers 4 16k;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_min_length 256;
    gzip_types
        application/javascript
        application/json
        application/xml
        application/rss+xml
        application/atom+xml
        application/geo+json
        application/manifest+json
        application/x-font-ttf
        application/x-web-app-manifest+json
        image/svg+xml
        text/css
        text/javascript
        text/plain
        text/xml;

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=20r/m;

    # Include virtual hosts
    include /etc/nginx/sites-enabled/*.conf;
}
```

### Frontend Virtual Host

Save to `/etc/nginx/sites-available/milonexa-frontend.conf`:

```nginx
server {
    listen 80;
    server_name milonexa.com www.milonexa.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name milonexa.com www.milonexa.com;

    # TLS (certificates managed by Certbot)
    ssl_certificate     /etc/letsencrypt/live/milonexa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/milonexa.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' wss://api.milonexa.com https://api.milonexa.com;" always;

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400, immutable";
        expires 1d;
    }

    # React SPA — all routes proxied to frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;

        # HTML5 history API support
        proxy_intercept_errors on;
        error_page 404 = @fallback;
    }

    location @fallback {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

### API Gateway Virtual Host

Save to `/etc/nginx/sites-available/milonexa-api.conf`:

```nginx
server {
    listen 80;
    server_name api.milonexa.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.milonexa.com;

    ssl_certificate     /etc/letsencrypt/live/api.milonexa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.milonexa.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    # Increase body size for file uploads
    client_max_body_size 50m;

    # Auth endpoints — strict rate limit
    location ~ ^/api/(user/auth|user/register|user/password) {
        limit_req zone=auth burst=5 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:8000;
        include /etc/nginx/proxy_params;
    }

    # Upload endpoints — moderate rate limit
    location ~ ^/api/media {
        limit_req zone=upload burst=10 nodelay;
        client_max_body_size 100m;
        proxy_pass http://127.0.0.1:8000;
        include /etc/nginx/proxy_params;
        proxy_read_timeout 120s;
    }

    # WebSocket endpoint for messaging
    location /socket.io/ {
        proxy_pass http://127.0.0.1:8003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # WebSocket endpoint (alternative path)
    location /ws {
        proxy_pass http://127.0.0.1:8003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # All other API routes — general rate limit
    location / {
        limit_req zone=api burst=20 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:8000;
        include /etc/nginx/proxy_params;
    }
}
```

### Admin Frontend Virtual Host (IP-Restricted)

Save to `/etc/nginx/sites-available/milonexa-admin.conf`:

```nginx
server {
    listen 80;
    server_name admin.milonexa.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.milonexa.com;

    ssl_certificate     /etc/letsencrypt/live/admin.milonexa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.milonexa.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;

    # IP allowlist — only allow from VPN/office IPs
    allow 10.0.0.0/8;
    allow 192.168.0.0/16;
    # allow 203.0.113.0/24;   # Add your office/VPN IP range
    deny all;

    location / {
        proxy_pass http://127.0.0.1:3001;
        include /etc/nginx/proxy_params;
    }
}
```

### Shared Proxy Parameters

Save to `/etc/nginx/proxy_params`:

```nginx
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Request-ID $request_id;
proxy_read_timeout 60s;
proxy_connect_timeout 10s;
proxy_buffering on;
proxy_buffer_size 4k;
proxy_buffers 8 4k;
```

### Enable sites and reload

```bash
sudo ln -s /etc/nginx/sites-available/milonexa-frontend.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/milonexa-api.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/milonexa-admin.conf /etc/nginx/sites-enabled/

sudo nginx -t         # Test configuration
sudo systemctl reload nginx
```

---

## 3. WebSocket Proxying

The messaging service uses Socket.io which requires WebSocket upgrade headers. Key configuration:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 86400s;   # Keep WS connections alive for 24h
proxy_send_timeout 86400s;
```

Without `proxy_http_version 1.1` and the `Upgrade`/`Connection` headers, Socket.io will fall back to HTTP long-polling instead of WebSockets.

---

## 4. TLS with Let's Encrypt

### Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtain Certificates

```bash
# Obtain certificates for all domains at once
sudo certbot --nginx \
  -d milonexa.com \
  -d www.milonexa.com \
  -d api.milonexa.com \
  -d admin.milonexa.com \
  --email admin@milonexa.com \
  --agree-tos \
  --non-interactive
```

### Auto-renewal

Certbot installs a systemd timer for auto-renewal. Verify:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

---

## 5. Caddy Alternative

Caddy provides automatic HTTPS with zero configuration overhead.

### Installation

```bash
# Ubuntu/Debian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### Caddyfile

Save to `/etc/caddy/Caddyfile`:

```caddy
# Frontend
milonexa.com, www.milonexa.com {
    encode gzip zstd

    # Static asset caching
    @static path_regexp static \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$
    handle @static {
        header Cache-Control "public, max-age=86400, immutable"
        reverse_proxy localhost:3000
    }

    # SPA fallback
    handle {
        reverse_proxy localhost:3000
    }

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Frame-Options DENY
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
        -Server
    }
}

# API Gateway
api.milonexa.com {
    encode gzip

    # WebSocket upgrade
    @websockets {
        path /socket.io/* /ws*
    }
    handle @websockets {
        reverse_proxy localhost:8003 {
            transport http {
                versions h1
            }
            header_up Connection "Upgrade"
            header_up Upgrade {http.upgrade}
        }
    }

    # API routes
    handle {
        reverse_proxy localhost:8000 {
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
        }
    }

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options nosniff
        -Server
    }
}

# Admin Frontend (IP-restricted)
admin.milonexa.com {
    # Only allow from internal/VPN IPs
    @allowed remote_ip 10.0.0.0/8 192.168.0.0/16
    handle @allowed {
        reverse_proxy localhost:3001
    }
    handle {
        respond "Forbidden" 403
    }
}
```

### Start Caddy

```bash
sudo systemctl enable --now caddy
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

---

## 6. Security Headers

All Milonexa nginx/caddy configurations include these security headers:

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Enforce HTTPS for 1 year |
| `X-Frame-Options` | `DENY` | Prevent clickjacking via iframes |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter (browsers ignoring) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer header leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Restrict browser APIs |
| `Content-Security-Policy` | (see frontend config above) | Restrict resource origins |

---

## 7. Rate Limiting

Nginx rate limiting is configured at the zone level in `nginx.conf`:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;    # 100 req/min general
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;    # 10 req/min auth
limit_req_zone $binary_remote_addr zone=upload:10m rate=20r/m;  # 20 req/min uploads
```

Applied per location:

```nginx
location /api/ {
    limit_req zone=api burst=20 nodelay;
    limit_req_status 429;
    # ...
}
```

---

## 8. Gzip Compression

Gzip is enabled for all text-based content types. This typically reduces response sizes by 60–80%.

Key settings:
- `gzip_comp_level 6` — Balance between CPU and compression ratio
- `gzip_min_length 256` — Don't compress tiny responses
- `gzip_vary on` — Add `Vary: Accept-Encoding` for proxy caches

---

## 9. Static File Caching

JavaScript, CSS, and media files served by the frontend have long cache TTLs since Create React App generates content-hashed filenames:

```nginx
location ~* \.(js|css|woff|woff2|png|jpg|svg|ico)$ {
    add_header Cache-Control "public, max-age=86400, immutable";
    expires 1d;
}
```

The `immutable` directive tells browsers the file will never change at this URL (safe because CRA uses content hashes in filenames like `main.abc123.js`).

---

## 10. API Proxy Configuration

The API gateway listens on port 8000 and handles routing to all backend microservices. Nginx simply forwards all `/api/*` requests:

```nginx
location / {
    proxy_pass http://127.0.0.1:8000;
    # The api-gateway handles all /api/* path routing internally
    # No path stripping needed at nginx level
}
```

The API gateway's own routing strips the `/api` prefix before forwarding to services:

```
nginx → api-gateway:8000 → /api/user/... → user-service:8001/...
                          → /api/content/... → content-service:8002/...
```

---

## 11. Health Check Endpoints

Configure Nginx to periodically health-check upstream services:

```nginx
upstream api_backend {
    server 127.0.0.1:8000;
    keepalive 32;
}
```

Or use an external monitor (UptimeRobot, Better Uptime) to hit:

- `https://milonexa.com` (frontend)
- `https://api.milonexa.com/health` (API gateway)
- `https://api.milonexa.com/health/ready` (readiness check — all services healthy)

The `/health/ready` endpoint returns 200 only when all downstream services are reachable, making it ideal for load balancer health checks.
