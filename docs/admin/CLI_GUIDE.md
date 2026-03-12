# CLI Guide

The Milonexa CLI is a powerful command-line tool for administration. Located in `admin/cli/index.js`, it provides complete control over the platform with both interactive and scripted command modes.

## Starting the CLI

```bash
cd admin/cli
node index.js
```

First time:
```
Welcome to Milonexa Admin CLI v2.0.0
=====================================

Username: administrator
Password: ••••••••••
Enter OTP (if 2FA enabled): 123456

✓ Successfully authenticated!
✓ Session expires in 30m at 14:35:00

milonexa>
```

## Interactive vs Command Mode

### Interactive Mode
```bash
cd admin/cli && node index.js
# Provides interactive prompt, command history, autocomplete
```

### Command Mode (Scripting)
```bash
node index.js users list --role admin --status active --format json
# Executes command without interactive prompt, outputs to stdout
```

### Chaining Commands
```bash
# Bash script
node index.js users list --format json | jq '.users | length'
node index.js system status && docker restart api-gateway
```

## Authentication

### Login
First login stores encrypted session in `~/.milonexa-admin/session.json`:
```bash
milonexa> login
Username: administrator
Password: ••••••••••
Authenticating... ✓
Session expires in 30m
```

### Session Persistence
- Sessions persist across CLI restarts (until expiration)
- Session file is encrypted with PBKDF2
- IP address must match for session reuse
- Automatic refresh of token 5 minutes before expiration

### Logout
```bash
milonexa> logout
✓ Session revoked
```

### Two-Factor Authentication
If 2FA enabled:
```bash
Login successful, but 2FA required
Enter 6-digit code from authenticator: 123456
✓ 2FA verified
```

## Command Categories

### USERS Commands

#### List users
```bash
milonexa> users list
milonexa> users list --page 2 --limit 50
milonexa> users list --role admin --status active
milonexa> users list --search "john" --format table

Options:
  --page              Page number (default: 1)
  --limit             Results per page (default: 25)
  --role              Filter by role: user, moderator, admin
  --status            Filter by status: active, suspended, deleted
  --search            Search username/email/display name
  --format            Output format: table, json, csv (default: table)
```

Example output (table):
```
┌─────────────────────────────────────────┬─────────────────────┬────────────┐
│ Username                                │ Email               │ Status     │
├─────────────────────────────────────────┼─────────────────────┼────────────┤
│ johndoe                                 │ john@example.com    │ active     │
│ janedoe                                 │ jane@example.com    │ active     │
│ spamuser                                │ spam@bot.local      │ suspended  │
└─────────────────────────────────────────┴─────────────────────┴────────────┘
Total: 52 users, Page 1 of 3
```

#### Get user details
```bash
milonexa> users get <userId>
milonexa> users get f47ac10b-58cc-4372-a567-0e02b2c3d479

Output:
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "username": "johndoe",
  "email": "john@example.com",
  "displayName": "John Doe",
  "role": "user",
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z",
  "lastLogin": "2024-12-15T14:22:00Z",
  "emailVerified": true,
  "twoFactorEnabled": false,
  "profilePictureUrl": "https://..."
}
```

#### Ban user
```bash
milonexa> users ban <userId>
milonexa> users ban f47ac10b --reason "spam" --duration 7d

Options:
  --reason             Ban reason (required)
  --duration           Ban duration: 1h, 24h, 7d, 30d, permanent (default: permanent)

Output:
✓ User successfully banned
  Reason: spam
  Duration: 7 days
  User will be notified
```

#### Unban user
```bash
milonexa> users unban <userId>
✓ User suspension lifted
  User can login immediately
```

#### Delete user
```bash
milonexa> users delete <userId>
milonexa> users delete f47ac10b --gdpr

Options:
  --gdpr               Full GDPR deletion (all data)

! WARNING: This operation is irreversible
  - All user data will be permanently deleted
  - All user posts and comments will be deleted
  - User account cannot be recovered

Continue? (y/n): y
✓ User deletion scheduled
  Job ID: del-20241215-001
  Deletion will complete in ~5 minutes
```

#### Export user data
```bash
milonexa> users export <userId>
milonexa> users export f47ac10b --format zip

Output:
✓ Export job started
  Job ID: exp-20241215-001
  Estimated completion: 2 minutes
  Download URL: https://admin.milonexa.local/exports/exp-20241215-001.zip

Download link expires in 24 hours
```

#### Promote user
```bash
milonexa> users promote <userId> --role <role>
milonexa> users promote f47ac10b --role moderator

Options:
  --role               New role: user, moderator, admin (required)

Output:
✓ User role updated
  Previous role: user
  New role: moderator
```

#### View user sessions
```bash
milonexa> users sessions <userId>

Output:
Session ID                              IP Address        Device              Active  Started
──────────────────────────────────────  ─────────────────  ──────────────────  ──────  ────────────────
a1b2c3d4e5f6...                         192.168.1.100     Chrome (Mac)        ✓       2 hours ago
f6e5d4c3b2a1...                         203.0.113.50      iPhone Safari       ✓       30 minutes ago
b2c3d4e5f6a1...                         198.51.100.200    Firefox (Linux)     ✗       3 days ago
```

### CONTENT Commands

#### List content
```bash
milonexa> content list
milonexa> content list --type post --status flagged
milonexa> content list --flagged

Options:
  --type               Content type: post, comment, blog, video, story
  --status             Status: published, flagged, removed, archived
  --flagged            Show only flagged content
  --format             Output format: table, json, csv

Output:
┌──────────────────┬──────────────────────────────────────┬────────────┬─────────┐
│ ID               │ Title / Preview                      │ Author     │ Status  │
├──────────────────┼──────────────────────────────────────┼────────────┼─────────┤
│ c1b2a3d4         │ "Check out my new blog post..."      │ johndoe    │ flagged │
│ d4e5f6a7         │ "This weekend was amazing!"          │ janedoe    │ removed │
└──────────────────┴──────────────────────────────────────┴────────────┴─────────┘
```

#### Delete content
```bash
milonexa> content delete <contentId>
milonexa> content delete c1b2a3d4 --type post --reason spam

Options:
  --type               Content type (required for accuracy)
  --reason             Deletion reason

Output:
✓ Content deleted
  ID: c1b2a3d4
  Type: post
  Reason: spam
```

#### Flag content
```bash
milonexa> content flag <contentId> --reason "hate speech"

Options:
  --reason             Flag reason (required)

Output:
✓ Content flagged
  ID: c1b2a3d4
  Reason: hate speech
  Added to moderation queue
```

#### Approve content
```bash
milonexa> content approve <contentId>

Output:
✓ Content approved
  Removed from moderation queue
  Now published
```

### SYSTEM Commands

#### System status
```bash
milonexa> system status

Output:
System Status Report
═══════════════════════════════════════

Overall Health: DEGRADED ⚠

Services:
  api-gateway          ✓ UP    Response: 145ms  CPU: 25%  Memory: 512 MB
  user-service         ✓ UP    Response: 89ms   CPU: 15%  Memory: 256 MB
  content-service      ✗ DOWN  Last seen: 5m ago
  messaging-service    ✓ UP    Response: 234ms  CPU: 45%  Memory: 1.2 GB
  ai-service           ✓ UP    Response: 567ms  CPU: 78%  Memory: 3.5 GB

Database:
  PostgreSQL           ✓ UP    Connections: 45/100
  Redis                ✓ UP    Memory: 512 MB / 1 GB
  Elasticsearch        ✓ UP    Documents: 5.2M

Uptime: 45 days 3 hours 22 minutes
```

#### System health
```bash
milonexa> system health

Output:
Detailed Health Check
════════════════════════════════════════

✓ api-gateway
  Status: UP
  Latency: 145ms (avg)
  Error rate: 0.1% (within SLA)
  Database: Connected, 45 connections
  Cache: Connected, 512MB used
  CPU: 25%, Memory: 512MB / 2GB

✓ user-service
  Status: UP
  Latency: 89ms (avg)
  Error rate: 0.05%
  Database: Connected, 12 connections
  Cache: Connected, 128MB used
  CPU: 15%, Memory: 256MB / 512MB

[More services listed...]
```

#### Metrics
```bash
milonexa> system metrics
milonexa> system metrics --service api-gateway

Options:
  --service            Specific service to monitor
  --time-range         7d, 30d, 90d (default: 7d)

Output:
Metrics for api-gateway (last 7 days)
════════════════════════════════════════

Request Rate:      1,245 req/sec (avg)
Latency (p50):     145ms
Latency (p95):     385ms
Latency (p99):     789ms
Error Rate:        0.12%
Success Rate:      99.88%
Throughput:        67 TB processed
```

#### Restart service
```bash
milonexa> system restart content-service

Options:
  --wait               Wait for restart to complete (default: false)

Output:
Restarting content-service...
✓ Service restarted successfully
  Previous uptime: 8 days 2 hours
  New start time: 2024-12-15 15:42:00
```

#### View logs
```bash
milonexa> system logs api-gateway
milonexa> system logs api-gateway --lines 100 --follow

Options:
  --lines              Number of lines (default: 50)
  --follow             Follow log updates (like tail -f)
  --level              Filter by level: debug, info, warn, error
  --search             Search log messages

Output:
2024-12-15T15:42:03Z [INFO]  Server started on port 8000
2024-12-15T15:42:05Z [INFO]  Database connected: 10 connections
2024-12-15T15:42:12Z [DEBUG] Request: GET /api/users (user: admin)
2024-12-15T15:42:13Z [INFO]  Response: 200 OK (145ms)
```

#### Backup
```bash
milonexa> system backup
milonexa> system backup --type full

Options:
  --type               full, database, files (default: full)

Output:
✓ Backup started
  ID: backup-20241215-001
  Type: full
  Size estimate: 150 GB
  Estimated duration: 45 minutes
  Current progress: 23%
```

#### Restore
```bash
milonexa> system restore <backupId>
milonexa> system restore backup-20241215-001

! WARNING: Restore will overwrite current data
  Backup date: 2024-12-15 14:30:00
  Size: 145 GB

Continue? (y/n): y
✓ Restore started
  ID: restore-20241215-001
  Progress: 12%
```

### ALERTS Commands

#### List alerts
```bash
milonexa> alerts list
milonexa> alerts list --severity critical --status active

Options:
  --severity           critical, high, medium, low
  --status             active, acknowledged, resolved

Output:
┌────────────────────────────┬──────────┬──────────┬────────────────┐
│ Alert                      │ Severity │ Service  │ Triggered      │
├────────────────────────────┼──────────┼──────────┼────────────────┤
│ High Memory Usage          │ HIGH     │ ai-srv   │ 5 mins ago     │
│ Database Slow Queries      │ MEDIUM   │ postgres │ 23 mins ago    │
│ API Response Time High     │ HIGH     │ api-gw   │ 1 hour ago     │
└────────────────────────────┴──────────┴──────────┴────────────────┘
```

#### Acknowledge alert
```bash
milonexa> alerts ack <alertId>

Output:
✓ Alert acknowledged
  Alert: High Memory Usage
  Acknowledged by: administrator
  Time: 2024-12-15 15:45:00
```

#### Resolve alert
```bash
milonexa> alerts resolve <alertId>

Output:
✓ Alert resolved
  Alert: Database Slow Queries
  Resolved at: 2024-12-15 15:46:00
```

#### Create alert
```bash
milonexa> alerts create
> Alert title: Payment Service Down
> Severity (critical/high/medium/low): critical
> Message: Payment service is not responding
✓ Alert created
  ID: alert-20241215-001
```

### FEATURES Commands

#### List feature flags
```bash
milonexa> features list

Output:
┌─────────────────────┬────────┬──────────────┬─────────────────┐
│ Feature             │ Status │ Rollout %    │ Target Users    │
├─────────────────────┼────────┼──────────────┼─────────────────┤
│ ai_chat             │ ON     │ 100%         │ All users       │
│ new_ui_design       │ ON     │ 50%          │ Beta testers    │
│ semantic_search     │ OFF    │ 0%           │ None            │
│ shop                │ ON     │ 100%         │ All users       │
└─────────────────────┴────────┴──────────────┴─────────────────┘
```

#### Enable feature
```bash
milonexa> features enable ai_chat

Output:
✓ Feature enabled
  Feature: ai_chat
  Rollout: 100%
  Enabled for: All users
```

#### Disable feature
```bash
milonexa> features disable semantic_search

Output:
✓ Feature disabled
  Feature: semantic_search
  Rollout: 0%
```

#### Rollout feature
```bash
milonexa> features rollout new_ui_design --percentage 75

Output:
✓ Rollout updated
  Feature: new_ui_design
  Rollout: 75%
  Approximately 750,000 users affected
```

### DATABASE Commands

#### Run query
```bash
milonexa> db query "SELECT COUNT(*) as user_count FROM users WHERE status = 'active'"

Output:
user_count
──────────
1245789

! Note: Direct database queries require admin role and are logged
```

#### Migrations
```bash
milonexa> db migrations list

Output:
Applied Migrations:
────────────────────
✓ 001_initial_schema.sql                 2024-01-01 10:00:00
✓ 002_add_user_roles.sql                 2024-02-15 14:30:00
✓ 003_create_admin_tables.sql            2024-03-10 09:15:00

Pending Migrations:
──────────────────
○ 004_add_content_search_index.sql

milonexa> db migrations run
✓ Migration applied: 004_add_content_search_index.sql
```

### GDPR Commands

#### Export user data
```bash
milonexa> gdpr export <userId>

Output:
✓ Export scheduled
  User: johndoe (john@example.com)
  Job ID: gdpr-exp-20241215-001
  Status: Processing
  Download URL: https://admin.local/gdpr/gdpr-exp-20241215-001.zip
  Expires: 2024-12-22
```

#### Delete user data
```bash
milonexa> gdpr delete <userId>

! WARNING: This will permanently delete ALL user data
  - Profile and account
  - All posts and comments
  - All messages and conversations
  - All personal data
  - Action CANNOT be reversed

User ID: f47ac10b
Username: johndoe
Email: john@example.com

Continue? (y/n): y
✓ Deletion scheduled
  Job ID: gdpr-del-20241215-001
  Will complete in ~10 minutes
  User will be notified
```

#### List GDPR requests
```bash
milonexa> gdpr requests list

Output:
┌──────────────────┬──────────────────┬──────────┬──────────────────┐
│ Request ID       │ User Email       │ Type     │ Status           │
├──────────────────┼──────────────────┼──────────┼──────────────────┤
│ gdpr-exp-001     │ john@example.com │ Export   │ Completed        │
│ gdpr-del-002     │ jane@example.com │ Deletion │ Processing       │
└──────────────────┴──────────────────┴──────────┴──────────────────┘
```

### AI Commands

#### Analyze
```bash
milonexa> ai analyze
milonexa> ai analyze --type anomaly

Options:
  --type               anomaly, compliance, cost

Output:
Analysis Results
════════════════════════════════════════

[Anomaly Analysis]
✓ API latency spike detected
  Service: user-service
  Severity: Medium
  Confidence: 87%
  Recommendation: Check database connection pool

⚠ Unusual user registration pattern
  Spike in new accounts from region: IN
  Pattern confidence: 73%
  Recommendation: Monitor for bot activity
```

#### Remediate
```bash
milonexa> ai remediate <issueId>

Output:
Executing remediation...
1. Attempting automatic restart of user-service
   Status: ✓ Success
   Duration: 45 seconds
   
2. Checking latency after restart
   Previous: 1245ms
   Current: 185ms
   Status: ✓ Resolved

✓ Remediation completed successfully
```

#### Report
```bash
milonexa> ai report
milonexa> ai report --period weekly

Options:
  --period             daily, weekly, monthly

Output:
AI Analysis Report - Weekly Summary
════════════════════════════════════

Anomalies Detected: 12
- Critical: 1
- High: 3
- Medium: 8

Top Issues:
1. API latency spike (50th percentile)
2. Database slow queries (3 instances)
3. Memory usage trend (upward)

Recommendations:
[List of 15 actionable recommendations]
```

## Output Formats

### Table Format (default)
```bash
milonexa> users list --format table
```
Pretty-printed, colored table output suitable for human reading.

### JSON Format
```bash
milonexa> users list --format json
```
Structured JSON output for scripting and automation.

### CSV Format
```bash
milonexa> users list --format csv
```
Comma-separated values for Excel/spreadsheet import.

## Role Restrictions

Each command documents minimum required role:

- **Viewer**: `users list`, `content list`, `system status`, `alerts list`
- **Operator**: Viewer + `users ban`, `content delete`, `alerts ack`
- **Admin**: Operator + `users promote`, `system restart`, `db query`
- **Break-Glass**: Admin + all dangerous operations

Example:
```bash
milonexa> db query "..."
✗ Access Denied
  Minimum role: admin
  Your role: operator
  Required approval: None
  
  Request elevated privileges? (y/n)
  [Initiates break-glass request]
```

## Audit Logging

All CLI commands are automatically logged:
```bash
milonexa> system audit --search "users ban"

Output:
Audit Log Results
═════════════════
2024-12-15 15:42:00 | administrator | users ban          | OK
  User ID: f47ac10b
  Reason: spam
  Duration: 7 days
  
2024-12-15 14:15:00 | moderator1    | users ban          | OK
  User ID: a1b2c3d4
  Reason: harassment
  Duration: permanent
```

## Command History and Autocomplete

- Up/Down arrows: Cycle through command history
- Tab completion: Complete command names and options
- Ctrl+R: Search command history
- Ctrl+L: Clear screen
- `help <command>`: Show detailed help for command

```bash
milonexa> users <TAB>
  ban       delete    export    get       list      promote   sessions  unban

milonexa> users ban --<TAB>
  --duration  --reason

milonexa> users list --status <TAB>
  active      deleted     suspended
```

## Scripting Examples

### Suspend all inactive users
```bash
#!/bin/bash
INACTIVE_DAYS=90
CUTOFF=$(date -d "$INACTIVE_DAYS days ago" +%Y-%m-%d)

node admin/cli/index.js users list --format json | \
  jq ".users[] | select(.lastLogin < \"$CUTOFF\") | .id" | \
  while read uid; do
    node admin/cli/index.js users ban "$uid" --reason "inactive" --duration 30d
  done
```

### Daily health check
```bash
#!/bin/bash
node admin/cli/index.js system status --format json | \
  jq '.services[] | select(.status != "UP") | .name' | \
  while read service; do
    node admin/cli/index.js alerts create \
      --title "Service Down: $service" \
      --severity critical \
      --message "Service is not responding"
  done
```

### Monthly compliance report
```bash
#!/bin/bash
node admin/cli/index.js gdpr requests list --format json > \
  gdpr-requests-$(date +%Y-%m).json
  
node admin/cli/index.js system audit --format csv > \
  audit-log-$(date +%Y-%m).csv
  
echo "Compliance report generated"
```

---

Last Updated: 2024 | Milonexa Platform Documentation
