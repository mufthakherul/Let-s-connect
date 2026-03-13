<div align="center">

# 🌐 Milonexa

### *Connect. Create. Collaborate.*

A full-featured social platform with real-time messaging, collaborative tools, an AI-powered feed, and a built-in marketplace — all in one open platform.


---

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)
![CI](https://img.shields.io/github/actions/workflow/status/milonexa/platform/ci.yml?branch=main&style=flat-square&label=CI)

</div>

---

## ✨ Features

| Category | Feature |
|---|---|
| 👤 **Social** | User profiles, friend connections, pages, follow system |
| 📝 **Content** | Posts, comments, reactions, groups, communities, blogs |
| 💬 **Messaging** | Real-time DMs, group chats, Discord-style servers & channels |
| 🎥 **Media** | Photo/video uploads, MinIO S3 storage, thumbnails |
| 🤝 **Collaboration** | Google Docs-style editors, wikis, tasks, issues, projects |
| 🛍️ **Marketplace** | Product catalog, shopping cart, Stripe payments |
| 🤖 **AI** | Smart feed, content recommendations, toxicity detection (Gemini/Ollama) |
| 📡 **Streaming** | Radio & TV catalog with live stream playback |
| 🔍 **Search** | Full-text Elasticsearch search across all content types |
| 🛡️ **Admin** | Full admin panel, moderation queue, audit trail, CLI |
| 🔒 **Security** | JWT auth, 2FA/TOTP, OAuth (Google/GitHub/Discord/Apple), RBAC |
| 📱 **PWA** | Web push notifications, offline support, installable |
| 🌐 **API** | REST v2, GraphQL, Swagger UI, rate limiting, circuit breakers |

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Internet                          │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  Nginx / Caddy  │  TLS termination
              └────────┬────────┘
                       │
         ┌─────────────┼──────────────┐
         │             │              │
    ┌────▼───┐   ┌─────▼────┐  ┌─────▼─────┐
    │Frontend│   │API Gateway│  │   Admin   │
    │  :3000 │   │   :8000   │  │   :3001   │
    └────────┘   └─────┬─────┘  └───────────┘
                       │ JWT Auth, Rate Limiting,
                       │ Circuit Breakers, GraphQL
         ┌─────────────┼───────────────────────┐
         │             │                       │
    ┌────▼───┐   ┌─────▼───┐           ┌──────▼─────┐
    │  User  │   │Content  │  ...10x   │Collaboration│
    │  :8001 │   │  :8002  │ services  │   :8004    │
    └────┬───┘   └─────┬───┘           └────────────┘
         │             │
    ┌────▼─────────────▼──────────────────────┐
    │           Infrastructure                │
    │  PostgreSQL:5432  Redis:6379            │
    │  MinIO:9000       Elasticsearch:9200    │
    └─────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- [Docker Desktop](https://docker.com/get-docker)
- [Git](https://git-scm.com)

### Run in 3 commands

```bash
# 1. Clone
git clone https://github.com/mufthakherul/Let-s-connect.git && cd Let-s-connect

# 2. Configure
cp .env.example .env
# Edit .env — set JWT_SECRET to a random 64-char string

# 3. Start
docker compose up --build -d
```

The platform will be available at **http://localhost:3000**

### With Admin Panel

```bash
docker compose --profile admin up --build -d
# Admin panel: http://localhost:3001
```

---

## 🌐 Service Ports

| Service | Port | URL |
|---|---|---|
| **Frontend** | 3000 | http://localhost:3000 |
| **Admin Frontend** | 3001 | http://localhost:3001 (profile: admin) |
| **API Gateway** | 8000 | http://localhost:8000 |
| **Swagger UI** | 8000 | http://localhost:8000/api-docs |
| **GraphQL** | 8000 | http://localhost:8000/graphql |
| **User Service** | 8001 | http://localhost:8001/health |
| **Content Service** | 8002 | http://localhost:8002/health |
| **Messaging Service** | 8003 | http://localhost:8003/health |
| **Collaboration Service** | 8004 | http://localhost:8004/health |
| **Media Service** | 8005 | http://localhost:8005/health |
| **Shop Service** | 8006 | http://localhost:8006/health |
| **AI Service** | 8007 | http://localhost:8007/health |
| **Streaming Service** | 8009 | http://localhost:8009/health |
| **Security Service** | 9102 | http://localhost:9102/health |
| **MinIO Console** | 9001 | http://localhost:9001 |
| **PostgreSQL** | 5432 | `postgresql://milonexa:…@localhost:5432/milonexa` |
| **Redis** | 6379 | `redis://localhost:6379` |

---

## 📚 Documentation

### Deployment

| Document | Description |
|---|---|
| [ENVIRONMENT.md](docs/deployment/ENVIRONMENT.md) | Full environment variable reference |
| [DOCKER.md](docs/deployment/DOCKER.md) | Docker Compose deployment guide |
| [KUBERNETES.md](docs/deployment/KUBERNETES.md) | Kubernetes deployment guide |
| [CI_CD.md](docs/deployment/CI_CD.md) | GitHub Actions CI/CD pipeline |
| [PRODUCTION.md](docs/deployment/PRODUCTION.md) | Production hardening checklist |
| [REVERSE_PROXY.md](docs/deployment/REVERSE_PROXY.md) | Nginx/Caddy reverse proxy setup |

### Development

| Document | Description |
|---|---|
| [SETUP.md](docs/development/SETUP.md) | Local development setup guide |
| [MICROSERVICES.md](docs/development/MICROSERVICES.md) | Microservices architecture guide |
| [DATABASE.md](docs/development/DATABASE.md) | Database & Sequelize documentation |
| [AUTHENTICATION.md](docs/development/AUTHENTICATION.md) | Auth, JWT, OAuth, 2FA documentation |
| [WEBSOCKETS.md](docs/development/WEBSOCKETS.md) | Socket.io real-time guide |
| [EVENT_BUS.md](docs/development/EVENT_BUS.md) | Redis pub/sub event bus |
| [CACHING.md](docs/development/CACHING.md) | Caching strategy & Redis usage |
| [GRAPHQL.md](docs/development/GRAPHQL.md) | GraphQL API documentation |
| [SECURITY.md](docs/development/SECURITY.md) | Security best practices |
| [CONTRIBUTING.md](docs/development/CONTRIBUTING.md) | Contribution guide |
| [TESTING_PLAYBOOK.md](docs/development/TESTING_PLAYBOOK.md) | Advanced test strategy and quality gates |
| [TROUBLESHOOTING.md](docs/development/TROUBLESHOOTING.md) | Diagnostic workflows and common fixes |
| [API_LIFECYCLE.md](docs/development/API_LIFECYCLE.md) | API lifecycle, versioning, and deprecation standards |
| [RELEASE_PROCESS.md](docs/development/RELEASE_PROCESS.md) | Release planning and rollout process |
| [adr/README.md](docs/development/adr/README.md) | ADR framework and decision history |

### Operations

| Document | Description |
|---|---|
| [OPERATIONS_RUNBOOK.md](docs/deployment/OPERATIONS_RUNBOOK.md) | Incident response and operational runbooks |
| [DISASTER_RECOVERY.md](docs/deployment/DISASTER_RECOVERY.md) | Backup, restore, and recovery strategy |
| [SERVICE_OWNERSHIP_ONCALL.md](docs/deployment/SERVICE_OWNERSHIP_ONCALL.md) | Service ownership and on-call escalation matrix |

### Wiki

| Document | Description |
|---|---|
| [Wiki Home](https://github.com/mufthakherul/Let-s-connect/wiki) | GitHub Wiki for operational and usage knowledge |
| [Wiki Kit](docs/wiki/README.md) | Ready-to-publish local markdown pages for the wiki |

### Admin

| Document | Description |
|---|---|
| [Admin README](admin/README.md) | Admin panel documentation |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** with Create React App (react-scripts 5)
- **Material-UI v5** component library
- **Zustand** state management
- **React Query** server state & caching
- **React Router v7** routing
- **Socket.io-client** real-time
- **DOMPurify** XSS sanitization

### Backend
- **Node.js 20** runtime
- **Express.js** web framework
- **Sequelize** ORM (PostgreSQL)
- **Socket.io** WebSocket server
- **ioredis** Redis client
- **graphql-http** GraphQL server
- **jsonwebtoken** JWT authentication
- **bcrypt** password hashing
- **Winston** structured logging
- **Helmet.js** security headers

### Infrastructure
- **PostgreSQL 15** — Primary database
- **Redis 7** — Cache, pub/sub, sessions, rate limiting
- **MinIO** — S3-compatible object storage
- **Elasticsearch 8** — Full-text search
- **Docker Compose** — Local orchestration
- **Kubernetes** — Production orchestration
- **Nginx/Caddy** — Reverse proxy & TLS

### AI / Integrations
- **Google Gemini API** — AI completions and recommendations
- **Ollama** (llama3.2) — Local AI model fallback
- **Stripe** — Payment processing
- **OAuth** — Google, GitHub, Discord, Apple

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](docs/development/CONTRIBUTING.md) for:
- Branch naming conventions
- Commit message format (Conventional Commits)
- Code style guidelines
- Testing requirements
- PR review process

### Development Setup

```bash
# Install frontend dependencies
cd frontend && npm install --legacy-peer-deps && npm start

# Start a backend service
cd services/user-service && npm install && npm start

# Run frontend tests
cd frontend && npm test -- --watchAll=false

# Build frontend
DISABLE_ESLINT_PLUGIN=true npx react-scripts build
```

---

## 🔐 Security

For security vulnerabilities, **do not open a public issue**. Email security@milonexa.com.

See [SECURITY.md](docs/development/SECURITY.md) for the full security documentation.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Milonexa** — Built with ❤️ for the open web

[🌐 Website](https://milonexa.com) · [📖 Docs](docs/) · [🐛 Issues](../../issues) · [💬 Discord](#)

</div>
