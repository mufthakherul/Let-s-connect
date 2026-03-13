# Security Best Practices

This document describes the security architecture and countermeasures implemented across the Milonexa platform.

---

## Table of Contents

1. [OWASP Top 10 Mitigations](#1-owasp-top-10-mitigations)
2. [XSS Prevention](#2-xss-prevention)
3. [CSRF Protection](#3-csrf-protection)
4. [SQL Injection Prevention](#4-sql-injection-prevention)
5. [JWT Security](#5-jwt-security)
6. [Password Security](#6-password-security)
7. [Rate Limiting](#7-rate-limiting)
8. [Security Headers](#8-security-headers)
9. [CORS Policy](#9-cors-policy)
10. [Input Validation](#10-input-validation)
11. [OAuth Security](#11-oauth-security)
12. [Two-Factor Authentication](#12-two-factor-authentication)
13. [Admin Security](#13-admin-security)
14. [Secret Management](#14-secret-management)
15. [GDPR Compliance](#15-gdpr-compliance)
16. [Reporting Vulnerabilities](#16-reporting-vulnerabilities)

---

## 1. OWASP Top 10 Mitigations

| OWASP Risk | Milonexa Mitigation |
|---|---|
| A01: Broken Access Control | JWT with RBAC roles; `x-user-id` injection by gateway; route governance classification |
| A02: Cryptographic Failures | AES-256-GCM field encryption; bcrypt password hashing; TLS for all transport |
| A03: Injection | Sequelize parameterized queries; Joi/express-validator on all inputs |
| A04: Insecure Design | Security review checklist; threat modelling for auth flows |
| A05: Security Misconfiguration | Helmet.js on all services; explicit CORS origins; `getRequiredEnv()` for secrets |
| A06: Vulnerable Components | `npm audit` in CI; Renovate/Dependabot for automatic dependency updates |
| A07: Auth & Session Failures | Short-lived JWTs (15min); server-side session revocation; PKCE for OAuth |
| A08: Software & Data Integrity | Package lock files committed; Docker image digest pinning |
| A09: Logging & Monitoring | Winston structured logging; Prometheus metrics; admin audit trail |
| A10: Server-Side Request Forgery | Return URL validation (`sanitizeReturnUrl`); no user-supplied URLs in server-to-server calls |

---

## 2. XSS Prevention

### DOMPurify

All user-generated HTML content is sanitised with **DOMPurify v3.3.2** before rendering in the browser.

```js
// frontend/src/utils/sanitize.js
import DOMPurify from 'dompurify';

export function sanitizeHtml(dirty) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    FORCE_BODY: true,
  });
}

// Usage in React component
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }} />
```

**Never** render raw HTML from the API without sanitizing first.

### React Default Safety

React's default JSX rendering escapes HTML entities automatically:

```jsx
// Safe — React escapes this automatically
<p>{user.bio}</p>

// Dangerous — only use with sanitizeHtml()
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
```

### Content Security Policy

The Nginx reverse proxy sets a strict Content-Security-Policy header:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; connect-src 'self' wss://api.milonexa.com https://api.milonexa.com;
```

---

## 3. CSRF Protection

### SameSite Cookies

Cookies with `SameSite=Strict` or `SameSite=Lax` prevent CSRF for cookie-based state.

### State Tokens for OAuth

OAuth flows use server-side state tokens (not session cookies) to prevent CSRF. The state is stored in a server-side `Map`, not in the browser, so a malicious third-party site cannot forge the state.

See [AUTHENTICATION.md](AUTHENTICATION.md#6-oauth-pkce-flow) for the full state management implementation.

---

## 4. SQL Injection Prevention

### Sequelize Parameterized Queries

All database queries use Sequelize's built-in parameterization, which uses prepared statements under the hood:

```js
// Safe — parameterized
const user = await User.findOne({ where: { email } });

// Safe — Sequelize escapes automatically
const posts = await Post.findAll({ where: { authorId: userId, groupId } });
```

### Raw Queries Must Use Replacements

When raw SQL is unavoidable, always use the `replacements` option:

```js
// NEVER do this (SQL injection risk):
const results = await sequelize.query(`SELECT * FROM users WHERE email = '${email}'`);

// Always do this:
const results = await sequelize.query(
  'SELECT * FROM users WHERE email = :email',
  { replacements: { email }, type: sequelize.QueryTypes.SELECT }
);
```

### Code Review Rule

Any PR that adds raw SQL string concatenation with user input will be rejected in review.

---

## 5. JWT Security

| Property | Implementation |
|---|---|
| Algorithm | HS256 (HMAC-SHA256) |
| Access token expiry | 15 minutes (`JWT_ACCESS_EXPIRY=15m`) |
| Refresh token expiry | 7 days (`JWT_REFRESH_EXPIRY=7d`) |
| Secret strength | Minimum 64 characters (`JWT_SECRET`) |
| Storage (access) | JavaScript memory (Zustand state) — not localStorage |
| Storage (refresh) | HttpOnly cookie OR in-memory — not localStorage |
| Server-side revocation | Refresh token JTI stored in Redis; deleted on logout |
| Token rotation | New refresh token issued on every refresh |

### Why Not localStorage?

`localStorage` is accessible to JavaScript, making tokens vulnerable to XSS attacks. Access tokens are kept in memory (cleared on page close), and refresh tokens in HttpOnly cookies (inaccessible to JavaScript).

### Token Validation Middleware

```js
// Reject tokens with invalid signature, expired, or wrong algorithm
const payload = jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ['HS256'],  // Explicitly whitelist algorithm
});
```

---

## 6. Password Security

### bcrypt Hashing

```js
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
```

`BCRYPT_ROUNDS=12` requires ~400ms per hash, making brute-force attacks impractical.

### Password Requirements

- Minimum 8 characters
- No maximum length restriction (bcrypt handles long passwords safely by truncating at 72 bytes internally — consider pre-hashing for very long passwords)
- Validation via Joi: `Joi.string().min(8).required()`

### Password Reset Security

- Reset OTP expires in 15 minutes
- OTP is 6 digits (10^6 = 1,000,000 combinations)
- Rate limited to 3 reset attempts per 15 minutes per email
- All existing sessions are invalidated after password change

---

## 7. Rate Limiting

Rate limiting is implemented at two levels:

### API Gateway Level (Redis sliding window)

```js
// services/api-gateway/src/middleware/rateLimiter.js
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 60000,
  max: process.env.RATE_LIMIT_MAX || 100,
  store: new RedisStore({ client: redis, prefix: 'rl:' }),
});
```

### Nginx Level (token bucket)

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;
```

Auth endpoints (`/login`, `/register`, `/forgot-password`) have significantly lower rate limits to prevent credential stuffing.

---

## 8. Security Headers

All services use **Helmet.js** to set security headers:

```js
const helmet = require('helmet');
app.use(helmet());
```

Headers set by Helmet:

| Header | Value | Protection Against |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | MIME sniffing attacks |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter |
| `Strict-Transport-Security` | `max-age=31536000` | Protocol downgrade attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer leakage |
| `X-Powered-By` | Removed | Server fingerprinting |

Additional headers set via Nginx (see [REVERSE_PROXY.md](../deployment/REVERSE_PROXY.md)).

---

## 9. CORS Policy

CORS is configured explicitly — no wildcards in production:

```js
const corsOptions = {
  origin: (origin, callback) => {
    const allowed = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || [];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Version'],
  credentials: true,
  maxAge: 86400,
};

app.use(cors(corsOptions));
```

**Production requirement:** `CORS_ORIGINS` must be set to your exact frontend domain (e.g. `https://milonexa.com`). Never use `*`.

---

## 10. Input Validation

All API request bodies are validated with **Joi** or **express-validator** before processing:

```js
const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
});

router.post('/register', async (req, res, next) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return response.error(req, res, 400, error.details[0].message, 'VALIDATION_ERROR');
  }
  // Proceed with validated value
  await registerUser(value);
});
```

**Never** trust user input:
- Validate type, format, length, and range
- Reject unknown fields with `Joi.options({ stripUnknown: true })` or `allowUnknown: false`
- Sanitize strings that will be rendered as HTML (see [XSS Prevention](#2-xss-prevention))

---

## 11. OAuth Security

See [AUTHENTICATION.md](AUTHENTICATION.md#6-oauth-pkce-flow) for the full implementation.

| Security Control | Implementation |
|---|---|
| PKCE | Code verifier/challenge generated per auth request |
| State token | 32-byte random hex; server-side Map; 10-min TTL |
| Replay prevention | `consumeState()` deletes token on first use |
| Open redirect prevention | `sanitizeReturnUrl()` validates against `FRONTEND_URL` |
| State map DoS prevention | Max 1000 entries; LRU eviction |

---

## 12. Two-Factor Authentication

TOTP-based 2FA using RFC 6238 (compatible with Google Authenticator, Authy, etc.):

- 6-digit time-based OTP
- 30-second window
- TOTP secret encrypted at rest with AES-256-GCM
- Backup codes provided at setup (one-time use)
- Rate limited: 5 attempts per 5 minutes

See [AUTHENTICATION.md](AUTHENTICATION.md#9-two-factor-authentication-2fatotp) for the setup flow.

---

## 13. Admin Security

### IP Allowlisting

Admin interfaces are restricted to specific IP ranges in Nginx:

```nginx
allow 10.0.0.0/8;       # Internal network
allow 192.168.0.0/16;   # VPN range
deny all;
```

### Audit Trail

All admin actions are logged immutably to the security-service:

```js
// Every admin action creates an immutable audit log entry
await AuditLog.create({
  action: 'user.banned',
  adminId: req.user.userId,
  targetId: userId,
  targetType: 'user',
  details: { reason, duration },
  ipAddress: req.ip,
  timestamp: new Date(),
});
```

Audit logs are:
- Write-only from the admin's perspective (no edit/delete APIs)
- Forwarded to external log storage (MinIO/S3) for long-term retention
- Retained for 2 years minimum for compliance

### Break-Glass Access

Emergency admin access is logged with extra detail and triggers immediate Slack/email alerts.

### Admin Panel Deployment

The admin panel (`admin-web`) should only be started when needed:

```bash
docker compose --profile admin up -d admin-web
# Use when done:
docker compose stop admin-web
```

---

## 14. Secret Management

### `getRequiredEnv()`

All services use `getRequiredEnv()` from `services/shared/security-utils.js` to fail fast if a required secret is missing:

```js
const jwtSecret = getRequiredEnv('JWT_SECRET');
// Throws: Error: Required environment variable JWT_SECRET is not set
```

This prevents services from starting with missing secrets (which would cause runtime failures or silent security issues).

### Secret Rotation

| Secret | When to Rotate |
|---|---|
| `JWT_SECRET` | Every 6 months OR on suspected compromise. Rotating invalidates all user sessions. |
| `ENCRYPTION_KEY` | Rarely (requires data migration). Never rotate without a plan to re-encrypt existing data. |
| `INTERNAL_GATEWAY_TOKEN` | Every 90 days OR if service credentials are suspected to be leaked. |
| `DB_PASSWORD`, `REDIS_PASSWORD` | Every 90 days. |
| OAuth client secrets | Per provider security recommendations. |

### Never in Code

- Never commit secrets to git (even in `.env.example` — use placeholder values)
- Never log secrets (watch for debug logging that logs `req.body` or `process.env`)
- Never include secrets in Docker build args (they end up in image layers)

---

## 15. GDPR Compliance

### Data Export

Users can request a full export of their data:

```
GET /api/user/me/export
Authorization: Bearer <token>
```

Returns a JSON file with all user data: profile, posts, messages, orders, etc.

### Data Deletion

Users can request account deletion:

```
DELETE /api/user/me
Authorization: Bearer <token>
```

This:
1. Anonymises user data (replaces PII with `[deleted]`)
2. Deletes authentication credentials
3. Publishes `user.deleted` event for other services to clean up
4. Retains anonymised data for analytics (no PII)

### Data Minimisation

- Collect only data necessary for the feature
- Set automatic TTL on temporary data (OTPs, sessions, presence)
- Anonymise data that is no longer needed for its original purpose

---

## 16. Reporting Vulnerabilities

If you discover a security vulnerability in Milonexa:

1. **Do NOT open a public GitHub issue.**
2. Email security@milonexa.com with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Your contact information
3. You will receive an acknowledgment within 48 hours.
4. A fix will be developed and deployed within 30 days (critical: 7 days).
5. Credit will be given in the release notes (unless you prefer anonymity).

### Scope

In scope for responsible disclosure:
- Authentication bypass
- Privilege escalation
- Data exposure
- Injection vulnerabilities
- CSRF/XSS in core features

Out of scope:
- Denial of service (flood attacks)
- Social engineering
- Brute force with no rate limiting bypass
- Security issues in third-party services
