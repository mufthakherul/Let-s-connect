# 🏗️ System Architecture

Milonexa is built as a microservices platform. This document describes the full system architecture, service topology, and data flows.

---

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Service Topology](#service-topology)
- [Request Lifecycle](#request-lifecycle)
- [Data Architecture](#data-architecture)
- [Real-Time Architecture](#real-time-architecture)
- [Admin Ecosystem Architecture](#admin-ecosystem-architecture)
- [Security Architecture](#security-architecture)
- [Infrastructure Diagram](#infrastructure-diagram)

---

## High-Level Architecture

```
                    ┌─────────────────────────────────────────────────┐
                    │               CLIENT LAYER                       │
                    │                                                  │
                    │  ┌─────────────────┐    ┌───────────────────┐  │
                    │  │  React Web App  │    │  Admin Web Panel  │  │
                    │  │   (port 3000)   │    │    (port 3001)    │  │
                    │  │   frontend/     │    │  admin_frontend/  │  │
                    │  └────────┬────────┘    └─────────┬─────────┘  │
                    └───────────┼──────────────────────┼─────────────┘
                                │ HTTP/WebSocket         │
                                │                        │
                    ┌───────────▼────────────────────────▼─────────────┐
                    │              API GATEWAY  (port 8000)             │
                    │                                                   │
                    │  ┌──────────┐ ┌───────────┐ ┌────────────────┐  │
                    │  │JWT Auth  │ │Rate Limit │ │ Circuit Breaker│  │
                    │  └──────────┘ └───────────┘ └────────────────┘  │
                    │  ┌──────────┐ ┌───────────┐ ┌────────────────┐  │
                    │  │ GraphQL  │ │  Swagger  │ │ Route Gov.     │  │
                    │  └──────────┘ └───────────┘ └────────────────┘  │
                    └──────────────────────┬────────────────────────────┘
                                           │ Internal routing
            ┌──────────┬────────────┬──────┴──────┬──────────┬──────────┐
            ▼          ▼            ▼             ▼          ▼          ▼
    ┌──────────────┐ ┌──────────┐ ┌───────────┐ ┌────────┐ ┌────────┐ ┌─────────┐
    │ user-service │ │ content  │ │ messaging │ │collab  │ │ media  │ │  shop   │
    │   (8001)     │ │ (8002)   │ │  (8003)   │ │(8004)  │ │ (8005) │ │ (8006)  │
    │ Auth/Profile │ │Posts/Feed│ │ DMs/Chat  │ │Docs/   │ │Uploads │ │Products │
    │ Social/OAuth │ │Groups/   │ │ Channels/ │ │Wikis/  │ │MinIO   │ │Cart/    │
    │ 2FA/Friends  │ │Communities│ │ Servers/  │ │Tasks/  │ │S3 compat│ │Orders   │
    │ Pages/Notifs │ │Blogs/Vid │ │ WebSocket │ │Meetings│ │        │ │Stripe   │
    └──────────────┘ └──────────┘ └───────────┘ └────────┘ └────────┘ └─────────┘
            │                            │
    ┌───────┴────────┐    ┌──────────────┴─────────┐
    ▼                ▼    ▼                         ▼
┌────────┐    ┌──────────────┐            ┌─────────────────┐
│ai-svc  │    │  streaming   │            │security-service │
│(8007)  │    │  (8009)      │            │    (9102)       │
│Gemini  │    │Radio/TV IPTV │            │Admin Auth Proxy │
│Ollama  │    │Live Streaming│            │                 │
│Moderat.│    │60k+ channels │            │                 │
└────────┘    └──────────────┘            └─────────────────┘
            │
    ┌───────┼────────────┬────────────────┐
    ▼       ▼            ▼                ▼
┌──────┐ ┌──────┐ ┌──────────┐ ┌───────────────┐
│Postgres│ │Redis │ │  MinIO   │ │Elasticsearch  │
│:5432  │ │:6379 │ │:9000     │ │:9200          │
│PG15   │ │Cache │ │Object    │ │Full-text      │
│Main DB│ │Pub/Sub│ │Storage   │ │Search index   │
└───────┘ └──────┘ └──────────┘ └───────────────┘
```

---

## Service Topology

| Service | Port | Primary Responsibility |
|---------|------|----------------------|
| **frontend** | 3000 | React 18 SPA — full user interface, PWA |
| **admin_frontend** | 3001 | React admin web panel (Docker profile: admin) |
| **api-gateway** | 8000 | JWT auth, request routing, rate limiting, GraphQL, Swagger |
| **user-service** | 8001 | Registration, login, OAuth (Google/GitHub/Discord/Apple), profiles, social graph, friends, pages, notifications, 2FA |
| **content-service** | 8002 | Posts, feed, reactions, comments, groups, communities, blogs, videos, hubs, playlists, discovery |
| **messaging-service** | 8003 | Direct messages, group conversations, Discord-style servers, channels, voice/video calls, push notifications, WebSocket (Socket.io) |
| **collaboration-service** | 8004 | Documents (real-time collaborative editing), wikis, tasks/issues, Kanban boards, meetings (WebRTC), governance, knowledge base |
| **media-service** | 8005 | File uploads (images, videos, documents), MinIO/S3 storage, file URL generation |
| **shop-service** | 8006 | Product catalog, shopping cart, orders, reviews, wishlist, Stripe webhooks |
| **ai-service** | 8007 | AI chat (Gemini/Ollama), content moderation, semantic search, content summarization, sentiment analysis, translation, writing assist |
| **streaming-service** | 8009 | Internet radio stations, IPTV TV channels (60k+), live streaming rooms, favorites, playlists, history |
| **security-service** | 9102 | Admin authentication proxy — backs all admin interfaces |
| **PostgreSQL** | 5432 | Primary relational database (all services) |
| **Redis** | 6379 | Cache, session store, pub/sub event bus, rate limiting |
| **MinIO** | 9000 | S3-compatible object storage (media files, backups) |
| **Elasticsearch** | 9200 | Full-text search index (content, users, products) |
| **Ollama** | 11434 | Local LLM inference (llama3.2, phi3, mistral) |

---

## Request Lifecycle

```
Client Request
      │
      ▼
┌────────────────────────────────────────────────────┐
│  API Gateway (port 8000)                           │
│                                                    │
│  1. Helmet security headers applied                │
│  2. CORS validation (allowed origins check)        │
│  3. Request ID assigned (x-request-id header)      │
│  4. Distributed trace context (traceparent header) │
│  5. Request logged (structured JSON logging)        │
│  6. Data mode headers applied                      │
│  7. API version negotiation (default: v2)           │
│  8. Rate limit check (Redis sliding window)        │
│  9. Route governance classification                │
│ 10. JWT auth middleware (if required)              │
│ 11. Circuit breaker check (per downstream service) │
│ 12. Proxy to downstream service                    │
│     - x-user-id header injected                   │
│     - x-internal-gateway-token header injected    │
│     - Retry on 503 (exponential backoff)           │
└────────────────────────────────────────────────────┘
      │
      ▼
Downstream Service (user/content/messaging/etc.)
      │
      ▼
┌────────────────────────────────────────────────────┐
│  Response                                          │
│  { success: true, data: {...}, meta: {...} }        │
│  or                                                │
│  { success: false, error: { code, message } }      │
└────────────────────────────────────────────────────┘
```

---

## Data Architecture

Each microservice has its **own database schema** within the shared PostgreSQL instance:

```
PostgreSQL Server (port 5432)
├── milonexa          ← main application database
│   ├── Users         (user-service)
│   ├── Profiles      (user-service)
│   ├── Friends       (user-service)
│   ├── Pages         (user-service)
│   ├── Notifications (user-service)
│   ├── Posts         (content-service)
│   ├── Comments      (content-service)
│   ├── Groups        (content-service)
│   ├── Communities   (content-service)
│   ├── Blogs         (content-service)
│   ├── Videos        (content-service)
│   ├── Conversations (messaging-service)
│   ├── Messages      (messaging-service)
│   ├── Servers       (messaging-service)
│   ├── Channels      (messaging-service)
│   ├── Documents     (collaboration-service)
│   ├── Wikis         (collaboration-service)
│   ├── Tasks         (collaboration-service)
│   ├── Meetings      (collaboration-service)
│   ├── MediaFiles    (media-service)
│   ├── Products      (shop-service)
│   ├── Orders        (shop-service)
│   ├── RadioStations (streaming-service)
│   └── TvChannels    (streaming-service)
├── admin             ← admin accounts database
└── milonexa_admin    ← admin fallback database
```

Redis usage:
```
Redis (port 6379)
├── Cache namespaces:
│   ├── cache:user_profile:{userId}    TTL: 15min
│   ├── cache:post_feed:{userId}       TTL: 2min
│   ├── cache:products:*               TTL: 5min
│   └── cache:discovery:*              TTL: 10min
├── Pub/Sub channels:
│   ├── events:user.registered
│   ├── events:post.created
│   ├── events:message.sent
│   └── messages (messaging real-time)
├── Rate limit buckets (sliding window)
└── Session tokens (JWT refresh tokens)
```

---

## Real-Time Architecture

```
Client Browser
      │
      │ WebSocket (Socket.io)
      ▼
┌────────────────────────────────────────────────┐
│  messaging-service (port 8003)                 │
│                                                │
│  Socket.io Server                              │
│  ├── Events: new-message, typing, presence     │
│  ├── Rooms: conversation:{id}, server:{id}     │
│  └── Auth: x-user-id header validation         │
│                                                │
│  Redis Pub/Sub bridge                          │
│  ├── Publisher client (new connections)        │
│  └── Subscriber client (message fan-out)       │
└────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Redis (pub/sub)        │
│  Channel: messages      │
│  Event stream key for   │
│  message replay         │
└─────────────────────────┘
```

---

## Admin Ecosystem Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN ECOSYSTEM                           │
│                                                             │
│  ┌──────────────┐  ┌──────────┐  ┌─────────┐  ┌────────┐  │
│  │  Web Panel   │  │   CLI    │  │ SSH TUI │  │  REST  │  │
│  │  :3001       │  │ Terminal │  │  :2222  │  │  :8888 │  │
│  │ admin_front  │  │ node cli │  │  ssh2   │  │  API   │  │
│  └──────┬───────┘  └────┬─────┘  └────┬────┘  └───┬────┘  │
│         │               │              │            │       │
│  ┌──────┐  ┌─────────┐  ┌──────────┐  ┌─────────┐ │       │
│  │  AI  │  │ Slack   │  │ Telegram │  │ Teams   │ │       │
│  │Agent │  │  Bot    │  │   Bot    │  │  Bot    │ │       │
│  └──────┘  └─────────┘  └──────────┘  └─────────┘ │       │
│              │               │              │       │       │
│         ┌────┴───────────────┴──────────────┴───────┘       │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          security-service (port 9102)               │   │
│  │          Admin Authentication Proxy                 │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                   │
│  ┌──────┴──────────────────────────────────────────────┐   │
│  │  Shared Admin Modules                               │   │
│  │  metrics, alerts, sla, compliance, cost-analyzer,   │   │
│  │  tenant-manager, feature-flags, ai-integration,     │   │
│  │  runbook, change-log, webhooks, audit, gdpr          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                AUTHENTICATION FLOW                       │
│                                                         │
│  1. User registers → bcrypt hashed password stored      │
│  2. Login → JWT access token (15min) + refresh (7d)     │
│  3. OAuth → Google/GitHub/Discord/Apple PKCE flow       │
│  4. 2FA → TOTP setup (authenticator app) optional       │
│  5. Email verification → OTP code via email             │
│                                                         │
│  JWT Payload: { userId, email, role, iat, exp }         │
│  Token location: Authorization: Bearer <token>          │
│                                                         │
│  Token refresh: POST /api/user/refresh                  │
│  Auto-refresh: Frontend refreshes 60s before expiry     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  RBAC (Role-Based Access)                │
│                                                         │
│  Roles: user | moderator | admin | super_admin          │
│                                                         │
│  Admin CLI roles:                                       │
│  viewer → operator → admin → break-glass               │
│                                                         │
│  Route classification:                                  │
│  public → authenticated → owner-only → admin-only       │
└─────────────────────────────────────────────────────────┘
```

---

## Infrastructure Diagram

```
Production Deployment
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Internet ──→ Reverse Proxy (Nginx/Caddy)                    │
│               ├── yourdomain.com        → frontend :3000     │
│               ├── api.yourdomain.com    → api-gateway :8000  │
│               └── admin.yourdomain.com  → admin_front :3001  │
│                                                              │
│  Docker Network: milonexa-net (internal bridge)              │
│  ├── api-gateway ←→ user-service, content-service, etc.      │
│  ├── All services ←→ postgres:5432                           │
│  ├── All services ←→ redis:6379                              │
│  └── media-service ←→ minio:9000                             │
│                                                              │
│  Persistent Volumes:                                         │
│  ├── postgres_data  (database files)                         │
│  ├── redis_data     (Redis persistence)                      │
│  ├── minio_data     (object storage)                         │
│  └── elasticsearch_data (search indices)                     │
└──────────────────────────────────────────────────────────────┘
```

[← Back to Overview](./README.md) | [Directory Structure →](./DIRECTORY_STRUCTURE.md)
