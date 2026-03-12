# 📚 Milonexa Documentation

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)

Welcome to the **Milonexa** documentation — a comprehensive self-hosted social collaboration platform built with React 18, 10 Node.js microservices, and an enterprise-grade admin ecosystem.

---

## 🚀 Quick Links

| | |
|-|-|
| ⚡ [Quick Start](./deployment/QUICK_START.md) | Get running in under 10 minutes |
| 📖 [API Reference](./development/API_REFERENCE.md) | Complete REST API documentation |
| 🛠️ [Admin Guide](./admin/README.md) | Full admin panel documentation |
| 👤 [User Guide](./user/README.md) | End-user feature documentation |
| 🏗️ [Architecture](./overview/ARCHITECTURE.md) | System architecture & diagrams |
| 🔧 [Dev Setup](./development/SETUP.md) | Developer environment guide |
| 📦 [Environment Vars](./deployment/ENVIRONMENT.md) | Full `.env` reference |
| 🔒 [Security](./development/SECURITY.md) | Security best practices |

---

## 📁 Documentation Structure

```
docs/
├── README.md                    ← You are here (master index)
├── overview/                    Platform overview, architecture & tech stack
│   ├── README.md
│   ├── ARCHITECTURE.md          Full system architecture with ASCII diagrams
│   ├── DIRECTORY_STRUCTURE.md   Annotated repository directory tree
│   └── TECH_STACK.md            Technologies used across the platform
├── user/                        End-user documentation (all features)
│   ├── README.md
│   ├── GETTING_STARTED.md       Onboarding guide for new users
│   ├── AUTH_AND_ACCOUNT.md      Registration, login, OAuth, 2FA, email verification
│   ├── PROFILE_AND_SETTINGS.md  Profile management, privacy, preferences
│   ├── SOCIAL_FEATURES.md       Feed, friends, follow, reactions, reposts
│   ├── MESSAGING.md             DMs, channels, servers, real-time chat
│   ├── GROUPS_AND_COMMUNITIES.md Groups, communities, moderation
│   ├── PAGES.md                 Public pages feature
│   ├── CONTENT_CREATION.md      Posts, blogs, videos, media upload
│   ├── VIDEOS_AND_MEDIA.md      Video platform, media gallery
│   ├── STREAMING.md             Live TV (60k+ channels), internet radio
│   ├── MEETINGS.md              WebRTC video meetings, meeting modes
│   ├── COLLABORATION.md         Documents, wikis, tasks, kanban
│   ├── SHOP.md                  E-commerce, cart, orders, reviews
│   ├── BOOKMARKS.md             Save & organize content
│   ├── SEARCH_AND_DISCOVERY.md  Search, discovery, explore
│   ├── NOTIFICATIONS.md         Notification system & preferences
│   ├── HUBS.md                  All hub pages (creator, developer, etc.)
│   ├── ACCESSIBILITY.md         Accessibility features & WCAG compliance
│   └── PWA.md                   Progressive Web App features
├── admin/                       Administrator documentation
│   ├── README.md
│   ├── OVERVIEW.md              Admin system overview (8 interfaces)
│   ├── WEB_DASHBOARD.md         Admin web panel guide (30+ dashboard panels)
│   ├── CLI_GUIDE.md             Complete CLI command reference
│   ├── SSH_TUI.md               SSH TUI admin dashboard guide
│   ├── REST_API.md              Admin REST API endpoint reference
│   ├── AI_AGENT.md              AI autonomous admin agent guide
│   ├── BOTS.md                  Slack, Telegram, Teams, PagerDuty bots
│   ├── WEBHOOKS.md              Webhook system guide
│   ├── EMAIL_ADMIN.md           Email admin command interface
│   ├── USER_MANAGEMENT.md       Managing users, roles, banning
│   ├── CONTENT_MODERATION.md    Content flagging, AI moderation
│   ├── SECURITY_OPERATIONS.md   Security, GDPR, compliance
│   ├── MONITORING.md            Metrics, alerts, observability
│   └── FEATURE_FLAGS.md         Feature flag management
├── development/                 Developer documentation
│   ├── README.md
│   ├── SETUP.md                 Local development environment setup
│   ├── API_REFERENCE.md         Complete REST API for all 10 services
│   ├── MICROSERVICES.md         Microservices architecture guide
│   ├── DATABASE.md              Database schema, models, migrations
│   ├── AUTHENTICATION.md        JWT, OAuth, 2FA implementation
│   ├── WEBSOCKETS.md            Socket.io real-time implementation
│   ├── EVENT_BUS.md             Redis pub/sub event bus
│   ├── CACHING.md               Redis caching strategies
│   ├── GRAPHQL.md               GraphQL endpoint documentation
│   ├── TESTING.md               Testing guide & running tests
│   ├── CONTRIBUTING.md          How to contribute
│   └── SECURITY.md              Security best practices & OWASP
└── deployment/                  Deployment guides
    ├── README.md
    ├── QUICK_START.md           10-minute deployment guide
    ├── DOCKER.md                Docker Compose full guide
    ├── KUBERNETES.md            Kubernetes deployment guide
    ├── ENVIRONMENT.md           Complete environment variable reference
    ├── CI_CD.md                 CI/CD pipeline guide
    ├── PRODUCTION.md            Production hardening checklist
    └── REVERSE_PROXY.md         Nginx/Caddy reverse proxy setup
```

---

## 🌟 Platform Features at a Glance

| Feature | Description | Status |
|---------|-------------|--------|
| 🤝 **Social Feed** | Posts, threads, reactions (6 types), comments, reposts | ✅ Live |
| 👥 **Groups & Communities** | Public/private/secret spaces with full admin controls | ✅ Live |
| 💬 **Real-time Messaging** | DMs, group channels, servers, typing indicators | ✅ Live |
| 📹 **Video Meetings** | WebRTC with 8+ meeting modes, guest access, recordings | ✅ Live |
| 📡 **Live Streaming** | 60,000+ IPTV TV channels, internet radio stations | ✅ Live |
| 🤝 **Collaboration** | Documents, wikis, kanban tasks, governance workflows | ✅ Live |
| 🛒 **Marketplace** | E-commerce with cart, orders, Stripe payments, reviews | ✅ Live |
| 🤖 **AI Features** | Content moderation, chat assistant, semantic search | ✅ Live |
| 🎯 **Pages** | Public pages with follower system and insights | ✅ Live |
| 🔖 **Bookmarks** | Save and organize any content | ✅ Live |
| 🔍 **Search** | Full-text + semantic search across all content | ✅ Live |
| ⚙️ **Admin Ecosystem** | 8 admin interfaces (web, CLI, SSH, API, AI, bots, webhook, email) | ✅ Live |
| 🌙 **Dark Mode** | Full system-wide dark/light mode with glassmorphism option | ✅ Live |
| ♿ **Accessibility** | WCAG 2.1 AA compliant, screen reader support | ✅ Live |
| 📱 **PWA** | Progressive Web App with offline support | ✅ Live |
| 🔒 **Security** | JWT, OAuth (Google/GitHub/Discord/Apple), 2FA, RBAC | ✅ Live |

---

## 🏗️ Architecture at a Glance

```
     Browser / Mobile PWA
            │
            ▼
    ┌───────────────┐
    │  React SPA    │ :3000  (frontend/)
    │  React Admin  │ :3001  (admin_frontend/) [profile: admin]
    └───────┬───────┘
            │ HTTPS/WSS
            ▼
    ┌───────────────┐
    │  API Gateway  │ :8000  JWT auth, routing, rate limiting, GraphQL
    └───────┬───────┘
            │
   ┌────────┼─────────────────┬──────────────┬──────────┐
   ▼        ▼                 ▼              ▼          ▼
user    content         messaging      collab      media
:8001   :8002            :8003         :8004        :8005
   │        │                 │              │          │
   └────────┴─────────────────┴──────────────┴──────────┘
   ┌──────────────────┬───────────────┬──────────────────┐
   ▼                  ▼               ▼                  ▼
shop              ai-svc         streaming          security
:8006             :8007            :8009             :9102
            │
      ┌─────┼──────┐
      ▼     ▼      ▼
   Postgres Redis MinIO
   :5432  :6379  :9000
```

---

## 📖 Documentation Sections

### 🌐 [Overview](./overview/README.md)
System architecture diagrams, full directory tree, technology stack reference.

### 👤 [User Guide](./user/README.md)
Complete end-user documentation covering every feature of the platform.

### 🛠️ [Admin Guide](./admin/README.md)
All 8 admin interfaces: web dashboard, CLI, SSH TUI, REST API, AI agent, bots, webhooks, email.

### 💻 [Development](./development/README.md)
API reference, local setup, microservices architecture, databases, WebSockets, testing.

### 🚀 [Deployment](./deployment/README.md)
Docker Compose, Kubernetes, environment configuration, CI/CD, production hardening.

---

*Documentation version: 2.0.0 — Last updated: March 12, 2026*
