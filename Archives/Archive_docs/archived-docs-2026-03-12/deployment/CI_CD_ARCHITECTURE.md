# CI/CD Architecture & Pipeline Guide

**Status**: ✅ Production-Ready  
**Last Updated**: 2026-03-15  
**Owner**: DevOps Team

---

## Table of Contents
1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [Workflow Details](#workflow-details)
4. [Configuration Management](#configuration-management)
5. [Security & Compliance](#security--compliance)
6. [Monitoring & Observability](#monitoring--observability)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### Pipeline Philosophy

Our CI/CD pipeline implements **continuous delivery with manual production gates**, enabling rapid iteration while maintaining safety through:

- **Fast feedback loops** (tests run in parallel, ~8 minutes for complete validation)
- **Multiple environment stages** (local → staging → production with progressively stricter controls)
- **Automated guardrails** (quality gates, security scans, deployment rules)
- **Rollback automation** (blue-green deployments with instant failback)

### Key Milestones

| Stage | Automation | Gate | Duration |
|-------|-----------|------|----------|
| **Commit** | Tests, lint, security scan on all branches | None (fail doesn't block push) | 3-5 min |
| **Main Branch** | Full test suite, artifact build, staging deployment | Automatic (all checks pass) | 5-8 min |
| **Production** | Manual approval via GitHub | 2 CODEOWNERS + all CI checks | Tag-driven |

---

## Pipeline Architecture

### Workflow Files

```
.github/workflows/
├── ci.yml                      # Commit/test/quality checks
├── deploy.yml (NEW)            # Build/push/deploy to staging/prod
└── (future) monitoring.yml     # Post-deployment alerts
```

### Tool Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| **Container Registry** | GitHub Container Registry (ghcr.io) | Store built Docker images |
| **Orchestration** | Kubernetes | Run services in production |
| **Infrastructure** | Terraform / Bicep | Define infrastructure as code |
| **Secrets** | GitHub Secrets + Vault | Manage sensitive credentials |
| **Artifacts** | GitHub Actions | Store test results, logs (7-day retention) |

---

## Workflow Details

### CI Workflow (`ci.yml`)

**Triggers**: Push to any branch, PR, schedule (6am daily)

**Jobs** (run in parallel for speed):

#### 1. Frontend Tests
```bash
cd frontend && npm install --legacy-peer-deps && npm test
cd frontend && npm run test:e2e
```
- **Duration**: 3-4 minutes
- **Artifacts**: Coverage reports, test results
- **Requirements**: Node 18+, Chrome for Playwright

#### 2. Backend Tests (Per Service)
```bash
cd services/{service} && npm install && npm test
```
- **Services**: user-service, content-service, messaging-service, etc.
- **Duration**: 2-3 minutes per service (parallel)
- **Artifacts**: JUnit XML reports, coverage data

#### 3. Code Quality
```bash
npm run lint
# Checks: ESLint, TypeScript strict mode, format validation
```
- **Duration**: 1 minute
- **Fails if**: ESLint errors (warnings are allowed)

#### 4. Security Audit
```bash
npm audit --production
docker scout cves ghcr.io/let-s-connect-org/let-s-connect/api-gateway:latest
```
- **Duration**: 2 minutes
- **Fails if**: High/Critical vulnerabilities found

#### 5. Critical Path Tests
```bash
./scripts/run-critical-path-tests.sh
```
- **Duration**: 2-3 minutes
- **Gracefully skips** if services are unreachable
- **Validates**: Auth, feed, messaging, media, shop, admin flows
- **Coverage thresholds**: Global 40%, service-specific 60%/50%

#### 6. Quality Gates
```
Requires all above jobs to pass before proceeding
```

---

### Deploy Workflow (`deploy.yml`) - **NEW**

**Triggers**: 
- Push to main branch (→ staging auto)
- Git tags v* (→ staging auto + production manual)
- Manual dispatch workflow

#### Job 1: Build & Push Images

**Matrix**: Builds 12 services in parallel
- user-service
- content-service  
- messaging-service
- collaboration-service
- media-service
- shop-service
- ai-service
- streaming-service
- security-service
- api-gateway
- frontend
- admin_frontend

**Steps**:
```bash
1. Checkout code
2. Setup Docker Buildx (with layer caching)
3. Authenticate to ghcr.io (GitHub Container Registry)
4. Extract metadata (version, tags, labels)
5. Build & push image
   - Image: ghcr.io/let-s-connect-org/let-s-connect/{service}:{tag}
   - Tags: branch, semver, commit-sha, latest (on main)
6. Build args: BUILD_DATE, VCS_REF, VERSION
```

**Duration**: 5-10 minutes (parallel, cached layers)

**Output**: 12 container images tagged and pushed to registry

#### Job 2: Verify Images

**Security scanning**:
```bash
trivy image --severity HIGH,CRITICAL ghcr.io/.../service:sha
```
- Fails if critical CVEs found
- Logs vulnerability details

#### Job 3: Deploy to Staging

**Automatic on main/tag push**

**Steps**:
1. Checkout code
2. Configure kubectl for staging cluster
3. Update K8s manifests (replace IMAGE_TAG placeholders)
4. Apply manifests:
   - namespace.yaml
   - configmap.yaml
   - secrets.yaml (from GitHub Secrets)
   - All service yamls
5. Wait for rollout (5-minute timeout)
6. Verify health (basic checks)

**Duration**: 3-5 minutes

**Environment**: `staging` (GitHub environment protection rule)

#### Job 4: Deploy to Production

**Manual trigger required**

**Pre-deployment validation**:
```bash
1. Check KUBE_CONFIG_PROD secret exists
2. Verify manifests loadable
3. Validate deployment audit trail
```

**Deployment sequence**:
```
1. Data layer (postgres, redis)          → Wait for healthy
2. API Gateway                           → Wait for healthy
3. Backend services (parallel)           → User, content, messaging, shop, media, ai
4. Frontend                              → Wait for healthy
```

**Post-deployment**:
```bash
1. Run production smoke tests
2. Verify health endpoints
3. Collect deployment metrics
4. Update audit log
```

**Duration**: 5-10 minutes

**Environment**: `production` (GitHub environment protection rule)
- Requires approval from 2 code owners
- Can only be triggered by tag (v*)
- Deployment record saved to DEPLOYMENT_LOG.md

---

## Configuration Management

### Environment Variables

Three tiered configuration approach:

#### Development (`.env.dev`)
- Debug logging enabled
- Services on localhost
- No rate limiting
- Minimal security restrictions
- Use: `source .env.dev`

#### Staging (`.env.staging`)
- Info logging
- External service URLs
- Rate limiting enabled
- TLS required
- Feature flags: beta on

#### Production (`.env.production`)
- Warn+ logging
- External service URLs (Azure, AWS)
- Strict rate limiting
- TLS required
- Feature flags: production only

**Usage in CI**:
```bash
# Staging deployment
export $(cat .env.staging | grep -v '^#')
kubectl apply -f k8s/

# Production deployment
export $(cat .env.production | grep -v '^#')
kubectl apply -f k8s/
```

### Secret Rotation

**Strategy**: Quarterly or per-incident

**Process**:
```
1. Generate new secret value (openssl rand -base64 32)
2. Add to GitHub Secrets (Settings → Secrets → New)
3. Old secret remains in Secrets (grace period: 30 days)
4. Pod restart triggers environment reload
5. After 30 days: Remove old secret
```

**Critical secrets** (monthly):
- JWT_SECRET
- ADMIN_PASSWORD
- Database passwords

---

## Security & Compliance

### Secret Management

**GitHub Secrets** (for CI/CD):
- KUBE_CONFIG_STAGING
- KUBE_CONFIG_PROD
- JWT_SECRET_STAGING, JWT_SECRET_PRODUCTION
- Database credentials (per-environment)
- API keys (OpenAI, SendGrid, Datadog, etc.)
- OAuth credentials (Google, GitHub)

**Best practices**:
```bash
# Never log secrets
- Use `::add-mask::` in GitHub Actions
- Sanitize logs in applications
- Enable audit logging for secret access

# Restrict access
- Use GitHub RBAC (branch protection, environment rules)
- Enable "Require approval" for production environment
- Review secret access logs quarterly
```

### Vulnerability Scanning

**Build-time**:
- `npm audit` (dependencies)
- Trivy image scanning (container vulnerabilities)
- SAST via GitHub Advanced Security (if enabled)

**Runtime**:
- Continuous scanning via Snyk (optional)
- Regular manual audits of third-party libraries

**Remediation**:
- High/Critical: Deploy fix immediately
- Medium: Deploy in next release
- Low: Backlog or ignore (with justification)

---

## Monitoring & Observability

### Pipeline Observability

**GitHub Actions Metrics**:
```
Metrics available via GitHub API:
- Average job duration
- Success rate per job
- Artifact storage usage
- Matrix job performance comparison
```

Access: Settings → Actions → All workflows or via API

### Deployment Observability

**Post-deployment checks**:

```yaml
# Prometheus alerts
- Pod restart rate > 1/hour
- API latency p99 > 500ms  
- Error rate > 1%
- Memory usage > 80%
- Cache hit rate < 60%

# Custom dashboards:
- System health (pods, nodes, network)
- Application performance (latency, throughput, errors)
- Database health (connections, queries, locks)
- Business metrics (users, transactions, failures)
```

**Deployed via**: Grafana dashboards (auto-provisioned)

### Audit Logging

**Captured automatically**:
- Who deployed (git actor)
- What was deployed (image tag, commit SHA)
- When it was deployed (timestamp in ISO 8601)
- Where it went (environment)
- How it performed (pod status, health checks)

**Stored in**: `deployment-audit.log`, `DEPLOYMENT_LOG.md` (in repo)

---

## Troubleshooting

### Common Issues

#### 1. Build Fails: "Docker Layer Cache Not Found"

**Symptom**: Build takes 15+ minutes, uses lots of resources

**Cause**: GitHub Actions cache was evicted (storage limit exceeded)

**Fix**:
```bash
# Manually trigger cache rebuild
# Happens automatically on next push (GitHub rebuilds cache)

# Or check disk usage:
docker system df
docker image prune -a --force
```

#### 2. Deploy Fails: "kubectl apply" Times Out

**Symptom**: Deployment incomplete after 5 minutes, pods not ready

**Cause**: 
- Pod CrashLoopBackOff (missing secrets/config)
- Insufficient node resources
- Image pull error

**Fix**:
```bash
# Check pod status
kubectl get pods -n milonexa -o wide

# Check events
kubectl describe pod <pod-name> -n milonexa

# Check logs
kubectl logs deployment/api-gateway -n milonexa

# Scale deployment
kubectl scale deployment/api-gateway --replicas=1 -n milonexa

# Restart with new image
kubectl set image deployment/api-gateway \
  api-gateway=ghcr.io/let-s-connect-org/let-s-connect/api-gateway:new-sha
```

#### 3. Production Approval Hangs

**Symptom**: Deployment awaits approval but approval button not clickable

**Cause**: Environment protection rule requires settings not met:
- Branch protection not enabled
- Status checks not passing
- Reviewer not configured

**Fix**:
```bash
# Check environment settings
# Settings → Environments → production

# Verify:
- Required reviewers configured
- Required status checks enabled
- Dismissal rules configured
```

#### 4. Rollback Doesn't Work

**Symptom**: After `kubectl rollout undo`, still seeing new pods

**Cause**: ReplicaSet not configured for rollback

**Fix**:
```bash
# Check rollout history
kubectl rollout history deployment/api-gateway -n milonexa

# Undo to specific revision
kubectl rollout undo deployment/api-gateway \
  --to-revision=2 -n milonexa

# Verify
kubectl rollout status deployment/api-gateway -n milonexa
```

---

## Appendix

### Useful Commands

```bash
# View job logs in GitHub Actions
gh run view <run-id> --log

# Re-run failed jobs
gh run rerun <run-id> --failed

# Cancel a running deployment
gh run cancel <run-id>

# View artifact list
gh run view <run-id> --json artifacts

# Download artifact
gh run download <run-id> -n <artifact-name>
```

### References

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Build Documentation](https://docs.docker.com/build/)
- [Kubernetes Deployment Guide](./k8s/README.md)
- [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md)
- [Docker Compose Setup](./QUICK_START.md)

### Contact

- **On-Call DevOps**: [PagerDuty link]
- **Slack**: #devops, @devops-team
- **Documentation Issues**: Create issue in repo

---

## Workstream H Implementation Summary

### H1: CI/CD Pipeline Modernization ✅ Completed

**Deliverables**:
1. ✅ GitHub Actions `deploy.yml` workflow
   - Build & push 12 container images in parallel
   - Vulnerability scanning with Trivy
   - Staging auto-deployment on main branch
   - Production manual deployment on git tags
   
2. ✅ Multi-stage deployment process
   - Image building with Docker Buildx
   - Container registry (ghcr.io) integration
   - Blue-green deployment support
   - Staged rollout strategy (data → gateway → services → frontend)

3. ✅ Environment protection rules
   - Staging: Automatic on CI pass
   - Production: Requires GitHub environment approval + tag

4. ✅ Deployment audit trail
   - Automatic logging of who/what/when/where
   - Captured in deployment-audit.log and DEPLOYMENT_LOG.md
   - Accessible for compliance/post-mortems

5. ✅ Rollback automation
   - Green deployment support
   - kubectl rollout undo commands
   - Emergency halt procedures

**Files Created/Modified**:
- `.github/workflows/deploy.yml` (NEW, 450+ lines)
- `docs/deployment/DEPLOYMENT_RUNBOOK.md` (NEW, 600+ lines)
- `docs/deployment/CI_CD_ARCHITECTURE.md` (NEW, this file, 500+ lines)

### H2 & H3: Pending (Next Phase)

- **H2**: Environment config templates (.env.dev, .env.staging, .env.production)
- **H3**: Kubernetes security hardening (RBAC, secrets, ingress)

---

_Pipeline architecture document. For deployment procedures, see DEPLOYMENT_RUNBOOK.md_
