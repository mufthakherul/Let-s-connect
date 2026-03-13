# Service Ownership & On-Call Matrix

Defines operational ownership and escalation routing for platform services.

> Keep this file current whenever ownership changes.

## Ownership matrix

| Service Area | Primary Owner | Secondary Owner | Escalation Channel | Notes |
|---|---|---|---|---|
| API Gateway | Platform Team | Reliability Team | `#inc-api-gateway` | Auth, routing, policy edge |
| User Service | Identity Team | Platform Team | `#inc-identity` | Auth, profile, OAuth |
| Content Service | Social Team | Platform Team | `#inc-content` | Feed, posts, groups |
| Messaging Service | Realtime Team | Platform Team | `#inc-realtime` | Chat/WebSocket |
| Collaboration Service | Productivity Team | Platform Team | `#inc-collab` | Docs/wiki/tasks |
| Media Service | Media Team | Platform Team | `#inc-media` | Uploads/object storage |
| Shop Service | Commerce Team | Platform Team | `#inc-commerce` | Orders/payments |
| AI Service | AI Team | Platform Team | `#inc-ai` | AI moderation/assist |
| Streaming Service | Streaming Team | Platform Team | `#inc-streaming` | TV/radio/live |
| Security Service | Security Team | Platform Team | `#inc-security` | Admin auth and controls |
| Frontend (user) | Web Team | Platform Team | `#inc-frontend` | React user app |
| Admin Web | Admin Experience Team | Security Team | `#inc-admin` | `admin/web` |

## Severity-based escalation

- **Sev-1:** page primary + secondary immediately, assign incident commander.
- **Sev-2:** page primary, notify secondary within 15 minutes.
- **Sev-3/4:** async owner triage in business hours unless customer-impacting.

## Incident role model

- Incident Commander
- Communications Lead
- Ops/Infra Lead
- Service Owner Lead

See `OPERATIONS_RUNBOOK.md` for execution workflow.

## Readiness checklist (quarterly)

- [ ] On-call contacts reviewed
- [ ] Escalation channels tested
- [ ] Pager routes validated
- [ ] Runbook links verified
- [ ] DR drill participation confirmed
