# Architecture

Let-s-connect uses a modular microservices architecture with a React frontend, API gateway, and domain services.

## High-level flow

1. Client apps call API Gateway.
2. Gateway handles auth, routing, policy concerns.
3. Domain services execute business logic.
4. Shared infra provides persistence, cache/pubsub, search, and media storage.

## Primary components

- Frontend (`frontend/`)
- Admin system (`admin/`)
- API Gateway (`services/api-gateway/`)
- Domain services (`services/*-service/`)
- Shared utilities (`services/shared/`)
- Infrastructure (PostgreSQL, Redis, MinIO, Elasticsearch)

## Deep dive

For detailed diagrams and service topology, see:

- `docs/overview/ARCHITECTURE.md`
- `docs/overview/TECH_STACK.md`
- `docs/development/MICROSERVICES.md`
