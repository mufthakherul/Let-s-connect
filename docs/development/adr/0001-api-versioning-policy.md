# 0001: API Versioning Policy

- **Status:** Accepted
- **Date:** 2026-03-13
- **Deciders:** Platform engineering
- **Technical area:** api

## Context

The platform serves multiple clients and microservices, requiring predictable API evolution without frequent client breakage.

## Decision

Adopt versioned API evolution with **v2 as the production default**, and require explicit process for any breaking API changes.

## Consequences

### Positive

- Predictable compatibility contract for clients
- Clear migration path for breaking changes
- Better confidence in gateway/service integration

### Negative / Trade-offs

- Additional maintenance overhead for deprecation windows
- Documentation and testing obligations increase

## Alternatives considered

1. **No explicit versioning** — rejected due to high regression risk.
2. **Date-based versioning only** — rejected; less intuitive for clients and docs.

## Rollout / Migration

- Keep v2 as baseline.
- Enforce API lifecycle checks in code reviews and docs updates.
- Require migration notes for any planned breaking changes.

## References

- `docs/development/API_LIFECYCLE.md`
- `services/api-gateway/server.js`
- `frontend/src/utils/api.js`
