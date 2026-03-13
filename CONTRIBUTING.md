# Contributing to Milonexa (Let's Connect)

Thank you for your interest in contributing! This guide covers everything you need to know.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Project Structure](#project-structure)
5. [Making Changes](#making-changes)
6. [Code Style](#code-style)
7. [Testing Requirements](#testing-requirements)
8. [Pull Request Process](#pull-request-process)
9. [Branch Strategy](#branch-strategy)
10. [Commit Messages](#commit-messages)
11. [Security Issues](#security-issues)

---

## Code of Conduct

All contributors are expected to be respectful, inclusive, and constructive. Harassment, discrimination, or hostile behavior will not be tolerated.

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- Git

### Quick start

```bash
git clone https://github.com/mufthakherul/Let-s-connect.git
cd Let-s-connect

# Start required infrastructure (Postgres + Redis)
docker compose up postgres redis -d

# Frontend
cd frontend && npm install --legacy-peer-deps && npm start

# Backend (example — user-service)
cd services/user-service && npm install && npm start
```

See [docs/deployment/QUICK_START.md](./docs/deployment/QUICK_START.md) and [docs/deployment/README.md](./docs/deployment/README.md) for full setup.

---

## Development Setup

### Environment variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Required values:
- `JWT_SECRET` — at least 32 random characters, never commit it
- `DATABASE_URL` — Postgres connection string
- `REDIS_URL` — Redis connection string
- `GEMINI_API_KEY` — Google Gemini AI key (for AI service)

### Running all services

```bash
docker compose up --build -d          # All services
docker compose --profile admin up -d  # Including admin panel
```

---

## Project Structure

```
Let-s-connect/
├── frontend/          # React 18 user frontend
├── admin/web/         # React admin panel (Docker profile: admin)
├── services/
│   ├── api-gateway/   # Entry point — routes, auth, rate limiting
│   ├── user-service/  # Auth, profiles, follows
│   ├── content-service/ # Feed, posts, search, discovery
│   ├── messaging-service/ # Chat, channels, groups
│   ├── ai-service/    # Gemini-powered AI endpoints
│   ├── media-service/ # Upload, storage, CDN
│   ├── collaboration-service/ # Docs, wikis, projects
│   ├── shop-service/  # Products, cart, orders
│   ├── streaming-service/ # Live streams
│   └── shared/        # Shared utilities (validation, auth, cache)
├── k8s/               # Kubernetes manifests
├── docs/              # Documentation
├── tests/             # Cross-service critical-path tests
└── scripts/           # DevOps automation scripts
```

---

## Making Changes

### Where to make changes

| What you're changing | Where |
|---|---|
| UI components / pages | `frontend/src/components/` |
| Routing | `frontend/src/routing/AppRoutes.jsx` |
| Navigation | `frontend/src/navigation/NavigationDrawer.jsx` |
| API calls (frontend) | `frontend/src/utils/api.js` |
| User auth/profile backend | `services/user-service/` |
| Feed/posts/search backend | `services/content-service/` |
| AI features backend | `services/ai-service/server.js` |
| Gateway routes/auth | `services/api-gateway/server.js` |
| Shared backend utilities | `services/shared/` |

### Archiving old code

Per project convention, **never delete** working code without archiving it:
- Old code → `Archives/Archive_codes/`
- Old docs → `Archives/Archive_docs/`

---

## Code Style

### ESLint + Prettier

The project uses ESLint (with React rules) and Prettier. Before committing:

```bash
# Check lint
cd frontend && npm run lint

# Auto-fix lint issues
cd frontend && npm run lint:fix

# Check formatting
npm run format:check   # from repo root (via prettier)

# Auto-format
cd frontend && npm run format
```

CI will fail if `--max-warnings 50` is exceeded for lint or if formatting is inconsistent.

### Key rules

- **No `console.log`** in production code (use `console.warn`/`console.error`/`console.info`)
- **`prefer-const`** over `let` when reassignment doesn't happen
- **`eqeqeq`** — use `===` instead of `==`
- **No `eval`** or dynamic code execution
- **React hooks** — follow rules-of-hooks strictly

### TypeScript (incremental)

New files in `frontend/src/utils/` and `frontend/src/hooks/` should be `.ts` / `.tsx`.
Type definitions live in `frontend/src/types/index.d.ts`.
Existing `.js` files don't need to be converted immediately — migration is incremental.

---

## Testing Requirements

### Before opening a PR

```bash
# Frontend unit tests
cd frontend && npm test -- --watchAll=false --ci

# Critical-path integration tests (requires services running)
npm run test:critical-path

# E2E tests (requires frontend + backend running)
cd frontend && npm run test:e2e
```

### Writing tests

- **Unit tests**: co-locate with the component or utility (`Component.test.js`)
- **Integration tests**: `tests/critical-path/` following the existing pattern
- **E2E tests**: `frontend/tests/` using Playwright

Coverage thresholds (enforced in CI):
- Global: 40% (target: 80%)
- `user-service`: 60%
- `api-gateway`: 50%

---

## Pull Request Process

1. **Fork** the repo and create a feature branch (see [Branch Strategy](#branch-strategy))
2. Make your changes with tests
3. Run lint + tests locally
4. Open a PR with:
   - A clear description of **what** changed and **why**
   - Screenshots for UI changes
   - Link to any related issue
5. CI must pass (tests, lint, security audit)
6. Request a review — PRs require at least 1 approval

### PR title format

```
feat: add AI translation to post cards
fix: correct feed pagination offset
chore: bump MUI to 7.4
docs: add API endpoint documentation
```

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code, protected |
| `feat/<name>` | New features |
| `fix/<name>` | Bug fixes |
| `chore/<name>` | Maintenance, dependencies |
| `docs/<name>` | Documentation only |
| `hotfix/<name>` | Emergency production fixes |

---

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer — Co-authored-by, Closes #issue]
```

**Types**: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`

**Examples:**
```
feat(feed): add translate button to post cards
fix(auth): handle expired JWT refresh correctly
chore(deps): bump @mui/material to 7.4.0
test(user-service): add profile update integration tests
```

---

## Security Issues

**Do not open a GitHub issue for security vulnerabilities.**

Please email security concerns directly to the maintainers or use GitHub's private vulnerability reporting feature. Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if known)

See [docs/development/SECURITY.md](./docs/development/SECURITY.md) for the full security policy.

---

## Storybook (UI Component Development)

To set up Storybook for isolated component development:

```bash
cd frontend
npx storybook init     # Run once to install
npm run storybook      # Start Storybook dev server
```

Stories live in `frontend/src/stories/`. See existing examples there.

---

## Questions?

Open a [GitHub Discussion](https://github.com/mufthakherul/Let-s-connect/discussions) or check the [docs/](./docs/) directory.
