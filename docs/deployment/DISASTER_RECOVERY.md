# Disaster Recovery (DR) Guide

Recovery policy and execution guide for critical platform dependencies.

## Recovery objectives

| Component | Target RTO | Target RPO |
|---|---:|---:|
| API gateway + stateless services | 30–60 min | ≤ 15 min config drift |
| PostgreSQL primary data | 1–4 hours | ≤ 15 min (with WAL/backup cadence) |
| Redis cache/pubsub state | 30–60 min | Best effort (ephemeral where acceptable) |
| Object storage (MinIO) | 2–6 hours | Based on replication/backup policy |

> Adjust RTO/RPO values per environment (dev/staging/prod) and business constraints.

## Backup expectations

- Database backups scheduled and validated regularly.
- Restore tests executed on a routine cadence.
- Object storage bucket backup/replication configured.
- Infrastructure definitions and env configuration versioned.

## DR scenarios

### 1) Accidental data deletion

1. Stop affected write paths.
2. Determine deletion window.
3. Restore to isolated environment first.
4. Validate integrity.
5. Execute controlled cutover.

### 2) Region or cluster unavailability

1. Activate failover environment.
2. Re-point ingress/DNS and validate TLS.
3. Restore essential state from latest valid backups.
4. Run smoke suite for critical user journeys.

### 3) Corrupted deployment/configuration

1. Roll back to last known good release/config.
2. Reconcile secrets and environment settings.
3. Re-run health and dependency checks.

## DR drill cadence

- Tabletop drill: monthly
- Partial technical restore drill: quarterly
- Full failover simulation: bi-annually

## Recovery validation checklist

- [ ] Health endpoints green
- [ ] Auth flows operational
- [ ] Core CRUD paths validated
- [ ] Messaging/notifications functional
- [ ] Monitoring and alerting restored
- [ ] Stakeholder communication complete
