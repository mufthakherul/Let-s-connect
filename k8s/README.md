# Kubernetes Deployment Configuration
# Phase 4: Scale & Performance (v2.5)

This directory contains Kubernetes deployment manifests for all services.

## Quick Start

### Prerequisites
- Kubernetes cluster (1.20+)
- kubectl configured
- Docker images built and pushed to registry

### Deploy All Services

```bash
# Create namespace
kubectl create namespace lets-connect

# Deploy database and dependencies (if not using external services)
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/minio.yaml

# Wait for dependencies to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n lets-connect --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n lets-connect --timeout=120s
kubectl wait --for=condition=ready pod -l app=minio -n lets-connect --timeout=120s

# Deploy services
kubectl apply -f k8s/user-service.yaml
kubectl apply -f k8s/content-service.yaml
kubectl apply -f k8s/messaging-service.yaml
kubectl apply -f k8s/collaboration-service.yaml
kubectl apply -f k8s/media-service.yaml
kubectl apply -f k8s/shop-service.yaml
kubectl apply -f k8s/ai-service.yaml
kubectl apply -f k8s/api-gateway.yaml

# Deploy frontend
kubectl apply -f k8s/frontend.yaml

# Deploy ingress
kubectl apply -f k8s/ingress.yaml
```

### Check Status

```bash
# Check all pods
kubectl get pods -n lets-connect

# Check services
kubectl get svc -n lets-connect

# Check logs
kubectl logs -f deployment/user-service -n lets-connect

# Check health
kubectl exec deployment/user-service -n lets-connect -- curl localhost:8001/health
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
- `*-service.yaml` - Individual microservice deployments
- `ingress.yaml` - Ingress controller configuration
- `hpa.yaml` - Horizontal Pod Autoscaler configurations

## Environment Variables

Create `secrets.yaml` with:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: lets-connect-secrets
  namespace: lets-connect
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
kubectl scale deployment user-service --replicas=3 -n lets-connect
```

### Auto-scaling (HPA)
```bash
kubectl apply -f k8s/hpa.yaml
kubectl get hpa -n lets-connect
```

## Monitoring

### Health Checks
```bash
# Liveness probe
kubectl exec deployment/user-service -n lets-connect -- curl localhost:8001/health

# Readiness probe
kubectl exec deployment/user-service -n lets-connect -- curl localhost:8001/health/ready

# Prometheus metrics
kubectl exec deployment/user-service -n lets-connect -- curl localhost:8001/metrics
```

### Logs
```bash
# View logs
kubectl logs -f deployment/user-service -n lets-connect

# Follow all pods
kubectl logs -f -l app=user-service -n lets-connect

# View last hour
kubectl logs deployment/user-service -n lets-connect --since=1h
```

## Troubleshooting

### Pod Not Starting
```bash
kubectl describe pod <pod-name> -n lets-connect
kubectl logs <pod-name> -n lets-connect --previous
```

### Service Not Accessible
```bash
kubectl get svc -n lets-connect
kubectl describe svc user-service -n lets-connect
kubectl get endpoints user-service -n lets-connect
```

### Database Connection Issues
```bash
kubectl exec deployment/postgres -n lets-connect -- psql -U postgres -c "SELECT 1"
kubectl exec deployment/user-service -n lets-connect -- nc -zv postgres 5432
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
