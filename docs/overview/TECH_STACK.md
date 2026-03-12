# 🔧 Technology Stack

Complete reference for all technologies used in Milonexa.

---

## Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18 | UI framework with concurrent features |
| **Material-UI (MUI)** | v5 | Component library & design system |
| **Zustand** | latest | Lightweight global state management |
| **React Query (@tanstack)** | v5 | Server state, caching, pagination |
| **React Router** | v7 | Client-side routing |
| **Framer Motion** | latest | Animations and page transitions |
| **Axios** | latest | HTTP client with interceptors |
| **Socket.io-client** | latest | WebSocket client for real-time features |
| **DOMPurify** | 3.3.2 | XSS sanitization for user content |
| **react-scripts** | 5.0.1 | Build toolchain (CRA-based) |
| **Node.js** | 20+ (LTS) | Required by react-router-dom@7 & dompurify@3.3.2; also used for backend |

## Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 20+ (LTS) | Runtime for all microservices (matches repo-wide Node 20 standard) |
| **Express** | 4.x | HTTP framework for all services |
| **Sequelize** | 6.x | ORM for PostgreSQL |
| **Socket.io** | 4.x | WebSocket server (messaging-service) |
| **JWT (jsonwebtoken)** | latest | Authentication tokens |
| **bcryptjs** | latest | Password hashing |
| **express-http-proxy** | latest | Proxy middleware (api-gateway) |
| **compression** | latest | Gzip response compression |
| **helmet** | latest | Security headers middleware |
| **express-rate-limit** | latest | Rate limiting |
| **rate-limit-redis** | latest | Distributed rate limiting store |
| **ioredis** | latest | Redis client for Node.js |
| **multer** | latest | Multipart file upload |
| **graphql** | 16.x | GraphQL query language |
| **graphql-http** | 1.22.x | GraphQL HTTP handler |
| **swagger-ui-express** | latest | API documentation UI |
| **DiffMatchPatch** | latest | Real-time collaborative document editing |
| **ssh2** | latest | SSH server (admin SSH TUI) |
| **node-cron** | latest | Scheduled jobs |
| **Winston** | 3.x | Structured logging |

## AI & ML

| Technology | Purpose |
|-----------|---------|
| **Google Gemini 2.5 Flash** | Content moderation, AI features |
| **Ollama** | Local LLM inference (llama3.2, phi3, mistral) |
| **llama3.2** | Default local model (3B params) |

## Databases & Storage

| Technology | Version | Purpose |
|-----------|---------|---------|
| **PostgreSQL** | 15 | Primary relational database |
| **Redis** | 7 | Cache, sessions, pub/sub, rate limiting |
| **MinIO** | latest | S3-compatible object storage (media files) |
| **Elasticsearch** | 8.x | Full-text search indexing |

## Infrastructure & DevOps

| Technology | Purpose |
|-----------|---------|
| **Docker** | Container runtime |
| **Docker Compose** | Multi-container orchestration |
| **Kubernetes** | Production container orchestration |
| **Nginx** | Reverse proxy, TLS termination |
| **GitHub Actions** | CI/CD pipeline |
| **Prometheus** | Metrics collection |
| **Grafana** | Metrics visualization |
| **PgBouncer** | PostgreSQL connection pooling (K8s) |

## Testing

| Technology | Purpose |
|-----------|---------|
| **Jest** | Unit & integration tests (frontend + backend) |
| **Playwright** | End-to-end browser tests (admin frontend) |
| **Supertest** | HTTP integration testing |

## Admin Ecosystem

| Technology | Purpose |
|-----------|---------|
| **ssh2** | SSH admin TUI server |
| **OpenTelemetry** | Distributed tracing |
| **WebhookManager** | Webhook notification system |

[← Back to Architecture](./ARCHITECTURE.md)
