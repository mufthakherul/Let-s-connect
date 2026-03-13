# Admin Authentication System Architecture

**Version:** 2.0
**Date:** March 13, 2026
**Status:** Implemented

---

## Overview

The Milonexa admin authentication system has been completely redesigned with a stealth-first, multi-step verification approach. This document describes the architecture, security features, and implementation details.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Authentication Flow](#authentication-flow)
3. [Security Features](#security-features)
4. [Components](#components)
5. [API Endpoints](#api-endpoints)
6. [Database Schema](#database-schema)
7. [Configuration](#configuration)
8. [Deployment](#deployment)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin User Browser                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Stealth Login Interface                   │  │
│  │  - No branding, SEO tags, or identifiers              │  │
│  │  - Animated canvas with falling/floating letters      │  │
│  │  - Hidden authentication trigger                      │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ HTTPS (TLS 1.3)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (Port 8000)                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  - Rate limiting (8 req/15min for admin endpoints)    │  │
│  │  - IP whitelisting                                    │  │
│  │  - CSRF token validation                              │  │
│  │  - Request logging                                    │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ Internal (Docker network)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 Security Service (Port 9102)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Phase 1: Stealth Authentication                      │  │
│  │  - Silent credential validation                       │  │
│  │  - No error disclosure                                │  │
│  │  - Session creation                                   │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  Phase 2: Cross-Field Validation                      │  │
│  │  - Username ↔ Email verification                       │  │
│  │  - Silent failure on mismatch                         │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  Phase 3: Email Verification Code                     │  │
│  │  - Generate 6-8 digit code                            │  │
│  │  - Send via Mailgun                                   │  │
│  │  - 10-minute expiration                               │  │
│  │  - Max 3 attempts                                     │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  Security Hardening                                   │  │
│  │  - IP anomaly detection                               │  │
│  │  - Account lockout (5 failed attempts)                │  │
│  │  - Session timeout (10 minutes)                       │  │
│  │  - Audit logging                                      │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL (Admin Database)                     │
│  Tables:                                                     │
│  - AdminUsers (credentials, roles, status)                   │
│  - AuditLogs (authentication events)                         │
│  - Sessions (active admin sessions)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

### Complete Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant StealthUI as Stealth Login UI
    participant Gateway as API Gateway
    participant Security as Security Service
    participant DB as PostgreSQL
    participant Email as Mailgun

    Note over User,Email: Phase 1: Stealth Authentication

    User->>StealthUI: Type username (Box 1)
    StealthUI->>StealthUI: Show falling letters animation
    User->>StealthUI: Type password (Box 2)
    StealthUI->>StealthUI: Show floating bubbles animation
    User->>StealthUI: Delete last char of Box 1
    User->>StealthUI: Retype same character
    StealthUI->>StealthUI: Trigger detected!

    StealthUI->>Gateway: POST /api/admin/stealth-auth
    Gateway->>Security: Forward with rate limit check
    Security->>DB: Query admin by username/email
    DB-->>Security: Admin record
    Security->>Security: Verify password (bcrypt)
    Security->>Security: Create session
    Security-->>Gateway: Session cookie + next step
    Gateway-->>StealthUI: { nextStep: "cross-validation" }

    Note over User,Email: Phase 2: Cross-Field Validation

    StealthUI->>User: Show minimal input field
    User->>StealthUI: Enter email (if username used)
    StealthUI->>Gateway: POST /api/admin/verify-cross-field
    Gateway->>Security: Forward request
    Security->>DB: Validate cross-field matches
    DB-->>Security: Validation result
    Security-->>Gateway: { success: true }
    Gateway-->>StealthUI: Proceed to code verification

    Note over User,Email: Phase 3: Email Verification Code

    Security->>Security: Generate 6-digit code
    Security->>Email: Send verification email
    Email-->>User: Email with code
    StealthUI->>User: Show code input field
    User->>StealthUI: Enter 6-digit code
    StealthUI->>Gateway: POST /api/admin/validate-code
    Gateway->>Security: Forward request
    Security->>Security: Validate code
    Security->>Security: Check expiration & attempts
    Security->>DB: Update admin (lastLoginAt, reset attempts)
    Security->>Security: Generate JWT token
    Security-->>Gateway: { token, admin }
    Gateway-->>StealthUI: Authentication successful
    StealthUI->>User: Redirect to admin dashboard
```

### Step-by-Step Flow

#### Step 1: Stealth Authentication
1. User types username/email in Box 1
   - Each character spawns a falling letter animation
2. User types password in Box 2
   - Each character spawns a floating bubble animation
3. **Trigger:** User deletes last character of Box 1, then retypes it
4. Silent POST to `/api/admin/stealth-auth`
5. Server validates credentials
6. If valid: create session, return next step
7. If invalid: silent failure (200 OK, empty response)

#### Step 2: Cross-Field Validation
1. Server determines required field:
   - If username was used → request email
   - If email was used → request username
2. User enters cross-field in minimal UI
3. Silent POST to `/api/admin/verify-cross-field`
4. Server validates cross-field matches admin record
5. If valid: proceed to code verification
6. If invalid: silent failure

#### Step 3: Email Verification Code
1. Server generates 6-8 digit code
2. Code sent to admin's email via Mailgun
3. Code stored with 10-minute expiration
4. User enters code in monospace input field
5. POST to `/api/admin/validate-code`
6. Server validates:
   - Code matches
   - Not expired
   - Attempts < 3
7. If valid: generate JWT, mark authentication complete
8. If invalid: increment attempts, silent failure

#### Step 4: Success
1. JWT token returned to client
2. Token stored in secure httpOnly cookie
3. User redirected to admin dashboard
4. Audit log entry created
5. IP address tracked for anomaly detection

---

## Security Features

### 1. Stealth Interface

**Features:**
- No visible branding or identifiers
- No SEO tags, meta tags, or favicon
- Appears as blank animated canvas
- Input boxes have transparent text (only cursor visible)
- No error messages or status indicators

**Benefits:**
- Hides the existence of admin panel
- Prevents automated attacks
- Reduces social engineering risk

### 2. Hidden Authentication Trigger

**Mechanism:**
- Special sequence: type → delete last char → retype
- Only works after both boxes have content
- No visual indicator of trigger
- Silent server validation

**Benefits:**
- Unpredictable to attackers
- Cannot be automated
- Requires knowledge of system

### 3. Multi-Step Verification

**Steps:**
1. Credential validation
2. Cross-field validation
3. Email code verification

**Benefits:**
- Multiple layers of security
- Prevents credential stuffing
- Verifies email ownership

### 4. Silent Failures

**Implementation:**
- All auth endpoints return 200 OK
- No error messages in response
- No timing differences
- Constant-time comparisons

**Benefits:**
- No information disclosure
- Prevents user enumeration
- Thwarts timing attacks

### 5. Rate Limiting

**Configuration:**
- Admin endpoints: 8 requests per 15 minutes
- Login endpoint: 5 attempts before lockout
- Per-IP tracking
- Exponential backoff

**Benefits:**
- Prevents brute force attacks
- Limits automated attacks
- Protects against DDoS

### 6. Account Lockout

**Policy:**
- 5 failed login attempts
- 15-minute lockout period
- Silent failure (no notification)
- Automatic unlock after period

**Benefits:**
- Prevents persistent attacks
- Limits credential testing
- Automatic recovery

### 7. IP Anomaly Detection

**Tracking:**
- Last 100 login IPs per admin
- Alert if 5+ different IPs in last 10 logins
- Geo-IP location tracking (production)
- Webhook notifications

**Benefits:**
- Detects account compromise
- Identifies suspicious patterns
- Enables rapid response

### 8. CSRF Protection

**Implementation:**
- Secure token generation
- Cookie-based validation
- Header requirement
- Per-session tokens

**Benefits:**
- Prevents cross-site attacks
- Protects state-changing operations
- Validates request origin

### 9. Session Security

**Features:**
- 10-minute session timeout
- Secure httpOnly cookies
- SameSite=strict
- TLS-only in production

**Benefits:**
- Limits session hijacking window
- Prevents XSS attacks
- Enforces secure transport

### 10. Audit Logging

**Logged Events:**
- Authentication attempts (success/failure)
- Admin CRUD operations
- Permission changes
- Session creation/destruction
- IP addresses and timestamps

**Benefits:**
- Compliance requirements
- Forensic analysis
- Anomaly detection
- Incident response

---

## Components

### Frontend Components

#### 1. StealthLogin.jsx
**Location:** `admin/web/src/components/StealthLogin.jsx`

**Features:**
- Canvas-based animation system
- Falling letters (Box 1)
- Floating bubbles (Box 2)
- Collision detection & bubble popping
- Hidden authentication trigger
- Silent server communication

**Dependencies:**
- React 19
- Framer Motion 12
- Material-UI 7

#### 2. MultiStepVerification.jsx
**Location:** `admin/web/src/components/MultiStepVerification.jsx`

**Features:**
- Cross-field validation UI
- 6-8 digit code input
- Animated transitions
- Silent error handling

### Backend Components

#### 1. enhanced-security.js
**Location:** `services/security-service/enhanced-security.js`

**Functions:**
- `handleStealthAuth()` - Phase 1 authentication
- `handleCrossValidation()` - Phase 2 validation
- `handleSendVerificationCode()` - Code generation
- `handleValidateCode()` - Code verification
- `trackIPLogin()` - Anomaly detection
- `generateCSRFToken()` - CSRF token generation
- `validateCSRF()` - CSRF middleware
- `checkRateLimit()` - Rate limiting logic

#### 2. admin-management.js
**Location:** `admin/cli/commands/admin-management.js`

**CLI Commands:**
- `admin:list` - List all admins with table
- `admin:create` - Interactive admin creation
- `admin:disable <id>` - Disable account
- `admin:enable <id>` - Enable account
- `admin:logs <id>` - View activity logs
- `admin:verify <id>` - Verify admin status

---

## API Endpoints

### Authentication Endpoints

#### POST /api/admin/stealth-auth
**Phase:** 1 - Stealth Authentication

**Request:**
```json
{
  "identifier": "username or email",
  "secret": "password",
  "inputHistory": {
    "box1": ["a", "ad", "adm", "admin"],
    "box2": ["p", "pa", "pas", "pass"]
  }
}
```

**Response (Success):**
```json
{
  "nextStep": "cross-validation",
  "requireField": "email"
}
```

**Response (Failure):**
```json
{}
```

---

#### POST /api/admin/verify-cross-field
**Phase:** 2 - Cross-Field Validation

**Request:**
```json
{
  "primary": "admin",
  "cross": "admin@example.com"
}
```

**Response (Success):**
```json
{
  "success": true
}
```

**Response (Failure):**
```json
{}
```

---

#### POST /api/admin/send-verification-code
**Phase:** 3 - Send Code

**Request:**
```json
{
  "identifier": "admin@example.com"
}
```

**Response:**
```json
{
  "success": true
}
```

---

#### POST /api/admin/validate-code
**Phase:** 3 - Validate Code

**Request:**
```json
{
  "identifier": "admin@example.com",
  "code": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@example.com",
    "role": "master"
  }
}
```

**Response (Failure):**
```json
{}
```

---

## Database Schema

### AdminUsers Table

```sql
CREATE TABLE "AdminUsers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" VARCHAR(255) UNIQUE NOT NULL,
  "email" VARCHAR(255) UNIQUE,
  "passwordHash" VARCHAR(255) NOT NULL,
  "role" VARCHAR(50) NOT NULL DEFAULT 'admin',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP,
  "lastLoginAt" TIMESTAMP,
  "emailVerified" BOOLEAN DEFAULT false,
  "twoFactorSecret" VARCHAR(255),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_username ON "AdminUsers"("username");
CREATE INDEX idx_admin_email ON "AdminUsers"("email");
CREATE INDEX idx_admin_role ON "AdminUsers"("role");
```

### Roles

- **master** - Full system access, can manage other admins
- **admin** - Standard administrative access
- **viewer** - Read-only access to admin panel

---

## Configuration

### Environment Variables

```bash
# Security Service
SECURITY_PORT=9102
ADMIN_API_SECRET=<64-char-hex>
ADMIN_JWT_SECRET=<64-char-hex>
INTERNAL_GATEWAY_TOKEN=<64-char-hex>

# Master Admin Bootstrap
MASTER_ADMIN_USERNAME=admin
MASTER_ADMIN_EMAIL=admin@example.com
MASTER_ADMIN_PASSWORD=<strong-password>

# Database
ADMIN_DB_URL=postgres://user:pass@postgres:5432/admin

# IP Security
ADMIN_ALLOWED_IPS=127.0.0.1,::1
ADMIN_ALLOWED_IP_RANGES=192.168.0.0/16,10.0.0.0/8

# 2FA (Optional)
ENABLE_ADMIN_2FA=false

# Rate Limiting
ADMIN_LOGIN_MAX_ATTEMPTS=5
ADMIN_LOGIN_WINDOW_MS=900000

# Session
ADMIN_SESSION_TIMEOUT_MS=600000
```

---

## Deployment

### Production Checklist

- [ ] Generate strong secrets (64-char hex minimum)
- [ ] Configure ADMIN_DB_URL with production credentials
- [ ] Set MASTER_ADMIN_* environment variables
- [ ] Enable TLS/HTTPS (required for secure cookies)
- [ ] Configure IP whitelist if applicable
- [ ] Set up Mailgun domain and API key
- [ ] Enable audit logging
- [ ] Configure monitoring and alerts
- [ ] Test all authentication flows
- [ ] Verify CSRF protection is enabled
- [ ] Check rate limiting configuration
- [ ] Review security headers (helmet.js)

### Master Admin Bootstrap

On first startup, the security service automatically creates the master admin if none exists:

```javascript
// Automatic master admin creation
if (!(await AdminUser.findOne({ where: { role: 'master' } }))) {
  await AdminUser.create({
    username: process.env.MASTER_ADMIN_USERNAME,
    email: process.env.MASTER_ADMIN_EMAIL,
    passwordHash: await bcrypt.hash(process.env.MASTER_ADMIN_PASSWORD, 12),
    role: 'master',
    isActive: true,
    emailVerified: true
  });
  console.log('[Bootstrap] Master admin created');
}
```

---

## Security Best Practices

1. **Credentials:**
   - Never use default passwords in production
   - Rotate secrets regularly (quarterly)
   - Use environment variables, never hardcode

2. **Network:**
   - Use IP whitelisting when possible
   - Enable TLS 1.3 minimum
   - Configure firewall rules

3. **Monitoring:**
   - Set up alerts for failed logins
   - Monitor IP anomalies
   - Review audit logs regularly

4. **Access Control:**
   - Follow principle of least privilege
   - Use viewer role for read-only access
   - Limit master admin accounts

5. **Email:**
   - Verify Mailgun domain (SPF/DKIM)
   - Monitor email delivery rates
   - Use separate email for admin notifications

---

**Document Version:** 2.0
**Last Updated:** March 13, 2026
**Maintained By:** Security Team
