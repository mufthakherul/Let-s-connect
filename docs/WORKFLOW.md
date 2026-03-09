# Let's Connect — Platform Workflow & Architecture

This document diagrams the complete request lifecycle, data flows, and system interactions across all layers of the Let's Connect platform.

---

## 1. High-Level System Overview

```
╔═══════════════════════════════════════════════════════════════════════╗
║                      Let's Connect Platform                          ║
║          (Facebook + Slack + YouTube + Telegram + Notion             ║
║                    + Google Drive in one)                            ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  ┌─────────────────┐        ┌──────────────────┐                    ║
║  │  User Frontend  │        │  Admin Frontend  │                    ║
║  │   (React :3000) │        │   (React :3001)  │                    ║
║  └────────┬────────┘        └────────┬─────────┘                    ║
║           │  HTTP/WebSocket          │  HTTP + X-Admin-Secret        ║
║           └──────────────┬───────────┘                              ║
║                          ▼                                           ║
║           ┌──────────────────────────┐                              ║
║           │      API Gateway         │  :8000                       ║
║           │  ┌──────────────────┐    │                              ║
║           │  │ JWT Auth + RBAC  │    │                              ║
║           │  │ Rate Limiting    │    │                              ║
║           │  │ CORS / Helmet    │    │                              ║
║           │  │ Request Routing  │    │                              ║
║           │  │ WebSocket Proxy  │    │                              ║
║           │  └──────────────────┘    │                              ║
║           └──────────────────────────┘                              ║
║          /      |      |       |      \       \        \            ║
║         ▼       ▼      ▼       ▼       ▼       ▼        ▼           ║
║  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌──────┐        ║
║  │User │ │Cont │ │Msg  │ │Collab│ │Media│ │Shop │ │Stream│        ║
║  │:8001│ │:8002│ │:8003│ │:8004│ │:8005│ │:8006│ │:8008 │        ║
║  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬───┘        ║
║     │       │       │       │       │       │       │              ║
║     └───────┴───────┴───────┴───────┴───────┴───────┘              ║
║                              │                                       ║
║            ┌─────────────────┼───────────────┐                      ║
║            ▼                 ▼               ▼                      ║
║      ┌──────────┐    ┌────────────┐  ┌──────────┐                  ║
║      │PostgreSQL│    │   Redis    │  │  MinIO   │                  ║
║      │  :5432   │    │   :6379    │  │  :9000   │                  ║
║      └──────────┘    └────────────┘  └──────────┘                  ║
║                                                                       ║
║   ┌──────────┐   ┌─────────────┐   ┌────────────────┐              ║
║   │AI Service│   │  Security   │   │  Elasticsearch │              ║
║   │  :8007   │   │  Service    │   │  (optional)    │              ║
║   └──────────┘   │  :9102      │   └────────────────┘              ║
║                  └─────────────┘                                     ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## 2. Request Lifecycle

### 2.1 Standard API Request Flow

```
Browser / Mobile Client
      │
      │  1. HTTP Request (e.g. GET /api/content/feed)
      ▼
┌─────────────────────────────────────────┐
│              API Gateway                 │
│                                         │
│  2. Parse Authorization header          │
│     - No token → Public route check     │
│     - Token present → JWT.verify()      │
│                                         │
│  3. Rate Limit Check (Redis)            │
│     - 100 req / 15 min per IP           │
│     - Auth endpoints: stricter limits   │
│                                         │
│  4. CORS validation                     │
│                                         │
│  5. Attach request ID (X-Request-Id)    │
│     Attach user context to headers      │
│                                         │
│  6. Proxy to target service             │
└──────────────┬──────────────────────────┘
               │  Internal HTTP (with x-internal-gateway-token)
               ▼
┌─────────────────────────────────────────┐
│          Target Microservice             │
│                                         │
│  7. Validate internal gateway token     │
│  8. Parse user context from headers     │
│  9. Business logic / DB queries         │
│  10. Cache check (Redis) if applicable  │
│  11. Return standardized response       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   Standardized Response (response-      │
│   wrapper.js)                           │
│   {                                     │
│     success: true,                      │
│     timestamp: "ISO-8601",              │
│     message: "...",                     │
│     data: { ... },                      │
│     meta: { requestId, pagination }     │
│   }                                     │
└─────────────────────────────────────────┘
```

### 2.2 WebSocket / Real-Time Flow

```
Client Browser
      │
      │  1. WS Upgrade Request (with JWT in query or header)
      ▼
┌─────────────────┐
│   API Gateway   │  Validates JWT, proxies WS to messaging-service
└────────┬────────┘
         │  WebSocket tunnel
         ▼
┌─────────────────────────────────────────┐
│          Messaging Service              │
│                                         │
│  Socket.IO server                       │
│  - Rooms: per-chat, per-channel         │
│  - Events: message, typing, read        │
│  - Presence: online/offline tracking    │
│                                         │
│  Redis Pub/Sub for horizontal scaling   │
└─────────────────────────────────────────┘
```

### 2.3 File Upload Flow

```
Client
  │
  │  1. POST /api/media/upload (multipart/form-data)
  ▼
API Gateway → Media Service (:8005)
                    │
                    │  2. Validate file (type, size)
                    │  3. Generate unique filename
                    │  4. Upload to MinIO (S3-compatible)
                    │  5. Store metadata in PostgreSQL
                    │  6. Optionally optimize (resize, compress)
                    │
                    └→ Return { url, filename, size, mimeType }
```

---

## 3. Authentication & Authorization Flow

```
┌─────────────┐       ┌──────────────┐      ┌──────────────┐
│   Browser   │       │  API Gateway │      │ User Service │
└──────┬──────┘       └──────┬───────┘      └──────┬───────┘
       │                     │                     │
       │  POST /api/user/login                     │
       │────────────────────►│                     │
       │                     │  Proxy /login        │
       │                     │────────────────────►│
       │                     │                     │ bcrypt.compare()
       │                     │                     │ Generate JWT
       │                     │◄────────────────────│
       │◄────────────────────│  {token, user}      │
       │                     │                     │
       │  GET /api/content/feed                    │
       │  Authorization: Bearer <JWT>              │
       │────────────────────►│                     │
       │                     │ jwt.verify(token)   │
       │                     │ → {userId, role}    │
       │                     │                     │
       │                     │ x-user-id: userId   │
       │                     │ x-user-role: role   │
       │                     │ → Content Service   │
       │◄────────────────────│  {feed posts}       │
```

### OAuth Flow (Google / GitHub)

```
Browser → GET /api/user/auth/google
       → Redirect to Google OAuth
       → Google Callback → /api/user/auth/google/callback
       → User Service creates/finds user
       → Generate JWT
       → Redirect to frontend with token
```

---

## 4. Service Responsibilities & Data Boundaries

| Service | Port | Primary DB Tables | Redis Keys | Responsibilities |
|---------|------|-------------------|-----------|-----------------|
| **User Service** | 8001 | users, user_preferences, follows, blocked_users | session:*, user:profile:* | Auth, profiles, RBAC, OAuth |
| **Content Service** | 8002 | posts, comments, reactions, feeds, groups, bookmarks | feed:*, post:* | Social feed, posts, groups, bookmarks |
| **Messaging Service** | 8003 | conversations, messages, notifications | chat:*, notif:* | Chat, WebRTC signaling, push notifications |
| **Collaboration Service** | 8004 | documents, wikis, tasks, projects, folders | doc:* | Docs, wikis, project boards, folders |
| **Media Service** | 8005 | media_files | — | File uploads, image optimization, MinIO |
| **Shop Service** | 8006 | products, orders, inventory, cart | cart:*, product:* | E-commerce, payments, inventory |
| **Streaming Service** | 8008 | radio_stations, tv_channels, live_streams | stream:*, tv:* | Radio, TV, live streaming, VOD |
| **AI Service** | 8007 | ai_logs | ai:* | Content moderation, recommendations, NLP |
| **Security Service** | 9102 | admin_logs, audit_events | security:* | Admin backend, audit logging, 2FA |

---

## 5. Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PostgreSQL (Port 5432)                   │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ User Tables │  │Content Tables│  │ Messaging Tables    │ │
│  │ ─────────── │  │ ──────────── │  │ ──────────────────  │ │
│  │ users       │  │ posts        │  │ conversations       │ │
│  │ user_prefs  │  │ comments     │  │ messages            │ │
│  │ follows     │  │ reactions    │  │ notifications       │ │
│  │ profiles    │  │ groups       │  │ call_sessions       │ │
│  └─────────────┘  │ bookmarks    │  └─────────────────────┘ │
│                   └─────────────┘                           │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │Collab Tables │  │ Shop Tables │  │ Streaming Tables  │  │
│  │ ──────────── │  │ ─────────── │  │ ─────────────────  │  │
│  │ documents    │  │ products    │  │ radio_stations    │  │
│  │ wikis        │  │ orders      │  │ tv_channels       │  │
│  │ tasks        │  │ inventory   │  │ live_streams      │  │
│  │ projects     │  │ cart        │  │ stream_history    │  │
│  │ folders      │  └─────────────┘  └───────────────────┘  │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

### Schema Management Policy

- **Development**: `DB_SCHEMA_MODE=sync` — Sequelize auto-syncs schema
- **Production**: `DB_SCHEMA_MODE=migrate` — Uses migrations only (no auto-sync)
- Controlled by `services/shared/db-sync-policy.js`

---

## 6. Caching Strategy

```
Request
   │
   ├─ Check Redis cache (TTL: 5-15 min)
   │        │
   │   Cache HIT ──→ Return cached response (fast path)
   │        │
   │   Cache MISS
   │        │
   ├─ Query PostgreSQL
   │        │
   ├─ Write result to Redis
   │        │
   └─ Return response to client
```

**Cached Resources:**
- User profiles (`user:profile:{userId}`)
- Post feeds (`feed:{userId}:{page}`)
- Product listings (`product:list:{page}`)
- Streaming genres/categories (5-min TTL)
- TV channel/radio station lists (15-min TTL)

**Cache Invalidation:**
- Profile updates → invalidate `user:profile:{userId}`
- New post → invalidate `feed:{userId}:*`
- Product update → invalidate `product:*`

---

## 7. Streaming Service Architecture

> ⚠️ **Protected** — Streaming features are preserved as-is per project policy.

```
┌─────────────────────────────────────────────────────────────┐
│                   Streaming Service (:8008)                  │
│                                                             │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ Radio Module │  │  TV Module    │  │  Live Streaming │  │
│  │ ─────────── │  │ ──────────── │  │ ─────────────── │  │
│  │ Stations API │  │ Channels API  │  │ RTMP ingest     │  │
│  │ Search       │  │ 60k+ channels │  │ HLS output      │  │
│  │ Favorites    │  │ EPG data      │  │ Stream rooms    │  │
│  │ History      │  │ Recommendations│ │ Chat overlay    │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
│                                                             │
│  Performance: Batch loading, N+1 prevention, DB indexes     │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Frontend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 React Frontend (Port 3000)                   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    App.js                            │   │
│  │  React Router v6 — Protected & Public Routes         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │  State (Zustand)│  │  API Layer (axios + interceptors)│   │
│  │ ─────────────── │  │ ─────────────────────────────── │   │
│  │ authStore       │  │ /src/utils/api.js               │   │
│  │ themeStore      │  │ JWT auto-attach                 │   │
│  │ notificationStore│  │ 401 → auto logout               │   │
│  │ appearanceStore │  │ retry logic                     │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Component Library                       │   │
│  │  Material-UI v5 + Custom Theme                       │   │
│  │                                                      │   │
│  │  Pages: Feed, Chat, Groups, Shop, Docs, Videos,      │   │
│  │         Profile, Meetings, Admin, Search, ...        │   │
│  │                                                      │   │
│  │  Common: NavBar, Sidebar, Modals, Toast, ErrorPage   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Real-Time (Socket.IO client)               │   │
│  │  Chat messages, typing indicators, notifications      │   │
│  │  WebRTC signaling for voice/video calls               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Deployment Topology

### Docker Compose (Development / Staging)

```
docker-compose.yml
      │
      ├─ postgres:15    (port 5432)
      ├─ redis:7        (port 6379)
      ├─ minio          (port 9000)
      ├─ api-gateway    (port 8000)
      ├─ user-service   (port 8001)
      ├─ content-service(port 8002)
      ├─ messaging-service(port 8003)
      ├─ collaboration-service(port 8004)
      ├─ media-service  (port 8005)
      ├─ shop-service   (port 8006)
      ├─ streaming-service(port 8008)
      ├─ ai-service     (port 8007)
      ├─ security-service(port 9102)
      └─ frontend       (port 3000)
```

### Kubernetes (Production)

```
k8s/
├── namespace.yaml
├── postgres.yaml       → StatefulSet + PVC
├── redis.yaml          → Deployment + Service
├── api-gateway.yaml    → Deployment + LoadBalancer
├── user-service.yaml   → Deployment + ClusterIP
├── frontend.yaml       → Deployment + Ingress
├── ingress.yaml        → Nginx Ingress Controller
└── ...
```

---

## 10. Security Architecture

```
Internet
    │
    │  HTTPS (TLS termination at load balancer / Nginx)
    ▼
┌──────────────────────────────────────────────┐
│              Reverse Proxy (Nginx/Caddy)      │
│  - TLS termination                           │
│  - Static file serving                       │
│  - Upstream: API Gateway + Frontend          │
└──────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────┐
│                 API Gateway                   │
│  - Helmet.js security headers                │
│  - CORS (allowlist-based)                    │
│  - JWT verification                          │
│  - Rate limiting (Redis-backed)              │
│  - Request ID generation                     │
│  - Input size limits                         │
└──────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────┐
│              Microservices                    │
│  - Internal gateway token validation         │
│  - RBAC (user / moderator / admin)           │
│  - Input validation (Joi)                    │
│  - SQL injection prevention (Sequelize ORM)  │
│  - XSS prevention (sanitization)             │
└──────────────────────────────────────────────┘
```

---

## 11. Shared Module Reference

All shared utilities live in `services/shared/`:

| Module | Purpose |
|--------|---------|
| `logger.js` | Structured logging via Pino (dynamic resolution) |
| `errorHandling.js` | AppError classes + global Express error handler |
| `response-wrapper.js` | Standardized `{success, data, meta}` API responses |
| `caching.js` | Redis-backed cache with TTL helpers |
| `db-sync-policy.js` | Safe Sequelize sync (dev sync / prod migrate) |
| `monitoring.js` | Prometheus metrics + HealthChecker |
| `security-utils.js` | `getRequiredEnv()`, token helpers |
| `startup.js` | Graceful startup/shutdown orchestration |
| `migrations-manager.js` | Database migration runner |

---

## 12. Environment Configuration

Key environment variables (see `.env.example` for full list):

| Variable | Purpose | Default |
|----------|---------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `JWT_SECRET` | JWT signing secret | **required** |
| `INTERNAL_GATEWAY_TOKEN` | Inter-service auth | **required** |
| `DATABASE_URL` | PostgreSQL connection | **required** |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `DB_SCHEMA_MODE` | `sync` or `migrate` | `migrate` (prod), `sync` (dev) |
| `RATE_LIMITING_ENABLED` | Enable rate limiting | `true` |
| `CORS_ORIGINS` | Allowed CORS origins | localhost |

---

*Last updated: March 2026*
