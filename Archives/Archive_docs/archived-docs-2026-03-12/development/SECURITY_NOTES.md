# Security Notes for Kubernetes Deployment

## Overview

This document outlines security considerations for deploying the Let's Connect platform to Kubernetes.

## Current Configuration (Development/Testing)

The current Kubernetes manifests are configured for **development and testing** environments. Several security-related configurations use default or permissive values that **MUST be changed for production**.

---

## Critical Security Items

### 1. Grafana Admin Credentials

**Location**: `k8s/grafana.yaml`, lines 147-149

**Current Configuration**:
```yaml
- name: GF_SECURITY_ADMIN_USER
  value: "admin"
- name: GF_SECURITY_ADMIN_PASSWORD
  value: "admin"
```

**⚠️ Security Issue**: Default credentials are hardcoded in the manifest.

**Production Fix**:
```yaml
# Create a Kubernetes Secret
apiVersion: v1
kind: Secret
metadata:
  name: grafana-credentials
  namespace: lets-connect
type: Opaque
stringData:
  admin-user: "your-secure-username"
  admin-password: "your-secure-password-here"

# Update deployment to use secret
env:
  - name: GF_SECURITY_ADMIN_USER
    valueFrom:
      secretKeyRef:
        name: grafana-credentials
        key: admin-user
  - name: GF_SECURITY_ADMIN_PASSWORD
    valueFrom:
      secretKeyRef:
        name: grafana-credentials
        key: admin-password
```

### 2. CORS Configuration

**Location**: `k8s/ingress.yaml`, lines 31, 136

**Current Configuration**:
```yaml
nginx.ingress.kubernetes.io/cors-allow-origin: "*"
```

**⚠️ Security Issue**: Allows requests from any origin, potential for CSRF attacks.

**Production Fix**:
```yaml
# Restrict to specific trusted domains
nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.letsconnect.com,https://www.letsconnect.com"
```

### 3. Persistent Storage

**Locations**: 
- `k8s/prometheus.yaml`, line 188 (uses emptyDir)
- `k8s/grafana.yaml`, line 186 (uses emptyDir)

**Current Configuration**:
```yaml
volumes:
  - name: storage
    emptyDir: {}
```

**⚠️ Issue**: Data is lost when pods restart.

**Production Fix**:
```yaml
# Use PersistentVolumeClaim (already defined in manifests)
volumes:
  - name: storage
    persistentVolumeClaim:
      claimName: prometheus-storage  # or grafana-storage
```

**Note**: PersistentVolumeClaims are already defined at the end of each manifest but not referenced. Simply change the volume definition to use them.

---

## Additional Security Recommendations
### Anonymous posting — sealed mappings, retention & deletion requests

**Location**: `services/content-service` (AnonIdentity storage)

**Notes**:
- Public view: anonymous posts/comments do **not** include user-identifying fields and are not shown on the user's public profile or visible post history.
- Sealed mapping: the service stores a sealed, encrypted mapping (user → pseudonym) strictly for moderation/abuse-handling and legal compliance. Mapping ciphertexts are zeroized after 1 year by default; mappings are not exposed via the UI.
- User controls: because anonymous items are not linked to the user's public profile, users **cannot** directly edit or delete anonymous posts/comments from their account; removal must be initiated via the deletion-request workflow.
- Deletion-request flow: authors may request deletion by submitting the deletion-request endpoint or using the Help Center (the platform verifies ownership using a small challenge such as approximate creation time/device class). Verified requests result in archival and removal from public listings.

**Operational controls**:
- Store mapping encryption keys in a secrets manager or KMS; never hardcode keys in manifests.
- Enable strict RBAC and audit logging for any access to archived content or mapping records.
- Schedule and monitor zeroization/retention jobs.

**Legal/Policy**: The platform does **not** provide a routine unmasking mechanism; ensure your legal/takedown policies and privacy disclosures reflect this behavior and comply with applicable laws.
### 4. TLS/SSL Certificates

**Location**: `k8s/ingress.yaml`, line 48

**Current Configuration**:
```yaml
cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

**Action Required**:
1. Install cert-manager in your cluster
2. Create a ClusterIssuer for Let's Encrypt
3. Verify TLS certificates are automatically provisioned

**Installation**:
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create Let's Encrypt ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 5. Network Policies

**Status**: Not implemented (optional)

**Recommendation**: Create NetworkPolicies to restrict pod-to-pod communication.

**Example**:
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: media-service-policy
  namespace: lets-connect
spec:
  podSelector:
    matchLabels:
      app: media-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api-gateway
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    - podSelector:
        matchLabels:
          app: redis
```

### 6. Database Credentials

**Status**: Should be stored in Kubernetes Secrets

**Action Required**:
```bash
# Create database secret
kubectl create secret generic database-credentials \
  --from-literal=username=postgres \
  --from-literal=password=your-secure-password \
  --namespace=lets-connect

# Update service deployments to use secrets
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: database-credentials
        key: connection-string
```

### 7. S3/MinIO Credentials

**Status**: Should be stored in Kubernetes Secrets

**Action Required**:
```bash
# Create S3 secret
kubectl create secret generic s3-credentials \
  --from-literal=access-key=your-access-key \
  --from-literal=secret-key=your-secret-key \
  --namespace=lets-connect
```

### 8. JWT Secret

**Status**: Should be stored in Kubernetes Secrets

**Action Required**:
```bash
# Create JWT secret
kubectl create secret generic jwt-secret \
  --from-literal=secret=your-very-long-random-jwt-secret \
  --namespace=lets-connect
```

### 9. RBAC and Service Accounts

**Status**: Basic RBAC implemented for Prometheus

**Recommendation**: Review and minimize permissions for each service.

**Current Prometheus RBAC** (lines 244-280 in `k8s/prometheus.yaml`):
```yaml
# Prometheus has cluster-wide read access
# This is necessary for metrics collection
# Verify this is acceptable for your security policy
```

### 10. Image Security

**Recommendation**: Use specific image tags (not `latest`)

**Current Configuration**:
```yaml
image: prom/prometheus:v2.45.0  # Good - specific version
image: grafana/grafana:10.0.3   # Good - specific version
```

**Action**: For your own service images, ensure you use semantic versioning tags.

---

## Deployment Checklist

Before deploying to production:

- [ ] Change Grafana admin credentials to use Kubernetes Secret
- [ ] Update CORS configuration to allow only specific domains
- [ ] Enable persistent storage for Prometheus and Grafana
- [ ] Install cert-manager and configure TLS certificates
- [ ] Create Kubernetes Secrets for all credentials (database, S3, JWT)
- [ ] Update ConfigMap to reference secrets instead of plaintext values
- [ ] Implement NetworkPolicies (optional but recommended)
- [ ] Review and test RBAC permissions
- [ ] Use specific image tags for all services
- [ ] Enable Pod Security Standards/Policies
- [ ] Configure resource limits and requests for all containers
- [ ] Set up audit logging for the cluster

---

## Monitoring Security

### Enable Audit Logging

Configure your cluster to log API access:
```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: Metadata
    omitStages:
      - RequestReceived
```

### Monitor for Security Events

Set up alerts in Grafana for:
- Failed authentication attempts
- Unauthorized API access
- High error rates
- Unusual traffic patterns
- Resource exhaustion

---

## References

- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/)
- [OWASP Kubernetes Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Kubernetes_Security_Cheat_Sheet.html)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [Cert-Manager Documentation](https://cert-manager.io/docs/)

---

*Last Updated: February 9, 2026*
*Review this document before each production deployment*
