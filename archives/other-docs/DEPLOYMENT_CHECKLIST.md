# Deployment Checklist

Quick reference checklist for deploying Let's Connect platform.

## Docker Compose (Development)

### Pre-Deployment
- [ ] Docker 20.10+ installed
- [ ] Docker Compose 2.0+ installed
- [ ] At least 8GB RAM available
- [ ] 30GB free disk space

### Setup Steps
- [ ] Clone repository: `git clone https://github.com/mufthakherul/Let-s-connect.git`
- [ ] Navigate to directory: `cd Let-s-connect`
- [ ] Copy environment file: `cp .env.example .env`
- [ ] Edit `.env` with JWT_SECRET (generate with `openssl rand -base64 32`)
- [ ] (Optional) Configure OPENAI_API_KEY for AI features
- [ ] (Optional) Configure OAuth credentials (Google, GitHub)
- [ ] (Optional) Configure Mailgun for email

### Deployment
- [ ] Build and start: `docker compose up -d --build`
- [ ] Wait for services to start (2-3 minutes)
- [ ] Check status: `docker compose ps` (all should be "Up")
- [ ] Initialize MinIO bucket:
  - [ ] Access http://localhost:9001
  - [ ] Login: minioadmin / minioadmin
  - [ ] Create bucket: lets-connect-media
  - [ ] Set policy to public

### Verification
- [ ] Frontend accessible: http://localhost:3000
- [ ] API Gateway health: `curl http://localhost:8000/health`
- [ ] User service health: `curl http://localhost:8001/health`
- [ ] Create test user via frontend registration
- [ ] Test login functionality

### Post-Deployment
- [ ] Set up regular database backups
- [ ] Configure monitoring (if needed)
- [ ] Update DNS (if production)
- [ ] Configure HTTPS (if production)

---

## Kubernetes (Production)

### Pre-Deployment
- [ ] Kubernetes cluster 1.20+ running
- [ ] kubectl configured and connected
- [ ] Container registry account (Docker Hub, ECR, GCR)
- [ ] Domain name ready
- [ ] SSL certificate plan (Let's Encrypt or other)

### Image Preparation
- [ ] Build all Docker images locally
- [ ] Tag images with version: `v1.0.0`
- [ ] Push to container registry
- [ ] Update image references in K8s manifests

### Infrastructure Setup
- [ ] Deploy Ingress controller: NGINX or Traefik
- [ ] Install cert-manager for SSL
- [ ] Install metrics-server for HPA
- [ ] Set up managed database (AWS RDS, Cloud SQL) OR deploy postgres.yaml
- [ ] Set up managed Redis (ElastiCache, Memorystore) OR deploy redis.yaml
- [ ] Set up S3 bucket (AWS S3, GCS) OR deploy minio.yaml
- [ ] Set up Elasticsearch (AWS OpenSearch, Elastic Cloud) OR deploy elasticsearch.yaml

### Secrets Configuration
- [ ] Copy secrets template: `cp k8s/secrets.example.yaml k8s/secrets.yaml`
- [ ] Generate JWT_SECRET: `openssl rand -base64 32`
- [ ] Generate ENCRYPTION_KEY: `openssl rand -base64 32`
- [ ] Add database connection strings
- [ ] Add S3/storage credentials
- [ ] Add OAuth credentials
- [ ] Add Mailgun API keys
- [ ] Add OpenAI API key (optional)
- [ ] Apply secrets: `kubectl apply -f k8s/secrets.yaml`
- [ ] Verify: `kubectl get secrets -n lets-connect`
- [ ] **IMPORTANT**: Delete or secure secrets.yaml file

### Namespace & Configuration
- [ ] Apply namespace: `kubectl apply -f k8s/namespace.yaml`
- [ ] Apply configmap: `kubectl apply -f k8s/configmap.yaml`
- [ ] Verify: `kubectl get ns lets-connect`

### Infrastructure Deployment (if using in-cluster)
- [ ] Deploy PostgreSQL: `kubectl apply -f k8s/postgres.yaml`
- [ ] Deploy Redis: `kubectl apply -f k8s/redis.yaml`
- [ ] Deploy Elasticsearch: `kubectl apply -f k8s/elasticsearch.yaml`
- [ ] Deploy MinIO: `kubectl apply -f k8s/minio.yaml`
- [ ] Wait for pods ready: `kubectl get pods -n lets-connect -w`
- [ ] Initialize databases (check postgres logs)

### Application Deployment
- [ ] Deploy backend services:
  - [ ] `kubectl apply -f k8s/user-service.yaml`
  - [ ] `kubectl apply -f k8s/content-service.yaml`
  - [ ] `kubectl apply -f k8s/messaging-service.yaml`
  - [ ] `kubectl apply -f k8s/collaboration-service.yaml`
  - [ ] `kubectl apply -f k8s/media-service.yaml`
  - [ ] `kubectl apply -f k8s/shop-service.yaml`
  - [ ] `kubectl apply -f k8s/ai-service.yaml`
- [ ] Wait for backend ready: `kubectl wait --for=condition=ready pod -l tier=backend -n lets-connect --timeout=300s`
- [ ] Deploy API Gateway: `kubectl apply -f k8s/api-gateway.yaml`
- [ ] Deploy Frontend: `kubectl apply -f k8s/frontend.yaml`
- [ ] Wait for all pods: `kubectl get pods -n lets-connect`

### Networking
- [ ] Update ingress.yaml with your domain
- [ ] Deploy ingress: `kubectl apply -f k8s/ingress.yaml`
- [ ] Get LoadBalancer IP: `kubectl get svc -n ingress-nginx`
- [ ] Configure DNS A records to LoadBalancer IP
- [ ] Wait for DNS propagation (15-60 minutes)
- [ ] Verify certificate issuance: `kubectl get certificate -n lets-connect`

### Monitoring (Optional but Recommended)
- [ ] Deploy Prometheus: `kubectl apply -f k8s/prometheus.yaml`
- [ ] Deploy Grafana: `kubectl apply -f k8s/grafana.yaml`
- [ ] Port-forward Grafana: `kubectl port-forward svc/grafana 3000:3000 -n lets-connect`
- [ ] Access Grafana: http://localhost:3000 (admin / admin)
- [ ] Import dashboards (ID: 315, 6417, 747)

### Verification
- [ ] All pods running: `kubectl get pods -n lets-connect`
- [ ] All services created: `kubectl get svc -n lets-connect`
- [ ] Ingress has IP: `kubectl get ingress -n lets-connect`
- [ ] Health checks pass:
  - [ ] `kubectl exec -it deployment/user-service -n lets-connect -- curl localhost:8001/health`
  - [ ] `kubectl exec -it deployment/api-gateway -n lets-connect -- curl localhost:8000/health`
- [ ] Frontend accessible via domain: https://yourdomain.com
- [ ] API accessible: https://api.yourdomain.com/health
- [ ] SSL certificate valid
- [ ] Create test user
- [ ] Test core functionality

### Post-Deployment
- [ ] Set up database backup CronJob
- [ ] Configure log aggregation (ELK, Loki)
- [ ] Set up alerting (AlertManager, PagerDuty)
- [ ] Configure horizontal pod autoscaling (already in manifests)
- [ ] Set up cluster autoscaling
- [ ] Document custom configurations
- [ ] Set up CI/CD pipeline
- [ ] Plan disaster recovery procedures
- [ ] Schedule regular security audits

### Production Best Practices
- [ ] Use managed database services (not in-cluster PostgreSQL)
- [ ] Use managed Redis (not in-cluster Redis)
- [ ] Use S3 or cloud storage (not MinIO in production)
- [ ] Enable network policies for pod isolation
- [ ] Set resource limits on all pods
- [ ] Use Pod Disruption Budgets
- [ ] Enable cluster autoscaling
- [ ] Set up multi-region deployment (if needed)
- [ ] Implement proper backup strategy
- [ ] Use external secrets manager (AWS Secrets Manager, Vault)
- [ ] Enable audit logging
- [ ] Set up WAF (Web Application Firewall)
- [ ] Configure rate limiting at ingress level
- [ ] Use private container registry
- [ ] Scan images for vulnerabilities

---

## Rollback Procedures

### Docker Compose
```bash
# Stop services
docker compose down

# Restore from backup
docker compose exec -T postgres psql -U postgres < backup.sql

# Restart with previous version
git checkout <previous-tag>
docker compose up -d --build
```

### Kubernetes
```bash
# View rollout history
kubectl rollout history deployment/<service> -n lets-connect

# Rollback to previous version
kubectl rollout undo deployment/<service> -n lets-connect

# Rollback to specific revision
kubectl rollout undo deployment/<service> --to-revision=<number> -n lets-connect

# Restore database from backup
kubectl exec -i deployment/postgres -n lets-connect -- psql -U postgres < backup.sql
```

---

## Emergency Contacts & Resources

### Documentation
- Comprehensive Guide: `DEPLOYMENT_GUIDE.md`
- K8s README: `k8s/README.md`
- Architecture: `docs/ARCHITECTURE.md`

### Support
- GitHub Issues: https://github.com/mufthakherul/Let-s-connect/issues
- Documentation: See `docs/` directory

### Monitoring
- Prometheus: Port-forward to access metrics
- Grafana: Port-forward to access dashboards
- Logs: `kubectl logs -f deployment/<service> -n lets-connect`

---

**Last Updated**: February 2026
**Version**: 2.5
