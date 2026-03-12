# Kubernetes Deployment Guide

This guide covers deploying Milonexa to a Kubernetes cluster using the manifests in the `k8s/` directory.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Cluster Requirements](#2-cluster-requirements)
3. [Namespace Setup](#3-namespace-setup)
4. [Secrets & ConfigMaps](#4-secrets--configmaps)
5. [Deployment Order](#5-deployment-order)
6. [Applying Manifests](#6-applying-manifests)
7. [Ingress & TLS](#7-ingress--tls)
8. [Verifying Deployment](#8-verifying-deployment)
9. [Scaling & Autoscaling](#9-scaling--autoscaling)
10. [Rolling Updates & Rollbacks](#10-rolling-updates--rollbacks)
11. [Advanced Features](#11-advanced-features)
12. [Monitoring](#12-monitoring)
13. [Backup CronJob](#13-backup-cronjob)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Prerequisites

### Required Tools

```bash
# kubectl 1.24+
kubectl version --client

# Helm 3.12+ (for managed chart installations)
helm version

# Optional: k9s for interactive cluster management
k9s version
```

Install kubectl:

```bash
# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# macOS
brew install kubectl
```

### Cluster Access

```bash
# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

---

## 2. Cluster Requirements

### Minimum Resources

| Component | CPU | Memory |
|---|---|---|
| Kubernetes master/control plane | 2 CPU | 4 GB |
| Worker nodes (total) | 8 CPU | 16 GB |
| Persistent storage | — | 50 GB |

### Recommended Production Setup

| Component | Count | CPU | Memory |
|---|---|---|---|
| Control plane nodes | 3 | 2 CPU each | 4 GB each |
| Worker nodes (general) | 3 | 4 CPU each | 8 GB each |
| Worker nodes (database) | 2 | 4 CPU each | 16 GB each |

### Supported Platforms

- **AWS EKS** (recommended for production)
- **Google GKE**
- **Azure AKS**
- **Self-hosted k3s / k0s** (development/staging)
- **Minikube / kind** (local development only)

### Storage Classes

Ensure the following storage classes are available:

```bash
kubectl get storageclass
```

The manifests reference the `standard` storage class by default. Update `k8s/` PersistentVolumeClaims to match your cluster's storage class if needed.

---

## 3. Namespace Setup

All Milonexa resources are deployed to the `milonexa` namespace.

```bash
kubectl apply -f k8s/namespace.yaml
```

The namespace manifest:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: milonexa
  labels:
    app.kubernetes.io/name: milonexa
    app.kubernetes.io/managed-by: kubectl
```

Verify:

```bash
kubectl get namespace milonexa
```

---

## 4. Secrets & ConfigMaps

### Creating Secrets from .env file

```bash
# Create secret from .env file
kubectl create secret generic milonexa-secrets \
  --from-env-file=.env \
  -n milonexa

# Or from individual literal values
kubectl create secret generic milonexa-secrets \
  --from-literal=JWT_SECRET="$(openssl rand -hex 32)" \
  --from-literal=ENCRYPTION_KEY="$(openssl rand -hex 16)" \
  --from-literal=INTERNAL_GATEWAY_TOKEN="$(openssl rand -hex 32)" \
  --from-literal=DB_PASSWORD="strong_db_password" \
  -n milonexa
```

### Applying ConfigMap

Non-sensitive configuration is in `k8s/configmap.yaml`:

```bash
kubectl apply -f k8s/configmap.yaml
```

### Verifying Secrets

```bash
kubectl get secret milonexa-secrets -n milonexa
kubectl describe secret milonexa-secrets -n milonexa
```

### Updating a Secret

```bash
kubectl create secret generic milonexa-secrets \
  --from-env-file=.env \
  -n milonexa \
  --dry-run=client -o yaml | kubectl apply -f -
```

---

## 5. Deployment Order

Deploy resources in this order to ensure dependencies are available before dependent services start:

```
Phase 1: Storage & Infrastructure
  └── postgres (PVC → Deployment → Service)
  └── redis (PVC → Deployment → Service)
  └── minio (PVC → Deployment → Service)
  └── elasticsearch (PVC → Deployment → Service)

Phase 2: Application Services
  └── user-service
  └── content-service
  └── messaging-service
  └── collaboration-service
  └── media-service
  └── shop-service
  └── ai-service
  └── streaming-service
  └── security-service

Phase 3: API Gateway
  └── api-gateway (depends on all services above)

Phase 4: Frontend
  └── frontend
  └── admin-frontend (optional)

Phase 5: Ingress
  └── ingress (or ingress-production for TLS)
```

---

## 6. Applying Manifests

### Apply all at once (in dependency order)

```bash
# Infrastructure first
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/minio.yaml
kubectl apply -f k8s/elasticsearch.yaml

# Wait for infrastructure to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n milonexa --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n milonexa --timeout=60s

# Application services
kubectl apply -f k8s/user-service.yaml
kubectl apply -f k8s/content-service.yaml
kubectl apply -f k8s/messaging-service.yaml
kubectl apply -f k8s/collaboration-service.yaml
kubectl apply -f k8s/media-service.yaml
kubectl apply -f k8s/shop-service.yaml
kubectl apply -f k8s/ai-service.yaml
kubectl apply -f k8s/streaming-service.yaml
kubectl apply -f k8s/security-service.yaml

# Gateway
kubectl apply -f k8s/api-gateway.yaml

# Frontend
kubectl apply -f k8s/frontend.yaml

# Ingress (development)
kubectl apply -f k8s/ingress.yaml
# OR Ingress (production with TLS)
kubectl apply -f k8s/ingress-production.yaml
```

### Apply everything at once

```bash
kubectl apply -f k8s/
```

### Apply with dry-run to preview changes

```bash
kubectl apply -f k8s/ --dry-run=client
```

---

## 7. Ingress & TLS

### Development Ingress

`k8s/ingress.yaml` sets up basic routing without TLS:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: milonexa-ingress
  namespace: milonexa
spec:
  rules:
  - host: milonexa.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 3000
  - host: api.milonexa.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 8000
```

### Production Ingress with TLS (cert-manager)

`k8s/ingress-production.yaml` uses cert-manager for automatic Let's Encrypt TLS:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Apply production ingress
kubectl apply -f k8s/ingress-production.yaml
```

The production ingress includes TLS for `milonexa.com`, `api.milonexa.com`, and `admin.milonexa.com`.

### NGINX Ingress Controller

```bash
# Install NGINX ingress controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace
```

---

## 8. Verifying Deployment

### Check all pods

```bash
kubectl get pods -n milonexa
kubectl get pods -n milonexa -o wide   # Show node assignments
```

Expected output (all pods should be `Running`):

```
NAME                                    READY   STATUS    RESTARTS   AGE
api-gateway-xxxxx-xxxxx                 1/1     Running   0          5m
user-service-xxxxx-xxxxx                1/1     Running   0          5m
content-service-xxxxx-xxxxx             1/1     Running   0          5m
messaging-service-xxxxx-xxxxx           1/1     Running   0          5m
...
postgres-xxxxx-xxxxx                    1/1     Running   0          10m
redis-xxxxx-xxxxx                       1/1     Running   0          10m
```

### Check services

```bash
kubectl get services -n milonexa
```

### Check deployments

```bash
kubectl get deployments -n milonexa
```

### Check persistent volume claims

```bash
kubectl get pvc -n milonexa
```

All PVCs should show `Bound`.

### Checking logs

```bash
# Follow logs for api-gateway
kubectl logs -f deployment/api-gateway -n milonexa

# Last 100 lines
kubectl logs --tail=100 deployment/user-service -n milonexa

# Previous container instance (if crashing)
kubectl logs deployment/content-service -n milonexa --previous

# Specific pod
kubectl logs <pod-name> -n milonexa
```

### Exec into a pod

```bash
kubectl exec -it deployment/api-gateway -n milonexa -- sh
```

### Port-forward for debugging

```bash
# Access API gateway locally
kubectl port-forward deployment/api-gateway 8000:8000 -n milonexa

# Access postgres locally
kubectl port-forward deployment/postgres 5432:5432 -n milonexa
```

---

## 9. Scaling & Autoscaling

### Manual scaling

```bash
# Scale content-service to 3 replicas
kubectl scale deployment/content-service --replicas=3 -n milonexa

# Scale down to 1
kubectl scale deployment/content-service --replicas=1 -n milonexa
```

### Horizontal Pod Autoscaler (HPA)

`k8s/` includes HPA manifests for auto-scaling based on CPU/memory:

```bash
kubectl apply -f k8s/hpa.yaml
kubectl get hpa -n milonexa
```

Example HPA for content-service:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: content-service-hpa
  namespace: milonexa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: content-service
  minReplicas: 1
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Pod Disruption Budgets

Ensure rolling updates don't take down all pods simultaneously:

```bash
kubectl apply -f k8s/pod-disruption-budgets.yaml
kubectl get pdb -n milonexa
```

---

## 10. Rolling Updates & Rollbacks

### Rolling update (restart with latest image)

```bash
# Restart a deployment (triggers rolling update)
kubectl rollout restart deployment/content-service -n milonexa

# Update image
kubectl set image deployment/content-service \
  content-service=milonexa/content-service:v2.0.0 \
  -n milonexa
```

### Watch rollout progress

```bash
kubectl rollout status deployment/content-service -n milonexa
```

### Rollback to previous version

```bash
kubectl rollout undo deployment/content-service -n milonexa
```

### Rollback to specific revision

```bash
# List rollout history
kubectl rollout history deployment/content-service -n milonexa

# Rollback to revision 2
kubectl rollout undo deployment/content-service --to-revision=2 -n milonexa
```

---

## 11. Advanced Features

### PgBouncer Connection Pooling

Deploy PgBouncer as a sidecar or standalone deployment for PostgreSQL connection pooling:

```bash
kubectl apply -f k8s/pgbouncer.yaml
```

### Multi-Region Setup

For multi-region deployments with active-passive failover:

```bash
kubectl apply -f k8s/multi-region.yaml
```

This sets up:
- Primary region with read-write PostgreSQL
- Secondary region with read replicas
- Global load balancing via Cloudflare/Route53

### Network Policies

Restrict inter-service traffic to only allowed paths:

```bash
kubectl apply -f k8s/network-policies.yaml
```

### Resource Quotas

Set namespace-level resource limits:

```bash
kubectl apply -f k8s/resource-quotas.yaml
```

---

## 12. Monitoring

### Prometheus & Grafana

```bash
# Install kube-prometheus-stack via Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace

# Apply Milonexa-specific ServiceMonitors
kubectl apply -f k8s/monitoring/servicemonitors.yaml
kubectl apply -f k8s/monitoring/dashboards.yaml
kubectl apply -f k8s/monitoring/alerting-rules.yaml
```

Access Grafana:

```bash
kubectl port-forward svc/kube-prometheus-stack-grafana 3000:80 -n monitoring
# Default credentials: admin / prom-operator
```

### Logging (ELK / Loki)

```bash
# Deploy logging stack
kubectl apply -f k8s/logging.yaml

# Or use Loki + Promtail
helm repo add grafana https://grafana.github.io/helm-charts
helm install loki grafana/loki-stack -n monitoring
```

### AlertManager

Configure alerting rules for:
- Pod crash loops
- High memory/CPU usage
- PostgreSQL connection pool exhaustion
- Redis memory pressure
- Service health endpoint failures

---

## 13. Backup CronJob

`k8s/backup-cronjob.yaml` schedules automated daily PostgreSQL backups to MinIO:

```bash
kubectl apply -f k8s/backup-cronjob.yaml
kubectl get cronjob -n milonexa
```

The CronJob:
- Runs daily at 2:00 AM UTC
- Dumps all databases with `pg_dumpall`
- Uploads compressed dump to MinIO `milonexa-backups` bucket
- Retains last 30 daily backups

### Manual backup trigger

```bash
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%Y%m%d) -n milonexa
kubectl logs job/manual-backup-$(date +%Y%m%d) -n milonexa
```

---

## 14. Troubleshooting

### Pod stuck in Pending

```bash
kubectl describe pod <pod-name> -n milonexa
# Look for: Insufficient CPU/memory, PVC not bound, image pull errors
```

### Pod crash loop

```bash
kubectl logs <pod-name> -n milonexa --previous
kubectl describe pod <pod-name> -n milonexa
```

### Service not reachable

```bash
# Check service endpoints
kubectl get endpoints -n milonexa

# Test from inside cluster
kubectl run tmp-shell --rm -i --tty --image=curlimages/curl -- \
  curl http://api-gateway.milonexa.svc.cluster.local:8000/health
```

### Database connection refused

```bash
# Check postgres is running
kubectl get pods -l app=postgres -n milonexa

# Check postgres service
kubectl get svc postgres -n milonexa

# Test connection from user-service pod
kubectl exec -it deployment/user-service -n milonexa -- \
  nc -zv postgres 5432
```

### ImagePullBackOff

```bash
# Check registry credentials
kubectl get secret regcred -n milonexa

# Create registry secret if missing
kubectl create secret docker-registry regcred \
  --docker-server=<registry> \
  --docker-username=<user> \
  --docker-password=<password> \
  -n milonexa
```
