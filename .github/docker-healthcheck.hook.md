# Docker Healthcheck Hook

## Purpose
Monitors health endpoints for all services defined in `docker-compose.yml`. Automatically restarts any service that fails its health check.

## Workflow
- Periodically query `/health` endpoint for each service
- If a service is unhealthy, trigger `docker compose restart <service>`
- Log restart actions and health status

## Scope
- Applies to all services in `docker-compose.yml`
- Can be extended to monitor additional endpoints or custom health checks

## Example Prompts
- "Monitor all service health endpoints"
- "Auto-restart failed services in Docker"
- "Show healthcheck logs for all services"

---

_Last updated: March 9, 2026_
