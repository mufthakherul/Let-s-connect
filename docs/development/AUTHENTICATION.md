# Authentication & Authorization Documentation

This document covers the complete authentication system in Milonexa, including JWT tokens, OAuth, 2FA, and RBAC.

---

## Table of Contents

1. [JWT Token System](#1-jwt-token-system)
2. [Login Flow](#2-login-flow)
3. [Token Refresh Flow](#3-token-refresh-flow)
4. [Frontend Auto-Refresh](#4-frontend-auto-refresh)
5. [API Gateway Middleware](#5-api-gateway-middleware)
6. [OAuth PKCE Flow](#6-oauth-pkce-flow)
7. [Email Verification](#7-email-verification)
8. [Password Reset Flow](#8-password-reset-flow)
9. [Two-Factor Authentication (2FA/TOTP)](#9-two-factor-authentication-2fatotp)
10. [Password Security](#10-password-security)
11. [RBAC Roles](#11-rbac-roles)
12. [Protected Routes](#12-protected-routes)

---

## 1. JWT Token System

Milonexa uses a dual-token system for stateless authentication with session revocation capability.

### Access Token

- **Algorithm:** HS256
- **Expiry:** 15 minutes (`JWT_ACCESS_EXPIRY=15m`)
- **Storage:** Memory (in-memory in React state / Zustand store)
- **Usage:** Sent as `Authorization: Bearer <token>` header on every API request

### Refresh Token

- **Algorithm:** HS256
- **Expiry:** 7 days (`JWT_REFRESH_EXPIRY=7d`)
- **Storage:** Redis (`session:refresh:{userId}:{jti}`) + HttpOnly cookie
- **Usage:** Used to obtain a new access token without re-login

### Token Payload

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@milonexa.com",
  "role": "user",
  "jti": "unique-token-id-uuid",
  "iat": 1704067200,
  "exp": 1704068100
}
```

| Claim | Description |
|---|---|
| `userId` | User's UUID — injected as `x-user-id` by the gateway |
| `email` | User's email address |
| `role` | RBAC role: `user`, `moderator`, `admin`, `super_admin` |
| `jti` | JWT ID — unique per token, stored in Redis for revocation |
| `iat` | Issued at (Unix timestamp) |
| `exp` | Expiration (Unix timestamp) |

### Token Security Properties

- Access tokens are short-lived (15 min) to minimise damage from token theft
- Refresh tokens are stored in Redis, allowing server-side revocation (logout)
- Token JTI (JWT ID) enables single-use refresh token rotation
- No sensitive data (passwords, payment info) is ever included in tokens

---

## 2. Login Flow

### Endpoint

```
POST /api/user/auth/login
Content-Type: application/json

{
  "email": "user@milonexa.com",
  "password": "userPassword123"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@milonexa.com",
      "username": "johndoe",
      "role": "user",
      "isEmailVerified": true
    }
  }
}
```

### Server-side Steps

1. Validate request body (email format, password not empty)
2. Find user by email
3. Verify password with `bcrypt.compare(password, user.passwordHash)`
4. If 2FA enabled: return `{ requires2FA: true, tempToken: '...' }`
5. Generate access token (HS256, 15min)
6. Generate refresh token (HS256, 7d, unique JTI)
7. Store refresh token JTI in Redis with 7-day TTL
8. Return both tokens + user data

### Error Responses

| Status | Code | Reason |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid email format or missing fields |
| 401 | `INVALID_CREDENTIALS` | Email not found or password incorrect |
| 401 | `EMAIL_NOT_VERIFIED` | User hasn't verified their email |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many login attempts |

---

## 3. Token Refresh Flow

### Endpoint

```
POST /api/user/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Server-side Steps

1. Verify refresh token signature and expiry
2. Extract `userId` and `jti` from token payload
3. Check Redis for `session:refresh:{userId}:{jti}` — reject if not found (revoked/expired)
4. Delete old JTI from Redis (single-use rotation)
5. Issue new access token + new refresh token (new JTI)
6. Store new JTI in Redis
7. Return new token pair

### Logout

```
POST /api/user/auth/logout
Authorization: Bearer <accessToken>
```

Server deletes the refresh token JTI from Redis, making the refresh token invalid.

---

## 4. Frontend Auto-Refresh

The React frontend automatically refreshes the access token before it expires.

**Location:** `frontend/src/services/authService.js` (or similar)

**Behaviour:**
- On login: store access token in Zustand state, store refresh token in memory (or secure HttpOnly cookie)
- Schedule refresh 60 seconds before access token expiry (`exp - now - 60s`)
- On refresh success: update access token in state
- On refresh failure (e.g. refresh token expired): clear state and redirect to login
- On page reload: attempt silent refresh with stored refresh token

```js
// Pseudo-code for auto-refresh setup
function scheduleTokenRefresh(accessToken) {
  const { exp } = parseJwt(accessToken);
  const now = Date.now() / 1000;
  const refreshIn = (exp - now - 60) * 1000; // 60 seconds before expiry

  setTimeout(async () => {
    try {
      const { accessToken: newToken } = await authService.refresh();
      useAuthStore.getState().setAccessToken(newToken);
      scheduleTokenRefresh(newToken);
    } catch {
      useAuthStore.getState().logout();
    }
  }, Math.max(0, refreshIn));
}
```

---

## 5. API Gateway Middleware

The API gateway validates JWTs and injects the user ID into downstream requests.

### Middleware Chain

```
Request
  → Rate Limiter
  → JWT Validator (public routes skipped)
  → x-user-id Injector
  → Circuit Breaker
  → Proxy to Service
```

### JWT Validation Middleware

```js
// Pseudo-code from api-gateway auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    // Check if route is public (route-governance.js)
    if (isPublicRoute(req.path)) return next();
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    // Inject x-user-id for downstream services
    req.headers['x-user-id'] = payload.userId;
    req.headers['x-user-role'] = payload.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

### Reading User Identity in Services

Downstream services read the user ID from the injected header:

```js
// In any service route handler
const userId = req.headers['x-user-id'];
const userRole = req.headers['x-user-role'];

if (!userId) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

---

## 6. OAuth PKCE Flow

Milonexa supports OAuth 2.0 with PKCE (Proof Key for Code Exchange) for Google, GitHub, Discord, and Apple.

### Security Properties

- **Server-side state map:** OAuth state tokens are stored in a server-side `Map` (not cookies or client storage), bounded to 1000 entries max, with 10-minute TTL
- **`consumeState()`:** State is consumed (deleted) when used, preventing CSRF/replay attacks
- **Return URL validation:** `sanitizeReturnUrl()` validates that the `returnUrl` matches `FRONTEND_URL` before redirecting, preventing open redirect vulnerabilities

### Flow

```
1. Client: GET /api/user/auth/google?returnUrl=/dashboard
     ↓
2. Server: generates state=random_uuid, stores {state, returnUrl, pkceVerifier} in Map
           redirects to Google authorization URL with state + PKCE challenge
     ↓
3. Google: user authenticates, redirects to /api/user/auth/google/callback?code=xxx&state=xxx
     ↓
4. Server: consumeState(state) → validates and removes from Map (prevents replay)
           exchanges code for Google tokens
           gets/creates user from Google profile
           issues Milonexa JWT access + refresh tokens
           redirects to sanitizeReturnUrl(returnUrl)#access_token=xxx
     ↓
5. Frontend: reads token from URL hash, stores in state, clears URL hash
```

### State Map Implementation

```js
const stateMap = new Map();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_STATE_ENTRIES = 1000;

function generateState(returnUrl, pkceVerifier) {
  if (stateMap.size >= MAX_STATE_ENTRIES) {
    // Evict oldest entry
    const firstKey = stateMap.keys().next().value;
    stateMap.delete(firstKey);
  }

  const state = crypto.randomBytes(32).toString('hex');
  stateMap.set(state, {
    returnUrl,
    pkceVerifier,
    expiresAt: Date.now() + STATE_TTL_MS,
  });
  return state;
}

function consumeState(state) {
  const entry = stateMap.get(state);
  if (!entry) throw new Error('Invalid or expired state');
  if (Date.now() > entry.expiresAt) {
    stateMap.delete(state);
    throw new Error('State expired');
  }
  stateMap.delete(state); // Consumed — cannot be reused
  return entry;
}
```

### Return URL Sanitization

```js
function sanitizeReturnUrl(returnUrl) {
  const frontendUrl = process.env.FRONTEND_URL;
  try {
    const url = new URL(returnUrl);
    const base = new URL(frontendUrl);
    // Only allow redirects to the same origin as FRONTEND_URL
    if (url.origin !== base.origin) return frontendUrl;
    return returnUrl;
  } catch {
    return frontendUrl;
  }
}
```

---

## 7. Email Verification

### Registration Flow

1. User registers with email/password
2. Server creates user with `isEmailVerified: false`
3. Server generates 6-digit OTP, stores in Redis with 10-minute TTL
4. Server sends verification email with OTP
5. User submits OTP to `POST /api/user/auth/verify-email`
6. Server validates OTP from Redis, marks user as verified
7. Server issues JWT tokens (user is now logged in)

### OTP Generation

```js
// 6-digit numeric OTP
const otp = Math.floor(100000 + Math.random() * 900000).toString();
await redis.setex(`email_verify:${userId}`, 600, otp); // 10 min TTL
```

### Resend Verification

```
POST /api/user/auth/resend-verification
{ "email": "user@milonexa.com" }
```

Rate-limited to 3 requests per 15 minutes per email address.

---

## 8. Password Reset Flow

```
1. POST /api/user/auth/forgot-password { email }
   → Server generates 6-digit OTP, emails user
   → OTP stored in Redis: reset_otp:{email} → 15-minute TTL

2. POST /api/user/auth/verify-reset-otp { email, otp }
   → Server validates OTP, issues short-lived reset token (5 minutes)
   → Returns { resetToken: '...' }

3. POST /api/user/auth/reset-password { resetToken, newPassword }
   → Server validates reset token
   → Server hashes new password with bcrypt (rounds=12)
   → Server updates user's passwordHash
   → Server invalidates all existing refresh tokens for the user
   → User must log in again
```

---

## 9. Two-Factor Authentication (2FA/TOTP)

Milonexa supports TOTP-based 2FA compatible with authenticator apps (Google Authenticator, Authy, etc.).

### Setup Flow

```
1. POST /api/user/auth/2fa/setup (authenticated)
   → Server generates TOTP secret
   → Returns { secret, qrCodeUrl, backupCodes }

2. User scans QR code with authenticator app

3. POST /api/user/auth/2fa/confirm { totp: '123456' }
   → Server verifies TOTP against secret
   → Enables 2FA on account (stores secret encrypted with ENCRYPTION_KEY)
   → Returns backup codes (shown once)
```

### Login with 2FA

After password verification, if 2FA is enabled:

```
Login response: { requires2FA: true, tempToken: 'short-lived-token' }

POST /api/user/auth/2fa/verify { tempToken, totp: '123456' }
→ Verifies TOTP
→ Returns full accessToken + refreshToken
```

### Secret Storage

TOTP secrets are encrypted in the database using AES-256-GCM with `ENCRYPTION_KEY` via the `security-utils.js` `encryptField()` helper.

---

## 10. Password Security

### Hashing

All passwords are hashed with bcrypt before storage:

```js
const bcrypt = require('bcrypt');
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

// Hashing (at registration / password change)
const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

// Verification (at login)
const isValid = await bcrypt.compare(password, user.passwordHash);
```

**`BCRYPT_ROUNDS=12`** is the production minimum. Higher values increase security but also increase login latency:

| Rounds | Approximate time (modern CPU) |
|---|---|
| 10 | ~100ms |
| 12 | ~400ms |
| 14 | ~1.6s |

### Password Requirements

- Minimum 8 characters
- No maximum length
- No character class requirements (length is more important than complexity)
- Checked against common password list (optional, via `zxcvbn`)

### OAuth Accounts

Users who sign up via OAuth (no password set) have `passwordHash = null`. They must use the "Set Password" flow to add a password to their account.

---

## 11. RBAC Roles

| Role | Description | Capabilities |
|---|---|---|
| `user` | Standard user | Access own data, public content, social features |
| `moderator` | Content moderator | Flag/unflag content, review moderation queue |
| `admin` | Platform admin | User management, platform settings, all content |
| `super_admin` | Super administrator | All admin capabilities + role management, system config |

### Role Checks in Services

```js
// Middleware for role-based access
function requireRole(requiredRole) {
  const hierarchy = ['user', 'moderator', 'admin', 'super_admin'];

  return (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    const userIdx = hierarchy.indexOf(userRole);
    const requiredIdx = hierarchy.indexOf(requiredRole);

    if (userIdx < requiredIdx) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Usage
router.delete('/posts/:id', requireRole('moderator'), deletePost);
router.get('/admin/users', requireRole('admin'), listAllUsers);
```

---

## 12. Protected Routes

### Frontend Route Protection

React Router v7 routes are protected with an `AuthGuard` component:

```jsx
// Redirect to login if not authenticated
<Route path="/dashboard" element={
  <AuthGuard>
    <Dashboard />
  </AuthGuard>
} />

// Redirect to home if not admin
<Route path="/admin" element={
  <RoleGuard requiredRole="admin">
    <AdminPanel />
  </RoleGuard>
} />
```

### Route Classification

| Route Type | Auth Required | Role | Example |
|---|---|---|---|
| **Public** | No | None | `/`, `/login`, `/register`, `/posts/:id` (public posts) |
| **Authenticated** | Yes | `user`+ | `/dashboard`, `/messages`, `/profile/edit` |
| **Moderator** | Yes | `moderator`+ | `/moderation/queue` |
| **Admin** | Yes | `admin`+ | `/admin/users`, `/admin/settings` |
| **Super Admin** | Yes | `super_admin` | `/admin/roles`, `/admin/system` |

### API Route Classification

Routes are classified in `services/api-gateway/src/route-governance.js`. Public routes are accessible without JWT; all others require a valid access token.
