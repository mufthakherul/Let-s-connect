# Development Guide

Documentation for developing Milonexa platform locally.

## Tech Stack
- **Frontend**: React 18, Material-UI v5, Zustand, react-scripts 5 (CRA-based build)
- **Backend**: Node.js 20 (LTS), Express.js
- **Database**: PostgreSQL 15, Redis 7
- **Storage**: MinIO (S3-compatible)
- **Search**: Elasticsearch 8
- **AI**: Google Gemini 2.5 Flash / Ollama (local)
- **Infrastructure**: Docker, Docker Compose, Kubernetes

## Quick Start

1. Prerequisites: Node.js 20+, Docker, Git
2. Clone repo: `git clone https://github.com/mufthakherul/Let-s-connect.git`
3. Start infrastructure: `docker compose up postgres redis minio elasticsearch -d`
4. Initialize DB: `bash scripts/init-databases.sh`
5. Install frontend: `cd frontend && npm install --legacy-peer-deps && npm start`
6. Install services: `cd services/api-gateway && npm install && npm start`

## Documentation

- [Setup Guide](./SETUP.md) — Local development setup
- [API Reference](./API_REFERENCE.md) — All REST and GraphQL endpoints
- [Microservices](./MICROSERVICES.md) — Service architecture
- [Database](./DATABASE.md) — Schema and models
- [Authentication](./AUTHENTICATION.md) — Auth implementation
- [WebSockets](./WEBSOCKETS.md) — Real-time communication
- [Testing](./TESTING.md) — Running tests
- [Testing Playbook](./TESTING_PLAYBOOK.md) — Advanced testing strategy and CI-aligned quality gates
- [Troubleshooting](./TROUBLESHOOTING.md) — Common issues and practical diagnostics
- [API Lifecycle](./API_LIFECYCLE.md) — Versioning, compatibility, and deprecation standards
- [Release Process](./RELEASE_PROCESS.md) — Release planning, rollout, and verification workflow
- [Release Notes Template](./RELEASE_NOTES_TEMPLATE.md) — Standard structure for release communication
- [Changelog Policy](./CHANGELOG_POLICY.md) — How to document and communicate changes
- [Docs Style Guide](./DOCUMENTATION_STYLE_GUIDE.md) — Authoring standards for maintainable docs
- [ADR Index](./adr/README.md) — Architecture decision records and templates
- [Contributing](./CONTRIBUTING.md) — Code standards

## Code Style

- **Linting**: ESLint
- **Formatting**: Prettier
- **Run**: `npm run lint`, `npm run format`

## Testing

```bash
npm test                    # Run unit tests
npm run test:e2e           # Run E2E tests
npm run test -- --coverage # With coverage
```

## Available Commands

- `npm start` - Start service
- `npm run dev` - Dev mode with hot reload
- `npm run build` - Production build
- `npm test` - Run tests
- `npm run lint` - Check code style
- `npm run format` - Auto-format code

---
Last updated: March 12, 2026
