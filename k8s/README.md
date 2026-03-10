# Kubernetes Deployment Configuration
# Phase 4: Scale & Performance (v2.5)

This directory contains Kubernetes deployment manifests for all services.

## Quick Start

### Prerequisites
- Kubernetes cluster (1.20+)
- kubectl configured
- Docker images built and pushed to registry

### Deploy Services

**Available manifests**:

**Core Configuration:**
- `namespace.yaml` - Namespace and RBAC configuration
- `configmap.yaml` - Environment variables for all services
- `secrets.example.yaml` - Template for secrets (copy and customize)

**Infrastructure Services:**
- `postgres.yaml` - PostgreSQL database with init scripts
- `redis.yaml` - Redis cache with persistence
- `elasticsearch.yaml` - Elasticsearch for full-text search
- `minio.yaml` - MinIO S3-compatible object storage with auto-setup
- `storage.yaml` - Centralized production PVC definitions and storage classes
- `pod-disruption-budgets.yaml` - High-availability disruption policies

**Application Services:**
- `api-gateway.yaml` - API Gateway (main entry point)
- `user-service.yaml` - User service (auth, profiles, pages)
- `content-service.yaml` - Content service (posts, feeds, videos)
- `messaging-service.yaml` - Messaging service (chat, WebRTC)
- `collaboration-service.yaml` - Collaboration service (docs, wikis)
- `media-service.yaml` - Media service (files, images)
- `shop-service.yaml` - Shop service (e-commerce)
- `ai-service.yaml` - AI service (assistant)
- `frontend.yaml` - React frontend application

**Networking & Monitoring (Phase 4):**
- `ingress.yaml` - Load balancing and routing ✅
- `prometheus.yaml` - Monitoring and metrics collection ✅
- `grafana.yaml` - Metrics visualization and dashboards ✅
- `logging.yaml` - Centralized structured log ingestion (Fluent Bit → Elasticsearch) ✅

**To deploy the platform**:

```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Configure secrets (IMPORTANT!)
cp k8s/secrets.example.yaml k8s/secrets.yaml
# Edit secrets.yaml with your actual values
nano k8s/secrets.yaml
kubectl apply -f k8s/secrets.yaml

# 3. Apply configuration
kubectl apply -f k8s/configmap.yaml

# 4. Deploy infrastructure services
kubectl apply -f k8s/storage.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/elasticsearch.yaml
kubectl apply -f k8s/minio.yaml

# Wait for infrastructure to be ready
kubectl wait --for=condition=ready pod -l tier=database -n milonexa --timeout=300s
kubectl wait --for=condition=ready pod -l tier=cache -n milonexa --timeout=120s
kubectl wait --for=condition=ready pod -l tier=search -n milonexa --timeout=300s
kubectl wait --for=condition=ready pod -l tier=storage -n milonexa --timeout=120s

# 5. Deploy backend microservices
kubectl apply -f k8s/user-service.yaml
kubectl apply -f k8s/content-service.yaml
kubectl apply -f k8s/messaging-service.yaml
kubectl apply -f k8s/collaboration-service.yaml
kubectl apply -f k8s/media-service.yaml
kubectl apply -f k8s/shop-service.yaml
kubectl apply -f k8s/ai-service.yaml

# Wait for services to be ready
kubectl wait --for=condition=ready pod -l tier=backend -n milonexa --timeout=300s

# 6. Deploy API Gateway and Frontend
kubectl apply -f k8s/api-gateway.yaml
kubectl apply -f k8s/frontend.yaml

# Wait for gateway and frontend
kubectl wait --for=condition=ready pod -l tier=gateway -n milonexa --timeout=120s
kubectl wait --for=condition=ready pod -l tier=frontend -n milonexa --timeout=120s

# 7. Deploy Load Balancing (Phase 4)
kubectl apply -f k8s/ingress.yaml

# 8. Deploy Monitoring Stack (Phase 4)
kubectl apply -f k8s/prometheus.yaml
kubectl apply -f k8s/grafana.yaml
kubectl apply -f k8s/logging.yaml
kubectl apply -f k8s/pod-disruption-budgets.yaml

# 9. Verify all components
kubectl get pods -n milonexa
kubectl get svc -n milonexa
kubectl get ingress -n milonexa
```

### Access Monitoring

```bash
# Port-forward Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n milonexa
# Access at: http://localhost:9090

# Port-forward Grafana  
kubectl port-forward svc/grafana 3000:3000 -n milonexa
# Access at: http://localhost:3000
# Default credentials: admin / admin
```

### Check Status

```bash
# Check all pods
kubectl get pods -n milonexa

# Check services
kubectl get svc -n milonexa

# Check logs
kubectl logs -f deployment/user-service -n milonexa

# Check health
kubectl exec deployment/user-service -n milonexa -- curl localhost:8001/health
```

## Architecture

```
┌─────────────┐
│   Ingress   │  (Load Balancer)
└──────┬──────┘
       │
┌──────┴──────┐
│ API Gateway │
└──────┬──────┘
       │
       ├─────────┬──────────┬──────────┬────────────┬─────────────┐
       │         │          │          │            │             │
   ┌───▼───┐ ┌──▼──┐  ┌────▼─────┐ ┌──▼────┐  ┌───▼──┐   ┌──────▼───┐
   │ User  │ │ Cont│  │Messaging │ │ Collab│  │ Media│   │   Shop   │
   │Service│ │ent  │  │ Service  │ │Service│  │Service   │  Service │
   └───┬───┘ └──┬──┘  └────┬─────┘ └──┬────┘  └───┬──┘   └──────┬───┘
       │        │           │           │           │             │
       └────────┴───────────┴───────────┴───────────┴─────────────┘
                                   │
                          ┌────────┴────────┐
                          │                 │
                    ┌─────▼─────┐    ┌─────▼────┐
                    │ PostgreSQL│    │  Redis   │
                    │ (Database)│    │ (Cache)  │
                    └───────────┘    └──────────┘
```

## Manifests

- `namespace.yaml` - Namespace and RBAC
- `configmap.yaml` - Environment configuration
- `secrets.yaml` - Sensitive data (create manually)
- `postgres.yaml` - PostgreSQL StatefulSet
- `redis.yaml` - Redis Deployment
- `minio.yaml` - MinIO Deployment (S3-compatible storage)
- `storage.yaml` - Persistent storage definitions
- `pod-disruption-budgets.yaml` - Disruption safety policies
- `*-service.yaml` - Individual microservice deployments
- `ingress.yaml` - Ingress controller configuration
- `logging.yaml` - Fluent Bit logging pipeline to Elasticsearch
- `hpa.yaml` - Horizontal Pod Autoscaler configurations

## Environment Variables

Create `secrets.yaml` with:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: milonexa-secrets
  namespace: milonexa
type: Opaque
stringData:
  JWT_SECRET: "your-jwt-secret-here"
  DATABASE_PASSWORD: "your-db-password-here"
  S3_ACCESS_KEY: "your-s3-key-here"
  S3_SECRET_KEY: "your-s3-secret-here"
```

## Scaling

### Manual Scaling
```bash
kubectl scale deployment user-service --replicas=3 -n milonexa
```

### Auto-scaling (HPA)
```bash
kubectl apply -f k8s/hpa.yaml
kubectl get hpa -n milonexa
```

## Monitoring

### Health Checks
```bash
# Liveness probe
kubectl exec deployment/user-service -n milonexa -- curl localhost:8001/health

# Readiness probe
kubectl exec deployment/user-service -n milonexa -- curl localhost:8001/health/ready

# Prometheus metrics
kubectl exec deployment/user-service -n milonexa -- curl localhost:8001/metrics
```

### Prometheus & Grafana (Phase 4)
```bash
# Check Prometheus status
kubectl get pods -n milonexa -l app=prometheus
kubectl logs -f deployment/prometheus -n milonexa

# Check Grafana status
kubectl get pods -n milonexa -l app=grafana
kubectl logs -f deployment/grafana -n milonexa

# Access Prometheus UI
kubectl port-forward svc/prometheus 9090:9090 -n milonexa
# Browse to: http://localhost:9090

# Access Grafana dashboards
kubectl port-forward svc/grafana 3000:3000 -n milonexa
# Browse to: http://localhost:3000
# Login with: admin / admin

# Verify metrics collection
curl http://localhost:9090/api/v1/targets  # Check Prometheus targets
```

### Logs
```bash
# View logs
kubectl logs -f deployment/user-service -n milonexa

# Follow all pods
kubectl logs -f -l app=user-service -n milonexa

# View last hour
kubectl logs deployment/user-service -n milonexa --since=1h
```

## Troubleshooting

### Pod Not Starting
```bash
kubectl describe pod <pod-name> -n milonexa
kubectl logs <pod-name> -n milonexa --previous
```

### Service Not Accessible
```bash
kubectl get svc -n milonexa
kubectl describe svc user-service -n milonexa
kubectl get endpoints user-service -n milonexa
```

### Database Connection Issues
```bash
kubectl exec deployment/postgres -n milonexa -- psql -U postgres -c "SELECT 1"
kubectl exec deployment/user-service -n milonexa -- nc -zv postgres 5432
```

## Production Considerations

1. **Use External Databases**: Don't run PostgreSQL in K8s for production
2. **Use Managed Redis**: Consider AWS ElastiCache or similar
3. **Use Managed Storage**: Consider AWS S3 instead of MinIO
4. **Enable TLS**: Configure cert-manager and use HTTPS
5. **Set Resource Limits**: Define CPU/memory limits for all containers
6. **Use Secrets Manager**: Don't store secrets in Git
7. **Enable Network Policies**: Restrict pod-to-pod communication
8. **Set up Monitoring**: Deploy Prometheus and Grafana
9. **Configure Backup**: Regular database backups
10. **Use GitOps**: Consider ArgoCD or Flux for deployments

## Next Steps

1. Build and push Docker images
2. Configure DNS for ingress
3. Set up SSL certificates
4. Deploy monitoring stack (Prometheus/Grafana)
5. Set up logging (ELK or Loki)
6. Configure CI/CD pipeline
