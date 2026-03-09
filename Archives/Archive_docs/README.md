# Milonexa

**A unified self-hosted social collaboration platform** — combining the best of Facebook, Slack, YouTube, Telegram, Notion, and Google Drive into a single, privacy-respecting application your team controls.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](docker-compose.yml)

---

## What Is Milonexa?

Milonexa replaces a sprawling stack of SaaS tools with a single, self-hosted platform:

| SaaS Tool | Milonexa Equivalent |
|-----------|-------------------|
| Facebook / X | Social Feed, Groups, Bookmarks |
| Slack / Discord | Real-time Chat, Channels, Voice/Video |
| YouTube | Video platform, Radio, Live TV (60k+ channels) |
| Telegram | Instant messaging, notifications |
| Notion | Documents, Wikis, Project Boards |
| Google Drive | File storage, Media gallery |

---

## Core Features

- **📱 Social Feed** — Posts, threads, reactions, comments, quote posts
- **👥 Groups** — Public, private, and secret groups with admin controls
- **💬 Real-time Chat** — DMs, channels, voice/video calls via WebRTC
- **📺 Streaming** — 60,000+ live TV channels, internet radio, live streaming rooms
- **📄 Collaboration** — Documents, wikis, Kanban boards, folder management
- **🛒 Shop** — E-commerce with cart, orders, and product reviews
- **🔖 Bookmarks** — Save and organize content
- **🤖 AI** — Content moderation, smart suggestions (Gemini API)
- **🔒 Security** — JWT auth, OAuth (Google/GitHub), RBAC, rate limiting
- **🌙 Dark Mode** — Full system-wide dark mode with persistent preference
- **♿ Accessibility** — WCAG-compliant with screen reader support

---

## Quick Start

```bash
# 1. Clone and configure
git clone https://github.com/mufthakherul/Let-s-connect.git
cd Let-s-connect
cp .env.example .env
# Edit .env — set JWT_SECRET, POSTGRES_PASSWORD, etc.

# 2. Start infrastructure
docker compose up postgres redis -d

# 3. Start frontend
cd frontend
npm install --legacy-peer-deps
PORT=3000 REACT_APP_API_URL=http://localhost:8000 npm start
```

For the full guide, see [QUICK_START.md](QUICK_START.md).

---

## Architecture

Milonexa uses a **modular microservices architecture** — 9 independent services behind a single API gateway:

```
Frontend (React :3000)
        │
  API Gateway (:8000)  ← Auth, Rate Limiting, Routing
        │
  ┌─────┼─────────────────────────────────────┐
  │     │           │         │         │     │
User  Content  Messaging  Collab   Media  Shop  Streaming
:8001  :8002    :8003     :8004   :8005  :8006   :8008
  │
AI Service (:8007)  ·  Security Service (:9102)
  │
PostgreSQL · Redis · MinIO
```

See [docs/development/ARCHITECTURE.md](docs/development/ARCHITECTURE.md) for full architecture docs and [docs/development/WORKFLOW.md](docs/development/WORKFLOW.md) for request lifecycle diagrams.

---

## Documentation

| Category | Index | Description |
|----------|-------|-------------|
| 👤 **User Docs** | [docs/user/](docs/user/README.md) | Features, streaming, TV guides |
| 🛡️ **Admin Docs** | [docs/admin/](docs/admin/README.md) | Admin panel, help center setup |
| 🚀 **Deployment** | [docs/deployment/](docs/deployment/README.md) | Docker, Kubernetes, Render, OAuth |
| 🛠️ **Development** | [docs/development/](docs/development/README.md) | API, architecture, changelog |

### Key References

- [QUICK_START.md](QUICK_START.md) — Get running in 5 minutes
- [ROADMAP.md](ROADMAP.md) — Future development plans
- [TESTING.md](TESTING.md) — Testing guide
- [SECURITY_NOTES.md](SECURITY_NOTES.md) — Security practices
- [docs/development/API.md](docs/development/API.md) — Full API reference
- [docs/development/CHANGELOG.md](docs/development/CHANGELOG.md) — Version history

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Material-UI v5, Zustand, React Query |
| Backend | Node.js 18+, Express (microservices) |
| Database | PostgreSQL 15, Sequelize ORM |
| Cache | Redis 7 |
| Storage | MinIO (S3-compatible) |
| Real-time | Socket.IO |
| AI | Google Gemini API |
| Auth | JWT + OAuth 2.0 (Google, GitHub) |
| Infrastructure | Docker Compose, Kubernetes |
| Monitoring | Prometheus, Grafana |

---

## Deployment

### Development
```bash
docker compose up postgres redis -d
cd frontend && npm install --legacy-peer-deps && npm start
```

### Production (Docker Compose)
```bash
docker compose up --build -d
```

### With Admin Panel
```bash
# Admin frontend is opt-in (Docker profile)
docker compose --profile admin up --build -d
```

### Kubernetes
See [k8s/README.md](k8s/README.md) for Kubernetes manifests.

Full deployment guide: [docs/deployment/DEPLOYMENT_GUIDE.md](docs/deployment/DEPLOYMENT_GUIDE.md)

---

## 🗄️ Archives

Deprecated code and superseded documentation are preserved in `Archives/`:

```
Archives/
├── Archive_codes/    # Deprecated/removed source code
└── Archive_docs/     # Historical reports and documentation
```

See [Archives/README.md](Archives/README.md) for the full index.

---

## Contributing

Contributions are welcome. Please read [TESTING.md](TESTING.md) and [SECURITY_NOTES.md](SECURITY_NOTES.md) before submitting a pull request.

## License

MIT License. See [LICENSE](LICENSE) for details.

---

*Milonexa — Own your collaboration.*
