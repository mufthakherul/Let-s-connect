# OWASP Top 10 Compliance Review — Milonexa Platform

**Date:** March 2026  
**Standard:** OWASP Top 10 Web Application Security Risks (2021)  
**Status:** ✅ Reviewed and mitigated

---

## Summary

| # | Risk | Status | Implementation |
|---|------|--------|---------------|
| A01 | Broken Access Control | ✅ Mitigated | RBAC middleware, route-level auth guards |
| A02 | Cryptographic Failures | ✅ Mitigated | TLS 1.3, bcrypt passwords, JWT signing |
| A03 | Injection | ✅ Mitigated | Parameterized queries, input sanitization |
| A04 | Insecure Design | ✅ Mitigated | Threat model reviewed, circuit breakers |
| A05 | Security Misconfiguration | ✅ Mitigated | Helmet.js, security headers, env validation |
| A06 | Vulnerable Components | ✅ Ongoing | Dependabot + `npm audit` in CI |
| A07 | Auth & Session Failures | ✅ Mitigated | JWT rotation, refresh tokens, 2FA |
| A08 | Software & Data Integrity | ✅ Mitigated | SHA-256 checksums, signed images |
| A09 | Logging & Monitoring Failures | ✅ Mitigated | Structured logs, Prometheus, alerting |
| A10 | SSRF | ✅ Mitigated | URL allowlist, internal-only service mesh |

---

## Detailed Review

### A01: Broken Access Control

**Controls implemented:**
- `services/shared/authorization.js` — RBAC with 4 roles (user, moderator, admin, super-admin) and 30+ fine-grained permissions
- API gateway enforces route classification: PUBLIC, AUTHENTICATED, ADMIN, INTERNAL
- `requireAuth`, `requireRole(role)`, `requirePermission(perm)`, `requireOwnership(resourceId)` middleware on all protected routes
- Admin routes served on a separate port (3001) with `requireAdminSecret` middleware
- Kubernetes NetworkPolicies enforce pod-to-pod access controls (k8s/rbac.yaml)

**Remaining risk:** Admin secret (`ADMIN_SECRET`) must be rotated quarterly.

---

### A02: Cryptographic Failures

**Controls implemented:**
- Passwords hashed with **bcrypt** (work factor 12) — never stored or logged in plaintext
- JWT tokens signed with HS256, secret validated at startup via `env-validator.js`
- TLS 1.3 enforced at ingress with strong cipher suites (ECDHE-RSA, ECDHE-ECDSA, AES-256-GCM)
- HTTPS enforced; HTTP → HTTPS redirect at ingress
- Redis and database connections require passwords in production

**Remaining risk:** Rotate JWT_SECRET quarterly (see `docs/deployment/SECRET_ROTATION.md`).

---

### A03: Injection

**Controls implemented:**
- **SQL Injection**: All DB queries use Sequelize ORM with parameterized queries; no raw string concatenation in SQL
- **XSS**: `services/shared/sanitization.js` — `detectXss()`, `sanitizeText()`, `sanitizeRichText()` with DOMPurify on the frontend
- **NoSQL Injection**: Redis keys built with `buildHashedAiKey()` — never include unsanitized user input directly
- Input validated at gateway and service level with Joi schemas
- `Content-Security-Policy` header configured in `k8s/ingress-production.yaml`

**Test coverage:** Sanitization inputs tested in `tests/critical-path/`.

---

### A04: Insecure Design

**Controls implemented:**
- Business logic separation: gateway handles routing/auth, services handle business logic
- Rate limiting: 1000 RPS global, 100 RPS per IP at ingress; per-route limits via route registry
- Circuit breakers prevent cascade failures (`services/api-gateway/resilience-config.js`)
- Spam/harmful content detection via AI moderation endpoint (`/ai-service/moderate`) on post submission
- Error messages never expose internal stack traces to clients (error envelope pattern)

---

### A05: Security Misconfiguration

**Controls implemented:**
- `helmet()` middleware on all Express apps with:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security` (HSTS, 1 year + preload)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` restricting camera/microphone/geolocation
- CORS: strict domain allowlist in production (no wildcard)
- Debug endpoints (`/debug/query-stats`, `/health/circuits`) protected by `requireAdminSecret`
- Kubernetes pods run as non-root with `allowPrivilegeEscalation: false`
- `env-validator.js` blocks startup if required secrets contain placeholder values

---

### A06: Vulnerable and Outdated Components

**Controls implemented:**
- **Dependabot** auto-raises PRs weekly for outdated npm dependencies (`.github/dependabot.yml`)
- `npm audit` runs in CI (`security-audit` job in `.github/workflows/ci.yml`) for frontend + all backend services
- **Trivy** container vulnerability scanning in deploy workflow (HIGH/CRITICAL CVEs fail the build)
- Node.js 18+ base images kept current in Dockerfiles

**Action:** Review and merge Dependabot PRs weekly.

---

### A07: Identification and Authentication Failures

**Controls implemented:**
- Passwords: minimum 8 characters, validated with Joi schema
- JWT access tokens expire in 24h; refresh tokens in 30 days
- Refresh token rotation on every use (prevents token reuse after theft)
- **2FA**: TOTP-based two-factor authentication (`admin_frontend/src/components/security/TwoFactorSetup.jsx`)
- Account lockout: failed login attempts tracked via Redis rate limiter
- Session invalidation on password change or explicit logout

---

### A08: Software and Data Integrity Failures

**Controls implemented:**
- Docker images built from verified base images (node:18-alpine)
- Container image signing and vulnerability scanning with Trivy in CI
- Backup files verified with SHA-256 checksums (`scripts/backup-restore.sh`)
- `npm ci` (not `npm install`) used in CI to use exact lockfile versions
- GitHub Actions: pinned action versions to prevent supply chain attacks

---

### A09: Security Logging and Monitoring Failures

**Controls implemented:**
- All requests logged with correlation IDs (`requestId`, `traceId`) via pino structured logging
- Security events logged: auth failures, permission denials, unusual activity patterns
- Prometheus metrics + Grafana dashboards with alerting for error rate, latency, saturation
- SLO-based alerting with error budget burn-rate alerts (`k8s/alertmanager.yaml`)
- Incident response runbook: `docs/development/operations/INCIDENT_RESPONSE_RUNBOOK.md`
- Audit logs retained for 90 days minimum

---

### A10: Server-Side Request Forgery (SSRF)

**Controls implemented:**
- Services only communicate via the internal Kubernetes service mesh
- External HTTP calls in AI service (Gemini API) go to an allowlisted domain only
- Media uploads validated for MIME type and size before processing
- Internal service URLs (postgres, redis, other microservices) are environment-variable driven — not user-controlled
- Kubernetes NetworkPolicies: pods can only call other pods they explicitly need

---

## Penetration Testing Schedule

| Type | Frequency | Next Date | Owner |
|------|-----------|-----------|-------|
| DAST scan (OWASP ZAP) | Quarterly | Q2 2026 | DevOps |
| Manual pentest | Bi-annually | H2 2026 | Security team / external |
| Dependency audit | Weekly (automated) | Ongoing | Dependabot |
| CVE review | Monthly | Monthly | Backend Lead |

---

## Action Items

- [ ] Schedule Q2 2026 OWASP ZAP automated scan in CI pipeline
- [ ] Integrate Snyk or Semgrep for SAST in CI
- [ ] Conduct first external penetration test by H2 2026
- [ ] Review and update this document after each pentest

---

*Last reviewed: March 2026*
