# Complete Administrator Guide

> **Comprehensive guide for platform administrators to monitor, manage, and control the Milonexa platform**

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Admin Dashboard Overview](#admin-dashboard-overview)
3. [User Management](#user-management)
4. [Content Moderation](#content-moderation)
5. [System Monitoring](#system-monitoring)
6. [Security Management](#security-management)
7. [Database Management](#database-management)
8. [API Management](#api-management)
9. [Audit Logs](#audit-logs)
10. [Backup & Recovery](#backup--recovery)
11. [Performance Optimization](#performance-optimization)
12. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing Admin Panel

The admin panel is a separate application that runs on port 3001 (by default).

**Prerequisites:**
- Admin or Moderator role
- Valid JWT token
- `ADMIN_API_SECRET` configured in environment

**Access Methods:**

1. **Via Docker Compose Profile:**
```bash
# Start with admin frontend enabled
docker compose --profile admin up -d
```

2. **Navigate to Admin Panel:**
```
http://localhost:3001
# or
http://your-domain.com:3001
```

3. **Login:**
- Use your admin credentials
- System will verify your role (admin/moderator)
- You'll be redirected to the dashboard

### Admin Roles

| Role | Permissions |
|------|------------|
| **Admin** | Full access to all admin features, user management, system settings |
| **Moderator** | Content moderation, flag review, limited user management |
| **User** | No admin access |

---

## Admin Dashboard Overview

The admin dashboard provides real-time insights and management capabilities across 9 tabs:

### 1. Dashboard Tab
**Purpose:** System overview and key metrics

**Features:**
- Total users count
- Active users (last 24 hours)
- Total posts and content
- System uptime
- Recent activity feed
- Performance metrics
- Real-time statistics

**Key Metrics:**
```
Total Users: 1,234
Active Today: 456
Total Posts: 12,345
System Uptime: 99.9%
Memory Usage: 2.4GB / 8GB
CPU Usage: 23%
```

### 2. Users Tab
**Purpose:** Manage platform users

**Features:**
- Search users by username/email
- Filter by role (user/moderator/admin)
- Filter by status (active/banned)
- Edit user roles
- Ban/Unban users
- View user details
- Create admin accounts
- Pagination support

**Actions:**
- **Edit Role:** Change user role (user → moderator → admin)
- **Ban User:** Suspend user access
- **Unban User:** Restore user access
- **View Profile:** See detailed user information

### 3. Moderation Tab
**Purpose:** Review and moderate reported content

**Features:**
- View all content flags/reports
- Filter by status (pending/resolved)
- Review flagged content
- Take action on reports
- Track moderation history

**Flag Types:**
- Spam
- Harassment
- Inappropriate content
- Misinformation
- Copyright violation
- Other

### 4. Audit Logs Tab
**Purpose:** Track all admin actions

**Features:**
- Complete audit trail
- Filter by action type
- Filter by admin user
- View timestamps
- IP address tracking
- User agent logging

**Logged Actions:**
- User role changes
- User bans/unbans
- Content moderation actions
- System settings changes
- Security events

### 5. Database Tab
**Purpose:** Database management and monitoring

**Features:**
- Database statistics
- Table sizes
- Connection pool status
- Backup management
- Query performance
- Index optimization

### 6. System Logs Tab
**Purpose:** View application logs

**Features:**
- Real-time log streaming
- Filter by log level (error/warn/info/debug)
- Search logs
- Export logs
- Service-specific logs

### 7. API Management Tab
**Purpose:** Monitor API health and usage

**Features:**
- API endpoint listing
- Response times
- Error rates
- Rate limiting status
- API keys management

### 8. Security Tab
**Purpose:** Security monitoring and alerts

**Features:**
- Security events log
- Failed login attempts
- Suspicious activity alerts
- IP blacklist management
- Rate limiting configuration

### 9. Settings Tab
**Purpose:** System configuration

**Features:**
- General settings
- Feature toggles
- Email configuration
- OAuth settings
- Storage settings
- Cache configuration

---

## User Management

### Searching Users

1. **Navigate to Users Tab**
2. **Use Search Box:**
   - Enter username or email
   - Results update in real-time
3. **Apply Filters:**
   - Role: All, User, Moderator, Admin
   - Status: All, Active, Banned

### Changing User Roles

**Steps:**
1. Find the user in the Users tab
2. Click **Edit** button next to user
3. Select new role from dropdown:
   - User (default)
   - Moderator (content moderation access)
   - Admin (full admin access)
4. Click **Save**
5. User will have new permissions immediately

**Best Practices:**
- Only promote trusted users to moderator/admin
- Document role changes in internal notes
- Review moderator activity regularly
- Demote inactive moderators

### Banning Users

**When to Ban:**
- Repeated policy violations
- Spam or bot behavior
- Harassment or abuse
- Terms of service violations

**Steps:**
1. Find the user in Users tab
2. Click **Ban** button
3. Confirm action
4. User is immediately logged out
5. User cannot log in until unbanned

**What Happens When Banned:**
- All active sessions terminated
- Cannot log in
- Content remains visible (can be hidden separately)
- Can be unbanned by admin

### Unbanning Users

**Steps:**
1. Filter users by status: "Banned"
2. Find the user
3. Click **Unban** button
4. User can immediately log in again

### Creating Admin Accounts

**Steps:**
1. Click **Create Admin** button
2. Fill in details:
   - Username
   - Email
   - Password (strong password required)
   - Role (admin/moderator)
3. Click **Create**
4. New admin receives credentials via email (if configured)

**Security Considerations:**
- Use strong, unique passwords
- Enable 2FA for admin accounts
- Limit number of admin accounts
- Review admin activity regularly

---

## Content Moderation

### Reviewing Flagged Content

**Workflow:**

1. **View Flags:**
   - Navigate to Moderation tab
   - See all pending flags
   - Each flag shows:
     - Content type (post, comment, message)
     - Reporter
     - Reason
     - Timestamp

2. **Review Content:**
   - Click on flag to view details
   - Read the flagged content
   - Check context (post history, user behavior)
   - Assess severity

3. **Take Action:**
   - **Approve:** Content is fine, dismiss flag
   - **Remove:** Delete the content
   - **Ban User:** Remove content and ban user
   - **Issue Warning:** Send warning to user

4. **Document Decision:**
   - Add moderation notes
   - Select reason for action
   - Save audit trail

### Moderation Guidelines

**Content to Remove:**
- Illegal content
- Explicit harassment or threats
- Spam or commercial solicitation
- Graphic violence or gore
- Explicit sexual content (if prohibited)
- Doxxing or personal information
- Copyright infringement

**Content to Allow:**
- Disagreements or debates
- Satire or parody
- Educational content
- News and current events
- User opinions (even if unpopular)

**Gray Areas:**
- Offensive language (context matters)
- Political content
- Religious discussions
- Controversial opinions

**Best Practices:**
- Be consistent in decisions
- Document reasoning
- Consider context and intent
- Give warnings before bans
- Review appeals fairly

### Mass Moderation

For spam attacks or coordinated violations:

1. Identify pattern (username, content, timing)
2. Filter flags by criteria
3. Select multiple items
4. Apply bulk action
5. Review audit log

---

## System Monitoring

### Health Dashboard

**Key Metrics to Monitor:**

1. **Service Health:**
   - API Gateway: ✅ Running
   - User Service: ✅ Running
   - Content Service: ✅ Running
   - Messaging Service: ✅ Running
   - Media Service: ✅ Running
   - Shop Service: ✅ Running
   - AI Service: ✅ Running
   - Streaming Service: ✅ Running

2. **Database:**
   - PostgreSQL status
   - Connection pool usage
   - Active queries
   - Slow queries
   - Database size

3. **Cache:**
   - Redis status
   - Hit/miss ratio
   - Memory usage
   - Eviction rate

4. **Storage:**
   - MinIO status
   - Storage usage
   - Upload/download bandwidth

### Performance Metrics

**Monitor:**
- Response times (should be < 200ms for most endpoints)
- Error rates (should be < 1%)
- Active connections
- Memory usage
- CPU usage
- Disk I/O

**Alert Thresholds:**
```
Response Time > 1s: Warning
Response Time > 3s: Critical
Error Rate > 5%: Warning
Error Rate > 10%: Critical
Memory Usage > 80%: Warning
Memory Usage > 90%: Critical
```

### Real-Time Monitoring

**Tools:**
- Grafana dashboards (port 3002)
- Prometheus metrics (port 9090)
- Service logs (`docker-compose logs -f`)
- Admin dashboard metrics

**Common Commands:**
```bash
# Check service health
docker-compose ps

# View logs for specific service
docker-compose logs -f user-service

# Check resource usage
docker stats

# View database connections
docker-compose exec postgres psql -U postgres -d letsconnect -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## Security Management

### Security Best Practices

1. **Strong Passwords:**
   - Minimum 12 characters
   - Mix of upper/lowercase, numbers, symbols
   - No dictionary words
   - Change regularly

2. **Two-Factor Authentication:**
   - Enable for all admin accounts
   - Use authenticator app (Google Authenticator, Authy)
   - Store backup codes securely

3. **Access Control:**
   - Principle of least privilege
   - Regular access reviews
   - Revoke unused accounts
   - Monitor admin activity

4. **Secrets Management:**
   - Never commit secrets to git
   - Use environment variables
   - Rotate secrets regularly
   - Use strong random values

### Security Monitoring

**Watch For:**
- Multiple failed login attempts
- Login from unusual locations
- Privilege escalation attempts
- Unusual API activity
- Large data exports
- Mass content creation/deletion

**Security Events Tab:**
- View all security-related events
- Filter by severity
- Investigate suspicious activity
- Block IPs if necessary

### Incident Response

**If Security Breach Detected:**

1. **Immediate Actions:**
   - Isolate affected system
   - Change all admin passwords
   - Rotate JWT secrets
   - Review audit logs

2. **Investigation:**
   - Identify entry point
   - Assess damage
   - Check for backdoors
   - Review all admin actions

3. **Recovery:**
   - Restore from backup if needed
   - Patch vulnerabilities
   - Update dependencies
   - Notify affected users

4. **Prevention:**
   - Document incident
   - Update security procedures
   - Additional monitoring
   - Regular security audits

---

## Database Management

### Database Operations

**Viewing Database Stats:**
1. Navigate to Database tab
2. See:
   - Total database size
   - Table sizes
   - Index sizes
   - Connection count
   - Query performance

### Backup Management

**Automated Backups:**
```bash
# Backups run daily via cron job
# Location: /backups/postgres/

# Manual backup
docker-compose exec postgres pg_dump -U postgres letsconnect > backup_$(date +%Y%m%d).sql
```

**Backup Strategy:**
- Daily automated backups
- Keep 7 daily backups
- Keep 4 weekly backups
- Keep 12 monthly backups
- Store backups off-site

**Restore from Backup:**
```bash
# Stop services
docker-compose down

# Restore database
cat backup_20260309.sql | docker-compose exec -T postgres psql -U postgres letsconnect

# Restart services
docker-compose up -d
```

### Database Optimization

**Regular Maintenance:**
```sql
-- Vacuum to reclaim storage
VACUUM ANALYZE;

-- Reindex to improve performance
REINDEX DATABASE letsconnect;

-- Update statistics
ANALYZE;
```

**Monitoring Slow Queries:**
```sql
-- Enable slow query logging
ALTER DATABASE letsconnect SET log_min_duration_statement = 1000;

-- View slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

---

## API Management

### Monitoring API Health

**Key Metrics:**
- Response times by endpoint
- Error rates
- Request volume
- Rate limiting hits

**Common Endpoints:**
```
GET  /health                    - Health check
GET  /api/user/users            - List users
POST /api/user/register         - User registration
POST /api/user/login            - User login
GET  /api/content/posts         - List posts
POST /api/content/posts         - Create post
GET  /api/messaging/conversations - List conversations
```

### Rate Limiting

**Default Limits:**
- Anonymous: 100 requests/15 min
- Authenticated: 1000 requests/15 min
- Admin: Unlimited

**Adjusting Rate Limits:**
Edit `services/api-gateway/server.js`:
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Adjust this value
  standardHeaders: true,
  legacyHeaders: false,
});
```

### API Keys (Future)

For external integrations:
- Generate API keys
- Set permissions
- Monitor usage
- Revoke if compromised

---

## Audit Logs

### Understanding Audit Logs

Every admin action is logged with:
- **Action:** What was done
- **Admin:** Who did it
- **Target:** Who/what was affected
- **Timestamp:** When it happened
- **IP Address:** Where it came from
- **User Agent:** Browser/client used

### Common Audit Entries

```
[2026-03-09 10:15:32] Admin: john_admin
Action: ROLE_CHANGE
Target: user_123
Details: Changed role from 'user' to 'moderator'
IP: 192.168.1.100
```

```
[2026-03-09 10:20:15] Admin: jane_mod
Action: BAN_USER
Target: spammer_456
Details: Banned for spam
IP: 10.0.0.50
```

### Searching Audit Logs

**Filters:**
- Action type
- Admin user
- Date range
- Target user

**Export Options:**
- CSV export
- JSON export
- PDF report

---

## Backup & Recovery

### Backup Strategy

**What to Backup:**
1. Database (PostgreSQL)
2. User uploads (MinIO)
3. Configuration files
4. Environment variables

**Backup Schedule:**
- Database: Daily at 2 AM
- Files: Daily at 3 AM
- Configuration: On every change

### Manual Backup

```bash
# Full system backup
./scripts/backup-full.sh

# Database only
docker-compose exec postgres pg_dump -U postgres letsconnect > db_backup.sql

# Files only
docker-compose exec minio mc mirror local/uploads /backups/uploads
```

### Disaster Recovery Plan

**RTO (Recovery Time Objective):** 1 hour
**RPO (Recovery Point Objective):** 24 hours

**Recovery Steps:**
1. Deploy fresh infrastructure
2. Restore database from backup
3. Restore files from backup
4. Restore configuration
5. Start services
6. Verify functionality
7. Update DNS if needed

---

## Performance Optimization

### Optimization Checklist

**Database:**
- [ ] Enable connection pooling
- [ ] Add missing indexes
- [ ] Optimize slow queries
- [ ] Regular VACUUM
- [ ] Partitioning for large tables

**Cache:**
- [ ] Enable Redis caching
- [ ] Cache frequently accessed data
- [ ] Set appropriate TTLs
- [ ] Monitor cache hit ratio

**Storage:**
- [ ] Use CDN for static assets
- [ ] Enable image compression
- [ ] Implement lazy loading
- [ ] Clean up unused files

**Application:**
- [ ] Enable Gzip compression
- [ ] Minify JavaScript/CSS
- [ ] Use production builds
- [ ] Enable HTTP/2

### Monitoring Performance

**Tools:**
- Grafana dashboards
- Application Performance Monitoring (APM)
- Log analysis
- User experience monitoring

**Key Performance Indicators:**
- Page load time < 3s
- API response time < 200ms
- 99th percentile < 1s
- Error rate < 1%

---

## Troubleshooting

### Common Issues

#### Users Can't Log In

**Diagnosis:**
```bash
# Check user service
docker-compose logs user-service | grep -i error

# Test login endpoint
curl -X POST http://localhost:8000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

**Solutions:**
- Check JWT_SECRET is set
- Verify database connectivity
- Check user is not banned
- Verify password is correct

#### Service Not Responding

**Diagnosis:**
```bash
# Check service status
docker-compose ps

# Check service logs
docker-compose logs [service-name]

# Check resource usage
docker stats
```

**Solutions:**
- Restart service: `docker-compose restart [service-name]`
- Check memory limits
- Verify environment variables
- Check network connectivity

#### Database Connection Errors

**Diagnosis:**
```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready

# Check connections
docker-compose exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

**Solutions:**
- Restart PostgreSQL
- Increase max connections
- Check connection pool settings
- Verify credentials

#### High Memory Usage

**Diagnosis:**
```bash
# Check memory usage
docker stats

# Check Node.js heap
docker-compose exec user-service node -e "console.log(process.memoryUsage())"
```

**Solutions:**
- Restart affected service
- Increase memory limit
- Check for memory leaks
- Optimize queries

### Getting Help

**Resources:**
- [Development Documentation](../development/)
- [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md)
- [API Reference](../development/API.md)
- [GitHub Issues](https://github.com/mufthakherul/Lets-connect/issues)

**Support Channels:**
- GitHub Issues (bug reports)
- Documentation (guides and references)
- Community Forum (questions and discussions)
- Direct support (enterprise customers)

---

## Best Practices Summary

### Daily Tasks
- [ ] Check system health dashboard
- [ ] Review new content flags
- [ ] Monitor error logs
- [ ] Check backup status

### Weekly Tasks
- [ ] Review audit logs
- [ ] Analyze performance metrics
- [ ] Review user growth
- [ ] Check storage usage

### Monthly Tasks
- [ ] Security audit
- [ ] Database optimization
- [ ] Review and rotate admin accounts
- [ ] Update documentation
- [ ] Test disaster recovery

### Quarterly Tasks
- [ ] Full security assessment
- [ ] Update dependencies
- [ ] Review and update policies
- [ ] Performance optimization
- [ ] Capacity planning

---

## Appendix

### Environment Variables

Key admin-related environment variables:

```bash
# Admin API
ADMIN_API_SECRET=your-secret-key-here

# Admin Frontend
ENABLE_ADMIN_FRONTEND=true
ADMIN_FRONTEND_PORT=3001

# Security
JWT_SECRET=your-jwt-secret
JWT_EXPIRY=24h

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=letsconnect
DB_USER=postgres
DB_PASSWORD=your-password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

### Quick Reference Commands

```bash
# Start with admin panel
docker compose --profile admin up -d

# View admin logs
docker compose logs admin_frontend

# Restart admin panel
docker compose restart admin_frontend

# Backup database
docker compose exec postgres pg_dump -U postgres letsconnect > backup.sql

# View all services
docker compose ps

# Check resource usage
docker stats

# View service logs
docker compose logs -f [service-name]

# Restart all services
docker compose restart

# Update and restart
docker compose up -d --build
```

---

**Last Updated:** March 9, 2026
**Version:** 2.5.0
**Maintainer:** Platform Admin Team
