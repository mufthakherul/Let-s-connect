# Deployment Runbook

**Owner**: DevOps Team  
**Last Updated**: 2026-03-15  
**Critical**: ⭐⭐⭐

---

## Table of Contents
1. [Quick Reference](#quick-reference)
2. [Deployment Workflow](#deployment-workflow)
3. [Environment Preparation](#environment-preparation)
4. [Blue-Green Deployment](#blue-green-deployment)
5. [Rollback Procedures](#rollback-procedures)
6. [Health Verification](#health-verification)
7. [Troubleshooting](#troubleshooting)
8. [Incident Response](#incident-response)

---

## Quick Reference

### Deployment Commands

```bash
# Staging deployment (automatic on main branch)
git push origin main

# Production deployment (manual, requires tag)
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# View deployment status
kubectl get pods -n milonexa
kubectl logs -f deployment/api-gateway -n milonexa

# Rollback (emergency)
kubectl rollout undo deployment/api-gateway -n milonexa
```

### Key Contacts
- **On-Call Engineer**: [Lookup from oncall-schedule]
- **DevOps Lead**: [Contact info]
- **Security Team**: [Escalation contact]

---

## Deployment Workflow

### Phase 1: Pre-Deployment (30 minutes before)

1. **Verify Staging Health**
   ```bash
   kubectl cluster-info --cluster=staging
   kubectl get nodes -n milonexa
   kubectl get pods -n milonexa -o wide
   ```

2. **Check Dependent Services**
   ```bash
   # Database connectivity
   kubectl exec -it deployment/user-service -n milonexa -- curl -f http://postgres:5432/health
   
   # Cache connectivity
   kubectl exec -it deployment/api-gateway -n milonexa -- redis-cli -h redis ping
   
   # Elasticsearch
   curl -s http://elasticsearch:9200/_cluster/health
   ```

3. **Verify Secrets & Config**
   ```bash
   kubectl get secrets -n milonexa
   kubectl get configmap -n milonexa
   
   # Check for missing secrets
   kubectl describe pod deployment/api-gateway -n milonexa | grep -i "environment"
   ```

4. **Run Smoke Tests**
   ```bash
   # Health endpoint
   curl http://api-gateway.milonexa.svc.cluster.local:8000/health
   
   # Auth flow
   curl -X POST http://api-gateway:8000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

---

### Phase 2: Image Building (CI Pipeline)

**Automatic via GitHub Actions `deploy.yml`:**

1. **Build Images**
   - Runs in parallel for 12 services
   - Uses Docker multi-stage builds (optimized layer caching)
   - Build context: Each service's root directory
   - Image tag: `commit-sha` + semantic versioning

2. **Push to Registry**
   ```
   Registry: ghcr.io
   Image naming: ghcr.io/let-s-connect-org/let-s-connect/{service}:{tag}
   Retention: Latest 10 tags per service
   ```

3. **Security Scanning**
   ```bash
   # Scans for HIGH/CRITICAL vulnerabilities
   # Fails build if critical CVE found
   trivy image --severity HIGH,CRITICAL ghcr.io/.../api-gateway:sha-abc123
   ```

---

### Phase 3: Staging Deployment

**Automatic on main branch merge:**

1. **Update K8s Manifests**
   ```bash
   # Replace placeholders in k8s/*.yaml
   sed -i "s|IMAGE_TAG|<commit-sha>|g" k8s/*.yaml
   sed -i "s|REGISTRY|ghcr.io|g" k8s/*.yaml
   ```

2. **Deploy to Staging**
   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/secrets.yaml
   kubectl apply -f k8s/*.yaml --selector=environment=staging
   ```

3. **Wait for Rollout**
   ```bash
   kubectl rollout status deployment/api-gateway -n milonexa --timeout=5m
   # Repeat for other critical services
   ```

4. **Validation**
   - Run health checks
   - Execute critical-path smoke tests
   - Verify logs have no errors
   - Check performance metrics (p99 latency < 500ms)

---

### Phase 4: Production Deployment (Manual)

**Triggered by git tag (v*.*):**

#### 4.1 Pre-Production Checks

```bash
# 1. Verify staging stability (24+ hours)
kubectl logs -n milonexa --since=24h deployment/api-gateway | grep ERROR | wc -l
# Should be < 5 errors

# 2. Check resource utilization
kubectl top nodes
kubectl top pods -n milonexa

# 3. Verify no active incidents
# (Check incident tracking system)
```

#### 4.2 Environment Protection Rule

**GitHub Actions enforces:**
- Approval from 2+ CODEOWNERS
- All CI checks must pass
- No changes to critical files allowed after approval

```bash
# Manual approval via GitHub UI
# Actions tab → deploy.yml → deploy-production job → Approve
```

#### 4.3 Staged Rollout

**Order matters for high availability:**

1. **Data Layer** (30 seconds)
   ```bash
   kubectl apply -f k8s/postgres.yaml
   kubectl apply -f k8s/redis.yaml
   kubectl rollout status statefulset/postgres -n milonexa --timeout=5m
   ```

2. **API Gateway** (1 minute)
   ```bash
   kubectl apply -f k8s/api-gateway.yaml
   kubectl rollout status deployment/api-gateway -n milonexa --timeout=5m
   ```

3. **Backend Services** (2 minutes)
   ```bash
   kubectl apply -f k8s/user-service.yaml
   kubectl apply -f k8s/content-service.yaml
   kubectl apply -f k8s/messaging-service.yaml
   kubectl apply -f k8s/shop-service.yaml
   # ... etc
   ```

4. **Frontend** (1 minute)
   ```bash
   kubectl apply -f k8s/frontend.yaml
   kubectl rollout status deployment/frontend -n milonexa --timeout=5m
   ```

#### 4.4 Deployment Audit Trail

**Captured automatically:**
```
deployment-audit.log:
- Timestamp (ISO 8601)
- Environment
- Actor (GitHub username)
- Commit SHA & message
- Pre-deployment check results
- Manifest versions applied
```

---

## Environment Preparation

### Pre-Staging Setup

```bash
# 1. Create namespace
kubectl create namespace milonexa

# 2. Configure network policies
kubectl apply -f k8s/network-policies.yaml

# 3. Create persistent volumes
kubectl apply -f k8s/storage.yaml

# 4. Install service mesh (optional)
helm install istio-system istio/base
```

### Secret Management

**Storage**: Kubernetes Secrets (production) or HashiCorp Vault

**Rotation**:
```bash
# Quarterly rotation
1. Generate new secrets
2. Update in vault/GitHub Secrets
3. Restart pods to reload (no downtime)
4. Decommission old secrets after 30 days
```

**Sensitive Values** (never commit):
- Database credentials
- API keys (OpenAI, Datadog, etc.)
- OAuth secrets
- TLS certificates/keys

---

## Blue-Green Deployment

### Overview
Two identical production environments (blue/green) allow zero-downtime deployments.

### Process

1. **Current State**
   ```
   Production Load Balancer → [Blue - v1.0]
                           → [Green - v0.9] (standby)
   ```

2. **Deploy New Version to Green**
   ```bash
   # Deploy to green deployment
   kubectl set image deployment/api-gateway-green \
     api-gateway=ghcr.io/let-s-connect-org/let-s-connect/api-gateway:v1.1 \
     -n milonexa
   
   # Wait for rollout
   kubectl rollout status deployment/api-gateway-green -n milonexa
   ```

3. **Smoke Test Green**
   ```bash
   # Direct traffic to green temporarily
   kubectl patch service api-gateway -n milonexa \
     -p '{"spec":{"selector":{"version":"green"}}}'
   
   # Run smoke tests
   ./scripts/smoke-test.sh https://api-green.staging.milonexa.com
   ```

4. **Switch Traffic**
   ```bash
   # Update load balancer to serve green
   kubectl patch service api-gateway -n milonexa \
     -p '{"spec":{"selector":{"version":"green"}}}'
   
   # Monitor for 5 minutes
   kubectl logs -f deployment/api-gateway-green -n milonexa
   ```

5. **Decommission Blue** (after 24 hours)
   ```bash
   # If no issues, remove blue
   kubectl delete deployment/api-gateway-blue -n milonexa
   ```

---

## Rollback Procedures

### Fast Rollback (< 2 minutes)

```bash
# 1. Immediate rollback
kubectl rollout undo deployment/api-gateway -n milonexa

# 2. Monitor rollback
kubectl rollout status deployment/api-gateway -n milonexa

# 3. Verify health
curl http://api-gateway.milonexa.svc.cluster.local:8000/health

# 4. Check logs for errors
kubectl logs deployment/api-gateway -n milonexa --tail=50
```

### Database Rollback (if schema changed)

```bash
# 1. Stop deployments
kubectl scale deployment/api-gateway -n milonexa --replicas=0

# 2. Restore from backup
pg_restore -d milonexa_prod /backup/milonexa_prod_v1.0.dump

# 3. Restart deployments
kubectl scale deployment/api-gateway -n milonexa --replicas=3

# 4. Run data integrity checks
./scripts/verify-data-integrity.sh
```

### Emergency Halt (if severe issues)

```bash
#!/bin/bash
set -e

echo "⚠️ EMERGENCY HALT - Reverting all deployments"

# 1. Scale down to zero
kubectl scale deployment --all -n milonexa --replicas=0

# 2. Revert to last known good version
kubectl rollout undo deployment/api-gateway -n milonexa
kubectl rollout undo deployment/user-service -n milonexa
# ... repeat for all services

# 3. Verify

kubectl get pods -n milonexa
curl http://api-gateway:8000/health

echo "✓ All services reverted to previous version"
```

---

## Health Verification

### Immediate Post-Deployment Checks

```bash
# 1. Pod Status
kubectl get pods -n milonexa -o wide
# All pods should be Running/Ready

# 2. Service Endpoints
kubectl get endpoints -n milonexa
# Each service should have healthy endpoints

# 3. Health Endpoints
for svc in api-gateway user-service content-service; do
  echo "Checking $svc..."
  kubectl exec -it deployment/$svc -n milonexa -- curl -s localhost:3000/health
done

# 4. Critical-Path Smoke Tests
cd tests/critical-path
./run-critical-path-tests.sh production

# 5. Load Test (5 minutes)
./scripts/load-test.sh --duration=5m --concurrent=50
```

### Continuous Health Monitoring

**Prometheus Alerts** (triggered if conditions met):
- Pod restart rate > 1 per hour
- API latency p99 > 500ms
- Database connection pool > 80% utilized
- Memory usage > 80%
- Error rate > 1% (5xx errors)
- Cache hit rate < 60%

**Grafana Dashboards**:
- `System Health`: Pod status, node resources, network I/O
- `Application Performance`: Request latency, error rates, throughput
- `Database Health`: Connection pool, query latency, lock contention
- `Cache Health`: Hit rate, eviction rate, memory usage

---

## Troubleshooting

### Common Issues

#### Issue 1: Pod CrashLoopBackOff

```bash
# 1. Check logs
kubectl logs deployment/api-gateway -n milonexa

# 2. Describe pod for events
kubectl describe pod <pod-name> -n milonexa

# 3. Check resource limits
kubectl get pods -n milonexa -o custom-columns=NAME:.metadata.name,CPU:.spec.containers[0].resources.limits.cpu,MEM:.spec.containers[0].resources.limits.memory

# 4. Check for missing secrets/config
kubectl get secrets -n milonexa
kubectl get configmap -n milonexa
```

**Solution**:
```bash
# Usually missing environment variable or config
kubectl set env deployment/api-gateway MISSING_VAR=value -n milonexa

# Apply secrets
kubectl apply -f k8s/secrets.yaml

# Restart deployment
kubectl rollout restart deployment/api-gateway -n milonexa
```

#### Issue 2: High Latency After Deployment

```bash
# 1. Check resource utilization
kubectl top pods -n milonexa
kubectl top nodes

# 2. Check for network issues
kubectl exec -it deployment/api-gateway -n milonexa -- \
  ping -c 5 user-service.milonexa.svc.cluster.local

# 3. Check database connections
kubectl exec deployment/api-gateway -n milonexa -- \
  psql -h postgres -U milonexa -c "SELECT count(*) FROM pg_stat_activity;"

# 4. Analyze slow queries
kubectl logs deployment/api-gateway -n milonexa | grep "duration.*ms" | sort -t: -k2 -rn | head -20
```

**Solution**:
```bash
# Scale up replicas
kubectl scale deployment/api-gateway --replicas=5 -n milonexa

# Increase resource requests
kubectl set resources deployment/api-gateway --requests=cpu=500m,memory=512Mi -n milonexa

# Optimize database:
# Add indexes, analyze query plans
```

#### Issue 3: Missing Service After Deployment

```bash
# 1. Check if service exists
kubectl get svc -n milonexa | grep <service-name>

# 2. Check service endpoints
kubectl describe svc <service-name> -n milonexa

# 3. Check DNS resolution in cluster
kubectl run -it --rm debug --image=busybox -- nslookup <service-name>.milonexa.svc.cluster.local
```

**Solution**:
```bash
# Apply missing service manifest
kubectl apply -f k8s/<service>-service.yaml

# Or recreate service
kubectl delete svc <service-name> -n milonexa
kubectl apply -f k8s/<service>-service.yaml
```

---

## Incident Response

### Deployment Failed - Steps to Recovery

```
Time: T+0: Deployment initiated
Time: T+5: Issues detected (alerts fired)
Time: T+10: Decision made to rollback
Time: T+12: Rollback initiated
Time: T+15: Services healthy again
```

### Incident Checklist

- [ ] Page on-call engineer
- [ ] Open incident channel (Slack #incidents)
- [ ] Start war room (video call)
- [ ] Assess impact (user-facing? data loss risk?)
- [ ] Initiate rollback
- [ ] Monitor rollback progress
- [ ] Verify health post-rollback
- [ ] Notify stakeholders
- [ ] Create post-mortem issue
- [ ] Schedule blameless post-mortem (24 hours)

### Post-Deployment War Room (1 hour)

1. **What happened?** (Describe incident timeline)
2. **Why did it happen?** (Root cause analysis)
3. **What did we do?** (Response steps taken)
4. **What did we learn?** (Preventive measures)
5. **Action items** (Prevent recurrence)

**Example Action Items**:
- Add load test before production deployments
- Increase canary deployment duration to 1 hour
- Add database backup validation before deploying schema changes
- Improve alerting threshold for error rate

---

## Appendix

### Environment Variables by Tier

| Variable | Dev | Staging | Prod |
|----------|-----|---------|------|
| LOG_LEVEL | debug | info | warn |
| RATE_LIMIT_ENABLED | false | true | true |
| ADMIN_PANEL_ENABLED | true | true | false |
| SSL_REQUIRED | false | true | true |
| DATABASE_POOL_SIZE | 5 | 10 | 20 |
| JWT_EXPIRY | 72h | 72h | 24h |

### Useful kubectl Aliases

```bash
alias kns='kubectl config set-context --current --namespace='
alias kgp='kubectl get pods -n'
alias kl='kubectl logs -n milonexa -f'
alias kd='kubectl describe pod -n milonexa'
```

### Emergency Contacts

- **On-Call**: +1-XXX-YYY-ZZZZ or [PagerDuty link]
- **Slack**: #incidents, @devops-team
- **Escalation**: Director of Engineering

### Documentation References

- [K8s Deployment Guide](../k8s/README.md)
- [CI/CD Architecture](./CI_CD_ARCHITECTURE.md)
- [Monitoring & Observability](./MONITORING.md)
- [Security Hardening](./SECURITY.md)
