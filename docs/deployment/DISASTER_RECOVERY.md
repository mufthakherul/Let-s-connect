# Disaster Recovery Runbook — Let's Connect

**Classification:** Internal Engineering  
**Owner:** Platform Engineering Team  
**Last reviewed:** 2025  
**Review cadence:** Quarterly or after any major incident

---

## Table of Contents

1. [Overview & Objectives](#1-overview--objectives)
2. [Recovery Targets](#2-recovery-targets)
3. [Architecture Summary](#3-architecture-summary)
4. [Backup Schedule](#4-backup-schedule)
5. [Failure Scenarios & Playbooks](#5-failure-scenarios--playbooks)
   - 5.1 [Pod / Service Crash (partial outage)](#51-pod--service-crash-partial-outage)
   - 5.2 [Database Corruption or Accidental Deletion](#52-database-corruption-or-accidental-deletion)
   - 5.3 [Cluster Node Failure](#53-cluster-node-failure)
   - 5.4 [Etcd Corruption / Control Plane Failure](#54-etcd-corruption--control-plane-failure)
   - 5.5 [Full Cluster Loss](#55-full-cluster-loss)
   - 5.6 [Cloud Region / Data Centre Failure](#56-cloud-region--data-centre-failure)
   - 5.7 [Secret / Credential Compromise](#57-secret--credential-compromise)
   - 5.8 [Container Image Registry Outage](#58-container-image-registry-outage)
6. [DR Test Drills](#6-dr-test-drills)
7. [Contacts & Escalation](#7-contacts--escalation)
8. [Runbook Validation Checklist](#8-runbook-validation-checklist)

---

## 1. Overview & Objectives

This runbook documents the procedures required to recover the **Let's Connect** platform from partial or total failures. It covers data recovery, service restoration, and communication steps for all failure scenarios likely to occur in a Kubernetes-based production environment.

**Goals:**

- Minimise downtime and data loss.
- Enable on-call engineers to execute recovery without senior staff present.
- Provide a verifiable procedure that is tested quarterly.

---

## 2. Recovery Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **RTO** (Recovery Time Objective) | **1 hour** | Time from incident declaration to service restoration |
| **RPO** (Recovery Point Objective) | **24 hours** | Maximum data loss; daily backups at 02:00 UTC |
| First responder to acknowledge | **15 minutes** | PagerDuty or Slack oncall ping |
| Status page update | **30 minutes** | After incident is confirmed |

---

## 3. Architecture Summary

```
Internet (users)
      │
      ▼
  NGINX Ingress ──────── TLS termination (Let's Encrypt)
      │
  API Gateway (port 8000)
      │
  ┌───┴──────────────────────────────────────┐
  │   Backend Services (all in namespace: milonexa) │
  │   user-service  content-service  messaging-service │
  │   media-service  shop-service  collaboration-service │
  │   streaming-service  ai-service  security-service │
  └────────────────────────────────────────────┘
      │                 │                 │
  PostgreSQL         Redis (cache)     MinIO (objects)
  (StatefulSet)      (Deployment)      (Deployment)
  50 Gi SSD          10 Gi SSD         100 Gi standard
      │                 │
  Daily dump         RDB snapshot
  → /backups/postgres  → /backups/redis
```

**Key infrastructure files:**

| File | Purpose |
|------|---------|
| `k8s/postgres.yaml` | PostgreSQL StatefulSet + PVC |
| `k8s/redis.yaml` | Redis Deployment + PVC |
| `k8s/minio.yaml` | MinIO Deployment + PVC |
| `k8s/backup-cronjob.yaml` | Nightly backup CronJob |
| `k8s/storage.yaml` | All PVC definitions |
| `k8s/pod-disruption-budgets.yaml` | PDB for all services |
| `k8s/secrets-production.yaml` | Secret templates |
| `scripts/backup-restore.sh` | Backup / restore script |

---

## 4. Backup Schedule

| Datastore | Schedule | Type | Retention | Location |
|-----------|----------|------|-----------|----------|
| PostgreSQL | Daily 02:00 UTC | Full SQL dump (gzip) | 30 days | `/backups/postgres/` |
| Redis | Daily 02:05 UTC | RDB snapshot (gzip) | 30 days | `/backups/redis/` |
| MinIO | Daily 02:10 UTC | Mirror to local disk | 30 days | `/backups/minio/` |
| K8s manifests | On every push | Git (main branch) | Indefinite | GitHub repository |
| Secrets | On every rotation | Encrypted export | 90 days | Secure vault |

**Backup verification:**

The weekly Monday cron job runs `backup-restore.sh verify` against the most recent PostgreSQL dump. Failures page the on-call engineer.

---

## 5. Failure Scenarios & Playbooks

---

### 5.1 Pod / Service Crash (partial outage)

**Symptom:** One or more services return 5xx errors; alerts fire in Grafana.

**Impact:** Degraded functionality; other services continue.

**Steps:**

```bash
# 1. Identify failing pods
kubectl get pods -n milonexa | grep -v Running

# 2. Check logs for the crash reason
kubectl logs -n milonexa <pod-name> --previous --tail=100

# 3. Describe for OOMKill / crash loop indicators
kubectl describe pod -n milonexa <pod-name>

# 4. Force a restart
kubectl rollout restart deployment/<service-name> -n milonexa

# 5. Verify the rollout
kubectl rollout status deployment/<service-name> -n milonexa --timeout=120s

# 6. Check health endpoint
curl -s http://localhost:8000/health | jq .
```

**If crash loop persists:**

```bash
# Roll back to the previous image
kubectl rollout undo deployment/<service-name> -n milonexa
kubectl rollout status deployment/<service-name> -n milonexa
```

**RTO for this scenario:** < 10 minutes.

---

### 5.2 Database Corruption or Accidental Deletion

**Symptom:** Services return 500 with database errors; data is missing or inconsistent.

**Impact:** HIGH — data loss possible. Stop writes immediately.

**Decision gate:** Can you pinpoint the corruption row-by-row? If yes, use targeted SQL fixes. If corruption is extensive, proceed with full restore.

**Steps — Full restore:**

```bash
# 1. Put services in maintenance mode (scale to 0)
kubectl scale deployment api-gateway user-service content-service \
  messaging-service media-service shop-service \
  -n milonexa --replicas=0

# 2. Identify the latest good backup
ls -lht /backups/postgres/ | head -5
# Choose the most recent file BEFORE the incident

# 3. Verify backup integrity
./scripts/backup-restore.sh verify /backups/postgres/postgres-<TIMESTAMP>.sql.gz

# 4. Run the restore (interactive — requires typing CONFIRM)
POSTGRES_PASSWORD="$(kubectl get secret milonexa-secrets -n milonexa \
  -o jsonpath='{.data.DATABASE_PASSWORD}' | base64 -d)" \
  ./scripts/backup-restore.sh restore postgres \
    /backups/postgres/postgres-<TIMESTAMP>.sql.gz

# 5. Validate row counts on key tables
kubectl exec -it statefulset/postgres -n milonexa -- \
  psql -U postgres -c "\l"

# 6. Resume services
kubectl scale deployment api-gateway user-service content-service \
  messaging-service media-service shop-service \
  -n milonexa --replicas=2

# 7. Run health checks
./scripts/verify-health-checks.sh
```

**Expected data loss:** Up to 24 hours (last backup).

**Post-incident:** Evaluate Point-in-Time Recovery (PITR) or replication for a lower RPO.

---

### 5.3 Cluster Node Failure

**Symptom:** Node shows `NotReady`; pod rescheduling may be occurring.

**Impact:** Temporary disruption; Kubernetes self-heals if sufficient capacity exists.

**Steps:**

```bash
# 1. Identify the failed node
kubectl get nodes

# 2. Cordon the node to prevent new scheduling
kubectl cordon <node-name>

# 3. Check if pods have rescheduled successfully
kubectl get pods -n milonexa -o wide | grep -v Running

# 4. If pods are stuck Pending, check resource pressure
kubectl describe node <node-name>
kubectl get events -n milonexa --sort-by=.lastTimestamp | tail -20

# 5. If the node cannot recover, drain it safely
# Note: PodDisruptionBudgets (k8s/pod-disruption-budgets.yaml) prevent full outage
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data --force

# 6. Replace the node via your cloud provider console or CLI
#    (GKE: gcloud container clusters resize / AKS: az aks nodepool scale)

# 7. Verify cluster health after replacement
kubectl get nodes
kubectl get pods -n milonexa
```

**RTO for this scenario:** 15–30 minutes (depends on cloud node provisioning time).

---

### 5.4 Etcd Corruption / Control Plane Failure

**Symptom:** `kubectl` commands fail; API server unreachable; cluster state lost.

**Impact:** CRITICAL — no changes can be made; running workloads may continue.

**Steps (managed Kubernetes — GKE/AKS/EKS):**

```bash
# 1. Check cloud-provider status page first
# GKE: https://status.cloud.google.com
# AKS: https://status.azure.com
# EKS: https://health.aws.amazon.com

# 2. Contact cloud support SLA for control plane recovery
# Managed K8s providers handle etcd; escalate immediately

# 3. While waiting, document currently running services:
kubectl get all -n milonexa -o yaml > milonexa-state-snapshot.yaml 2>/dev/null || true
```

**Steps (self-managed cluster):**

```bash
# 1. Identify etcd member status
etcdctl member list --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# 2. Restore from etcd snapshot (created by cluster backup tooling)
ETCDCTL_API=3 etcdctl snapshot restore /var/backups/etcd/snapshot.db \
  --data-dir /var/lib/etcd-restore

# 3. Reconfigure etcd to use restored data directory
# 4. Restart API server, controller-manager, scheduler
# 5. Validate cluster state
kubectl get nodes
kubectl get pods -n milonexa
```

**RTO:** 1–4 hours (depends on snapshot recency and cluster complexity).

---

### 5.5 Full Cluster Loss

**Symptom:** Entire Kubernetes cluster is gone (terraform destroy, catastrophic failure).

**Impact:** CRITICAL — complete service outage.

**Recovery procedure:**

```bash
# ── Step 1: Provision new cluster ──────────────────────────────────────────
# GKE example:
gcloud container clusters create lets-connect-prod \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n2-standard-4 \
  --disk-size 100GB

# ── Step 2: Configure kubectl context ─────────────────────────────────────
gcloud container clusters get-credentials lets-connect-prod --zone us-central1-a

# ── Step 3: Apply namespace and RBAC first ─────────────────────────────────
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/rbac.yaml

# ── Step 4: Restore secrets (from your secure vault / backup) ──────────────
# Re-populate all secrets in k8s/secrets-production.yaml with real values
kubectl apply -f k8s/secrets-production.yaml

# ── Step 5: Apply storage classes and PVCs ─────────────────────────────────
kubectl apply -f k8s/storage.yaml

# ── Step 6: Restore databases BEFORE starting services ────────────────────
# Mount backup PVC and restore postgres + redis
kubectl apply -f k8s/backup-cronjob.yaml
# Run a one-off restore job, or exec into a postgres pod after applying:
kubectl apply -f k8s/postgres.yaml
# (wait for PostgreSQL pod to be Running)
POSTGRES_PASSWORD="<from-vault>" \
  ./scripts/backup-restore.sh restore postgres /backups/postgres/<LATEST-BACKUP>

# ── Step 7: Deploy all services ────────────────────────────────────────────
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/minio.yaml
kubectl apply -f k8s/elasticsearch.yaml
kubectl apply -f k8s/user-service.yaml
kubectl apply -f k8s/content-service.yaml
kubectl apply -f k8s/messaging-service.yaml
kubectl apply -f k8s/media-service.yaml
kubectl apply -f k8s/shop-service.yaml
kubectl apply -f k8s/collaboration-service.yaml
kubectl apply -f k8s/ai-service.yaml
kubectl apply -f k8s/api-gateway.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress-production.yaml

# ── Step 8: Apply PDBs and monitoring ─────────────────────────────────────
kubectl apply -f k8s/pod-disruption-budgets.yaml
kubectl apply -f k8s/prometheus.yaml
kubectl apply -f k8s/grafana.yaml

# ── Step 9: Verify ────────────────────────────────────────────────────────
kubectl get pods -n milonexa
./scripts/verify-health-checks.sh
./scripts/validate-bluegreen-config.sh --target prod --namespace milonexa
```

**RTO:** 45–90 minutes (excluding database restore time).

**Reduce RTO:** Use GitOps (ArgoCD / Flux) to auto-apply all manifests to a new cluster in ~10 minutes.

---

### 5.6 Cloud Region / Data Centre Failure

**Symptom:** Entire cloud region is unavailable; cluster unreachable.

**Impact:** Complete outage if single-region deployment.

**Short-term (< 24 h):**

1. Post on status page: "We are aware of region-wide issues at our cloud provider."
2. Keep backups safe — they are stored on the PVC and should be mirrored off-cluster.
3. Wait for cloud provider resolution. Most regional outages resolve within 4 hours.

**Medium-term (if outage > 4 h or permanent):**

```bash
# 1. Provision cluster in a different region
gcloud container clusters create lets-connect-dr \
  --zone us-east1-b   # different region from primary (us-central1)

# 2. Restore from cross-region backup (you must have cross-region backup copies)
#    If no cross-region copy exists, RPO = time since last off-cluster backup.

# 3. Follow the Full Cluster Loss procedure (section 5.5) in the DR region.
```

**RTO (failover to DR region):** 2–4 hours.

**To improve:** Implement cross-region backup replication. Store backup copies in a different GCS/S3 bucket in a second region.

---

### 5.7 Secret / Credential Compromise

**Symptom:** Unusual API activity; credential leaked in logs or repository.

**Impact:** HIGH — active compromise possible.

**Immediate actions (< 15 minutes):**

```bash
# 1. Identify which secret was compromised (check git history, logs)
git log --all --full-history -- '**/.env*' '**/*secret*'

# 2. Rotate the credential at the provider (GitHub, database, API key vendor)
#    - JWT_SECRET → regenerate, update in secret store
#    - DATABASE_PASSWORD → ALTER ROLE postgres PASSWORD 'new-password';
#    - MINIO keys → mc admin user secretkey update ...

# 3. Update the K8s secret immediately
kubectl patch secret milonexa-secrets -n milonexa \
  --type=merge \
  -p '{"data":{"JWT_SECRET":"<new-base64-value>"}}'

# 4. Force-restart all pods to pick up new secret
kubectl rollout restart deployment -n milonexa

# 5. Revoke all active user sessions (if JWT was compromised)
kubectl exec -it statefulset/postgres -n milonexa -- \
  psql -U postgres -d users -c "DELETE FROM sessions;"

# 6. Review audit logs for unauthorized access
kubectl logs -n milonexa -l app=api-gateway --since=24h | grep -i "401\|403\|unauthorized"
```

**Post-incident:** Rotate ALL secrets (not just the compromised one) as a precaution. Enable secret rotation reminders quarterly.

---

### 5.8 Container Image Registry Outage

**Symptom:** New pod startups fail with `ImagePullBackOff`; registry unreachable.

**Impact:** Blocks new deployments and pod restarts (running pods are unaffected).

**Steps:**

```bash
# 1. Identify affected pods
kubectl get pods -n milonexa | grep -i "ImagePull\|ErrImagePull"
kubectl describe pod <pod-name> -n milonexa | grep -A5 "Events:"

# 2. If running pods are healthy — no immediate action required.
#    Pod restarts will fail, but existing pods continue serving traffic.

# 3. Check registry status (ghcr.io)
# https://www.githubstatus.com

# 4. If registry is down for >1 hour and you need to restart pods,
#    use an image pull policy of Never with already-cached images:
kubectl set image deployment/user-service \
  user-service=ghcr.io/let-s-connect-org/lets-connect/user-service:cached \
  -n milonexa
# (requires images to already exist on the node)

# 5. When registry recovers, restore the correct image tags
kubectl set image deployment/user-service \
  user-service=ghcr.io/let-s-connect-org/lets-connect/user-service:<latest-sha> \
  -n milonexa
```

**Mitigation:** Configure an image pull policy of `IfNotPresent` for all services so that pods can restart using the cached image. See Deployment manifests.

---

## 6. DR Test Drills

**Frequency:** Quarterly (every 3 months)

### Drill checklist

Run the following drills in a **non-production** cluster:

| Test | Steps | Pass criteria |
|------|-------|---------------|
| **Backup & restore** | Run `backup all`, then `restore postgres <file>` | Data matches pre-backup state |
| **Pod crash recovery** | `kubectl delete pod <api-gateway-pod>` | Pod restarts, health check passes in < 60s |
| **Node drain** | `kubectl drain <node>` | PDBs prevent full outage; all traffic served |
| **Config drift** | Manually update a ConfigMap value, run `config-drift-detect.sh` | Script reports DRIFT |
| **Image tag validation** | Push a `:latest`-tagged image, run `validate-image-tags.sh --all` | Script blocks the tag |
| **Blue-green validation** | Delete a secret, run `validate-bluegreen-config.sh` | Script fails, blocks deployment |
| **Full cluster restore** | Follow section 5.5 in a test cluster | Services healthy within RTO |

### Running the drill

```bash
# Clone the repo to your test cluster context
kubectl config use-context lets-connect-test

# Run the full DR drill script
chmod +x scripts/run-game-day-drill.sh
./scripts/run-game-day-drill.sh

# Record results in docs/
```

---

## 7. Contacts & Escalation

| Role | Responsibility | Contact |
|------|---------------|---------|
| On-call engineer | First responder, execute playbooks | PagerDuty rotation |
| Platform lead | Authorise major actions (cluster rebuild, secret rotation) | Slack `#platform-oncall` |
| Database admin | PostgreSQL restore sign-off | Slack `#db-ops` |
| Cloud provider support | Control plane, infrastructure issues | Cloud console support tickets |
| Communications | User-facing status updates | Slack `#status-updates` |

**Escalation path:**

```
Incident detected
    │
    ▼ (0–15 min)
On-call paged (PagerDuty)
    │
    ▼ (15–30 min)
Incident channel opened in Slack: #incidents-YYYY-MM-DD
    │
    ▼ (30 min+, if not resolved)
Platform lead notified
    │
    ▼ (1 h+, if major)
Cloud provider escalated + status page updated
```

---

## 8. Runbook Validation Checklist

Before signing off on a quarterly review, verify all of the following:

- [ ] Backup CronJob is running successfully (`kubectl get cronjobs -n milonexa`)
- [ ] Latest PostgreSQL backup verifies cleanly (`backup-restore.sh verify <file>`)
- [ ] All PVCs are in state `Bound` (`kubectl get pvc -n milonexa`)
- [ ] Pod Disruption Budgets are applied (`kubectl get pdb -n milonexa`)
- [ ] `config-drift-detect.sh` reports no drift against staging
- [ ] All secrets exist and have no CHANGEME placeholders
- [ ] DR drill was run in test cluster (attach results)
- [ ] RTO/RPO targets reviewed and still achievable
- [ ] Contact list updated with current on-call rotation
- [ ] This document reviewed and dated

---

*This runbook is a living document. Update it after every incident and every quarterly drill.*
