# Admin System Overview

The Milonexa admin system provides comprehensive platform management capabilities through 8 different interfaces, all backed by a unified security and audit infrastructure.

## The 8 Admin Interfaces

### 1. Web Dashboard
A responsive React-based dashboard accessible at http://localhost:3001. Provides visual interface to all admin functions including user management, content moderation, system monitoring, and configuration.

**When to use**: When you need visual interface, detailed dashboards with charts, or managing multiple items at once.

### 2. CLI (Command Line Interface)
A powerful command-line tool for terminal-based administration. Located in `admin/cli/index.js`, allows scripting and automation of admin tasks.

**When to use**: Scripting, automation, CI/CD integration, quick commands without GUI overhead.

### 3. SSH TUI (Terminal User Interface)
Terminal UI dashboard accessible over SSH on port 2222. Provides navigation-friendly interface for remote administration.

**When to use**: Remote server management, environments without graphical access, troubleshooting over SSH.

### 4. REST API
Programmatic HTTP API on port 8888 allowing integration with external systems.

**When to use**: Third-party integrations, automated tooling, programmatic access.

### 5. AI Agent
Autonomous AI system that performs admin tasks automatically. Analyzes alerts, identifies issues, and applies remediation.

**When to use**: Automated remediation, complex analysis, 24/7 monitoring.

### 6. Bots
Integration with Slack, Telegram, and Microsoft Teams for chat-based admin commands.

**When to use**: Team communication, quick alerts, mobile administration.

### 7. Webhooks
Event-driven notifications sent to configured endpoints when admin events occur.

**When to use**: External system notifications, logging to third-party services.

### 8. Email
Admin commands via email. Send specially formatted emails to admin@milonexa.local to execute commands.

**When to use**: When other interfaces are unavailable, audit trail via email, mobile-friendly.

## Admin Security Architecture

### Security-Service (Port 9102)
All admin interfaces use the security-service as the central authentication and authorization provider. The security-service:

- Validates JWT tokens for API and Web Dashboard access
- Manages admin user accounts in a separate admin database
- Enforces RBAC policies
- Validates OTP for two-factor authentication
- Logs all authentication attempts
- Manages API keys for programmatic access

The security-service uses:
- RSA-2048 for JWT signing (not HMAC)
- Bcrypt with 12 rounds for password hashing
- Separate encryption key for admin credentials
- Hardware security module (HSM) integration support in production

### Admin Database
The admin database is separate from the main application database and contains:
- Admin user accounts
- Session tokens
- OAuth provider integrations
- API keys
- Two-factor authentication secrets
- Admin audit logs

Access to admin database is restricted to:
- Security-service (read/write)
- Admin-service (read-only for audit logs)
- Authorized services with API keys

## RBAC Roles and Permissions

### Viewer Role
Read-only access to all dashboards, reports, logs, and monitoring data.

**Permissions**:
- View all user profiles and settings
- View content and moderation queue
- View audit logs and security events
- View system health and metrics
- View feature flags and configuration (read-only)

**Restrictions**:
- Cannot modify any data
- Cannot perform any actions
- Cannot view API keys or secrets

**Use case**: Analysts, customer support reviewing data, read-only monitoring.

### Operator Role
Can execute safe operational tasks. Escalates dangerous operations to admins.

**Permissions**:
- All Viewer permissions
- Ban/suspend users (with reason)
- Remove content and approve pending moderation
- Acknowledge alerts
- Restart services (non-breaking)
- View basic logs
- Export user data (GDPR)
- Create and manage webhooks

**Restrictions**:
- Cannot delete user data (irreversible)
- Cannot modify platform configuration
- Cannot create new admins
- Cannot view secrets
- Cannot execute direct database queries
- Cannot access break-glass mode

**Use case**: Moderators, support staff, junior administrators.

### Admin Role
Full access to all admin functions. Responsible for system configuration and policy enforcement.

**Permissions**:
- All Operator permissions
- Create and delete other admins (except super-admins)
- Modify platform configuration
- Enable/disable features and services
- View and rotate API keys
- Modify alert thresholds and rules
- Perform database migrations
- Create and manage service accounts
- Configure OAuth providers
- Manage SSL certificates
- View all logs including internal service logs

**Restrictions**:
- Dangerous operations (full database access) require break-glass
- Cannot create super-admin accounts
- Cannot access HSM operations
- Cannot modify audit log retention policies

**Use case**: Platform administrators, DevOps engineers, system operators.

### Break-Glass Role
Emergency override access for critical incidents. Requires dual approval from two super-admins.

**Permissions**:
- All Admin permissions
- Direct database access (all queries)
- Modify audit logs
- Bypass rate limits and security policies
- Perform emergency service restarts
- Access cryptographic keys
- Create super-admin accounts

**Restrictions**:
- All actions require logging and two-person approval
- Cannot be held for more than 15 minutes
- Requires incident justification
- Generates alert to security team
- Cannot be used remotely (requires local access in production)

**Use case**: Critical incident response, security team operations, emergency recovery.

## Admin Account Creation and Management

### Creating the First Admin Account
During platform initialization, create the first admin account:

```bash
cd admin/setup
node create-admin.js \
  --username administrator \
  --email admin@company.local \
  --password "$(openssl rand -base64 32)" \
  --role admin
```

This creates an account with:
- Username and email (unique)
- Bcrypt-hashed password
- Initial role (typically admin)
- Randomly generated session token

### Creating Additional Admin Accounts
Via Web Dashboard → Settings → Admins:
1. Click "Create Admin"
2. Enter email address
3. Select role (Viewer, Operator, Admin)
4. Invitation link sent to email
5. New admin completes signup and sets password

Or via CLI:
```bash
admin create-admin --email newadmin@company.local --role operator
```

Or via REST API:
```bash
POST /api/admin/admins
{
  "email": "newadmin@company.local",
  "role": "operator"
}
```

### Admin Account Properties
- **username**: Unique identifier (alphanumeric + underscore)
- **email**: Must be valid and verified
- **role**: One of viewer, operator, admin, break-glass
- **password**: Bcrypt-hashed, minimum 12 characters
- **twoFactorEnabled**: Boolean, defaults to false
- **twoFactorSecret**: TOTP secret (if 2FA enabled)
- **lastLogin**: Timestamp of most recent login
- **createdAt**: Account creation timestamp
- **status**: active, disabled, or locked
- **passwordExpiresAt**: Timestamp when password expires (null if no expiration)

### Session Management
Admin sessions:
- JWT tokens valid for 30 minutes
- Refresh tokens valid for 7 days
- IP address locked (cannot use token from different IP)
- Device fingerprinting to prevent token theft
- Can manually revoke all sessions for an admin account

Sessions are stored in Redis and invalidated when:
- Admin logs out
- Admin password changes
- All sessions revoked
- Token expires
- IP address changes

## Authentication Flow

### Web Dashboard Login
1. User navigates to http://localhost:3001
2. Enters username/email and password
3. Frontend POST /api/admin/auth/login with credentials
4. Security-service validates against admin database
5. If 2FA enabled, prompts for OTP (TOTP via Google Authenticator)
6. Returns JWT access token + refresh token
7. Frontend stores JWT in secure httpOnly cookie
8. User authenticated for 30 minutes

### CLI Authentication
```bash
cd admin/cli
node index.js

> Enter username: administrator
> Enter password: ••••••••••
> Successfully authenticated! Session expires in 30m.
```

Session stored in `~/.milonexa-admin/session.json` (encrypted). Automatically refreshed on expiration.

### REST API Authentication
```bash
curl -X POST http://localhost:8888/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "administrator",
    "password": "your-password"
  }'

# Returns:
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIs...",
  "expiresIn": 1800,
  "role": "admin"
}

# Use access token in subsequent requests:
curl -X GET http://localhost:8888/api/admin/users \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..."
```

### SSH TUI Authentication
```bash
ssh admin@localhost -p 2222
admin@localhost's password: ••••••••••
# TUI interface displays
```

SSH keys supported as alternative to password.

## Security-Service Details

### Location and Configuration
- Service: `services/security-service/`
- Port: 9102 (internal-only, not exposed to internet)
- Authentication: Uses internal gateway token (INTERNAL_GATEWAY_TOKEN env var)
- Database: Separate PostgreSQL database

### Key Responsibilities
- User authentication and session management
- JWT token generation and validation
- RBAC policy enforcement
- OTP/2FA verification
- API key management
- Admin audit logging
- Credential encryption/decryption

### Cryptographic Implementation
- **JWT Signing**: RSA-2048 with SHA-256
- **Password Hashing**: Bcrypt with 12 rounds
- **Credential Encryption**: AES-256-GCM with unique IV per credential
- **Session Token**: 32-byte random token, securely hashed
- **2FA**: Time-based One-Time Password (TOTP), 6-digit code, 30-second window

### Admin Database Schema
```sql
-- Admin users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- viewer, operator, admin, break-glass
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret VARCHAR(255),
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  password_expires_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active' -- active, disabled, locked
);

-- Admin sessions table
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES admin_users(id),
  token_hash VARCHAR(255) NOT NULL,
  ip_address INET NOT NULL,
  user_agent VARCHAR(500),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP
);

-- Admin API keys table
CREATE TABLE admin_api_keys (
  id UUID PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES admin_users(id),
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  last_used TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP
);

-- Audit log table
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY,
  admin_id UUID REFERENCES admin_users(id),
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent VARCHAR(500),
  status VARCHAR(50), -- success, failure, denied
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Immutable: use append-only pattern
  CONSTRAINT audit_log_immutable CHECK (id IS NOT NULL)
);
```

## Admin Audit Log

Every single admin action is immutably logged to the audit trail. This is implemented in `admin/shared/audit.js` and provides:

### Audit Log Entry Structure
```json
{
  "id": "uuid",
  "adminId": "uuid",
  "action": "user_banned",
  "resourceType": "user",
  "resourceId": "uuid",
  "changes": {
    "status": { "from": "active", "to": "suspended" },
    "bannedReason": "spam",
    "bannedUntil": "2025-12-31T23:59:59Z"
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "status": "success",
  "errorMessage": null,
  "createdAt": "2024-12-15T10:30:00Z"
}
```

### Audit Log Immutability
- Append-only table (no UPDATE or DELETE)
- Cryptographic hash chain (each entry includes hash of previous)
- Can only be deleted by break-glass with 2-person approval
- Exported to immutable storage (S3 with object lock) for long-term retention
- Searchable via Web Dashboard and API

### Audit Log Retention
- Stored in database for 90 days
- Exported to S3 with indefinite retention
- Compliance level (GDPR): user data deleted, audit records preserved
- Search: Web Dashboard → Audit Log tab

## Shared Admin Modules

Located in `admin/shared/`, these modules are used by all admin interfaces:

### MetricsManager (metrics.js)
Provides system health metrics and performance data.
- CPU, memory, disk usage per service
- HTTP request rate, latency, error rate
- Database connection pool metrics
- Redis memory and hit rate
- Active WebSocket connections
- Queue depths and processing rates

Usage:
```javascript
const MetricsManager = require('../shared/metrics');
const metrics = await MetricsManager.getSystemMetrics();
```

### AlertManager (alerts.js)
Manages system alerts and notifications.
- Alert creation, acknowledgment, resolution
- Alert severities: critical, high, medium, low
- Configurable thresholds
- Webhook notifications
- Email and Slack integration

Usage:
```javascript
const AlertManager = require('../shared/alerts');
await AlertManager.createAlert({
  title: 'High memory usage',
  severity: 'high',
  service: 'api-gateway',
  value: 92
});
```

### SLAManager (sla.js)
Service level agreement tracking.
- Uptime % calculation per service
- MTTR (Mean Time To Recovery)
- MTTF (Mean Time To Failure)
- Breach prediction (30-minute advance warning)
- SLA report generation

Usage:
```javascript
const SLAManager = require('../shared/sla');
const slas = await SLAManager.calculateSLA('user-service', { days: 30 });
```

### ComplianceManager (compliance.js)
GDPR and regulatory compliance.
- Data export generation
- Data deletion with audit trail
- Consent management
- Privacy policy tracking
- Audit report generation

Usage:
```javascript
const ComplianceManager = require('../shared/compliance');
await ComplianceManager.exportUserData(userId);
```

### CostAnalyzer (cost-analyzer.js)
Infrastructure cost tracking and forecasting.
- Per-service resource costs
- Monthly cost breakdown
- Cost trend analysis
- Budget forecasting
- Cost optimization recommendations

Usage:
```javascript
const CostAnalyzer = require('../shared/cost-analyzer');
const forecast = await CostAnalyzer.forecastMonthly();
```

### TenantManager (tenant-manager.js)
Multi-tenancy support for enterprise deployments.
- Tenant isolation verification
- Resource quotas per tenant
- Tenant billing and usage tracking
- Tenant onboarding/offboarding

Usage:
```javascript
const TenantManager = require('../shared/tenant-manager');
const tenant = await TenantManager.getTenant(tenantId);
```

### FeatureFlags (feature-flags.js)
Feature flag management.
- Toggle features on/off
- Gradual rollouts (percentage-based)
- User and role-based flags
- Feature analytics

Usage:
```javascript
const FeatureFlags = require('../shared/feature-flags');
if (await FeatureFlags.isEnabled('ai_chat', userId)) {
  // Feature enabled for this user
}
```

### AIIntegration (ai-integration.js)
AI service integration for analysis and remediation.
- Anomaly detection
- Automated remediation suggestions
- Log analysis
- Predictive maintenance

Usage:
```javascript
const AIIntegration = require('../shared/ai-integration');
const analysis = await AIIntegration.analyzeAnomalies();
```

### Runbook (runbook.js)
Automated runbook execution for common incidents.
- Runbook templates
- Execution history
- Runbook status tracking
- Integration with incident management

Usage:
```javascript
const Runbook = require('../shared/runbook');
await Runbook.execute('high_memory_response');
```

### ChangeLog (change-log.js)
Platform change history and deployment tracking.
- Version history
- Deployment records
- Rollback capability
- Change impact analysis

Usage:
```javascript
const ChangeLog = require('../shared/change-log');
const changes = await ChangeLog.getSince(date);
```

### Webhooks (webhooks.js)
Webhook management and delivery.
- Register webhook endpoints
- Delivery retry logic
- Signature verification
- Delivery logs and status

Usage:
```javascript
const Webhooks = require('../shared/webhooks');
await Webhooks.send('user.banned', { userId, reason });
```

### GDPRManager (gdpr.js)
GDPR compliance and data rights.
- Right to access (data export)
- Right to erasure (data deletion)
- Right to portability
- Consent tracking
- Privacy policy versioning

Usage:
```javascript
const GDPRManager = require('../shared/gdpr');
await GDPRManager.deleteAllUserData(userId);
```

### AnomalyDetector (anomaly.js)
ML-based anomaly detection for system monitoring.
- Statistical baseline calculation
- Anomaly scoring
- Alert generation
- Pattern recognition

Usage:
```javascript
const AnomalyDetector = require('../shared/anomaly');
const anomalies = await AnomalyDetector.detect('api_latency');
```

### RemediationEngine (remediation.js)
Automated remediation for detected issues.
- Remediation rule evaluation
- Action execution (restart service, scale pods, etc.)
- Remediation history
- Success/failure tracking

Usage:
```javascript
const RemediationEngine = require('../shared/remediation');
await RemediationEngine.remediate('high_memory_usage', metrics);
```

## Multi-Tenancy Support

For enterprise deployments with multiple organizations, TenantManager provides:
- Complete tenant isolation (data, resources, API quotas)
- Separate admin accounts per tenant
- Tenant-specific configuration
- Cross-tenant security enforcement
- Tenant usage metering and billing

Each tenant has:
- Separate database schema (or row-level security)
- Separate Redis key prefix
- Separate admin accounts and RBAC policies
- Separate feature flag configuration
- Separate API rate limits and quotas

## SLA Monitoring and Breach Prediction

SLAManager tracks:
- **Uptime %**: Calculated from successful API responses and health checks
- **MTTR**: Time from incident detection to service restoration
- **MTTF**: Time between failures (mean time to failure)
- **Breach Prediction**: ML model predicts if SLA will be breached in next 30 minutes

Predictions are based on:
- Current error rate and latency trends
- Historical incident patterns
- Resource utilization metrics
- Pending deployments or changes

SLA breaches trigger:
- Email notification to operations team
- PagerDuty alert
- Slack/Teams notification
- Automatic remediation attempt
- Incident creation in issue tracker

## Cost Analysis and Forecasting

CostAnalyzer tracks:
- AWS/GCP/Azure resource costs
- Hourly billing for compute, storage, networking
- Cost per service and per tenant
- Monthly cost trends
- Forecasted monthly cost based on trends

Cost recommendations:
- Unused resources (recommendations to delete)
- Right-sizing opportunities (underutilized instances)
- Reserved instance suggestions
- Cost optimization for specific services

Export cost reports:
```bash
admin cost-report --period monthly --service api-gateway --format csv
```

## GDPR Compliance Tools

GDPRManager enables:
- **Data Export**: Complete user data download (all posts, profiles, messages, etc.)
- **Data Deletion**: Permanent deletion of all user data
- **Consent Management**: Track user consent for data collection
- **Data Breach Notification**: Automated breach notification process
- **Privacy Policy Versioning**: Track consent per policy version
- **Right to Portability**: Export in standard formats

All GDPR operations:
- Require admin approval
- Are immutably logged
- Generate audit trail
- Can be automated on schedule
- Send confirmation to user email

## Complete Admin System Integration

The admin system integrates across all 8 interfaces:
1. **Web Dashboard**: Visual interface with forms and tables
2. **CLI**: Command-line tool with same functions as API
3. **SSH TUI**: Terminal interface over SSH
4. **REST API**: Programmatic HTTP interface
5. **AI Agent**: Autonomous execution of common tasks
6. **Bots**: Chat-based commands via Slack/Teams/Telegram
7. **Webhooks**: Event-driven notifications
8. **Email**: Email-based command execution

All interfaces:
- Use same authentication (security-service)
- Share same audit logging
- Apply same RBAC policies
- Use shared modules from `admin/shared/`
- Have consistent error handling

---

Last Updated: 2024 | Milonexa Platform Documentation
