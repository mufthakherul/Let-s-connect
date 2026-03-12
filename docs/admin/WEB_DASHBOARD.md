# Web Dashboard Guide

The Milonexa Web Dashboard is a comprehensive React-based admin interface accessible at http://localhost:3001 (or admin.yourdomain.com in production). It provides visual access to all admin functions with real-time updates, interactive charts, and powerful search/filter capabilities.

## Accessing the Dashboard

### Login
1. Navigate to http://localhost:3001
2. Enter admin username and password
3. If two-factor authentication is enabled, enter 6-digit code from authenticator app
4. Click "Sign In"
5. Redirected to Dashboard home page

### Session Management
- Sessions expire after 30 minutes of inactivity
- Active session timer displayed in top-right corner
- "Stay Signed In" button extends session by 30 minutes
- Manual logout available via User Menu → Sign Out

### Security Features
- HTTPS required in production
- Secure httpOnly cookies (cannot be accessed by JavaScript)
- CSRF token validation on all form submissions
- Rate limiting on login attempts (5 attempts per minute)
- IP address logging for session security
- Device fingerprinting to detect suspicious logins

## Dashboard Layout

### Header
- **Milonexa Logo**: Click to return to dashboard home
- **Search Bar**: Global search across users, content, and audit logs
- **Notifications Bell**: Shows count of unread notifications and alerts
- **User Menu**: Settings, 2FA, logout

### Sidebar Navigation
Left sidebar with expandable menu:
- Dashboard (home)
- User Management
- Content & Moderation
- System Operations
- Configuration
- Help & Documentation

Active page highlighted in sidebar.

### Main Content Area
Large central area with:
- Page header with title and breadcrumbs
- Filter/search controls for current page
- Main content (tables, charts, forms)
- Action buttons (create, export, bulk actions)
- Pagination controls
- Status messages and alerts

### Notifications Panel
Expandable right sidebar showing:
- System alerts (service down, quota exceeded)
- Admin notifications (moderation queue updates, new users)
- Recent activity (last 10 admin actions)
- Clear notifications button

## All 30+ Dashboard Tabs

### 1. Overview Tab
**Access**: Dashboard home page (default landing)

**Content**:
- System health summary card: Overall status (Healthy/Degraded/Down)
- Key performance indicators:
  - Active users (count and trend)
  - Posts per day (count and trend)
  - Server uptime % (30-day and 7-day)
  - Average API response time (ms)
- Service status grid:
  - All services with status (green/yellow/red)
  - Response time per service
  - Last health check timestamp
- Recent alerts (last 5)
- Recent admin actions (last 10)
- Upcoming maintenance notifications

**Actions**:
- Acknowledge alerts
- Click service name to drill into service details
- Click metric to view trends

### 2. Users Tab
**Access**: Left sidebar → User Management → Users

**Features**:
- User list table with columns:
  - Username (clickable → user profile)
  - Email
  - Display Name
  - Role (User, Moderator, Admin)
  - Status (Active, Suspended, Deleted)
  - Created date
  - Last login date
  - Email verified (yes/no)
  - 2FA enabled (yes/no)

**Search & Filter**:
- Search box: Filter by username, email, display name (real-time)
- Role filter dropdown: Select one or multiple roles
- Status filter dropdown: Select one or multiple statuses
- Date range picker: Filter by creation date
- Results per page: 10, 25, 50, 100
- Pagination: Previous/Next, jump to page

**Actions**:
- Click username to view full user profile
- "View Profile" button: See user details, posts, sessions, moderation history
- "Edit" button: Change user information
- "Ban/Suspend" button: Suspend user account
- "Unban" button: Restore suspended user
- "Delete User" button: Permanent deletion (requires confirmation)
- "Export Data" button: GDPR data export (generates download)
- "Force Password Reset" button: User must change password on next login
- "Revoke Sessions" button: Log user out from all devices
- "View Sessions" button: See active login sessions
- "View Audit Log" button: See all actions on this user

**Bulk Actions**:
- Select multiple users (checkboxes)
- Bulk action dropdown:
  - Ban Selected
  - Export Data for Selected
  - Send Message to Selected
  - Add Role to Selected
  - Remove from Group

### 3. Content Tab
**Access**: Left sidebar → Content & Moderation → Content

**Features**:
- Content list table with columns:
  - Title/Preview
  - Type (Post, Comment, Blog, Video, Story)
  - Author (username)
  - Created date
  - Status (Published, Flagged, Removed, Archived)
  - Engagement (reactions, comments count)
  - Flagged/Reported count

**Filter Options**:
- Content type filter: Post, Comment, Blog, Video, Story
- Status filter: Published, Flagged, Removed, Archived
- Flagged only toggle: Show only reported content
- Date range picker
- Author search

**Actions**:
- "View" button: Preview content in modal
- "Approve" button: Unflag and publish
- "Remove" button: Delete content with reason
- "Flag" button: Flag as inappropriate with reason
- "Archive" button: Archive without deletion
- "View Reports" button: See who reported it and reasons

### 4. Groups Tab
**Access**: Left sidebar → Content & Moderation → Groups

**Features**:
- Groups list table with columns:
  - Group name (clickable)
  - Description
  - Member count
  - Post count
  - Privacy level (Public, Private, Secret)
  - Created date
  - Owner (username)
  - Status (Active, Suspended, Archived)

**Search & Filter**:
- Search by group name or description
- Privacy level filter
- Status filter
- Date range

**Actions**:
- "View Group" button: See group details and posts
- "Edit" button: Modify group settings
- "Suspend" button: Suspend group (members cannot post)
- "Archive" button: Archive group (read-only)
- "Delete" button: Permanently delete group
- "View Members" button: Manage group membership
- "View Posts" button: See all group posts with moderation options

### 5. Moderation Tab
**Access**: Left sidebar → Content & Moderation → Moderation

**Features**:
- Moderation queue showing flagged content awaiting review
- Queue filter: Flagged, Reported, Auto-flagged
- Severity indicators: Low/Medium/High
- Content cards showing:
  - Content preview
  - Reason flagged
  - Flag count (how many reported)
  - AI confidence score (if auto-flagged)
  - Reporter usernames

**Actions**:
- "Approve" button: Keep content, remove from queue
- "Remove" button: Delete content with reason
- "Warn User" button: Send warning email
- "Ban User" button: Suspend user account
- "Dismiss" button: Remove from queue without action
- "View Context" button: See original post and comments

**Statistics Panel** (right sidebar):
- Queue length (number pending review)
- Average review time
- Moderator performance this week
- Most common flag reasons

### 6. Security Tab
**Access**: Left sidebar → System Operations → Security

**Features**:
- Security dashboard with:
  - Failed login attempts (graph over time)
  - Blocked IP addresses list
  - Suspicious activity alerts
  - Recent security events
  - Two-factor authentication usage stats
  - SSL certificate status and expiration

**Threat Indicators**:
- Brute force attack detection
- Unusual login locations/times
- Token replay attempts
- SQL injection attempts
- XSS attempts
- DDoS indicators

**Actions**:
- "Block IP" button: Add to IP blocklist
- "Unblock IP" button: Remove from blocklist
- "View Details" button: See full security event
- "Send Security Alert" button: Notify user of suspicious activity
- "Reset Auth Methods" button: Force 2FA reset, logout all sessions

### 7. Metrics Tab
**Access**: Left sidebar → System Operations → Metrics

**Features**:
- Real-time Prometheus metrics visualizations
- Multiple charts:
  - HTTP request rate (requests/sec per endpoint)
  - Response latency (p50, p95, p99 percentiles)
  - Error rate (% of requests returning 5xx)
  - Database query time (ms)
  - Redis operations/sec
  - WebSocket connections (active)
  - Queue processing rate

**Controls**:
- Time range selector: Last hour, 6 hours, 24 hours, 7 days, 30 days
- Service filter: Select services to display
- Metric selector: Choose which metrics to show
- Zoom in on any chart
- Export metrics as CSV or JSON

**Alerts Based on Metrics**:
- Service down: No responses in 5 minutes
- High error rate: > 5% errors for 10 minutes
- High latency: p95 > 2000ms for 10 minutes
- High memory usage: > 80% for service
- High disk usage: > 90% for partition

### 8. Audit Log Tab
**Access**: Left sidebar → System Operations → Audit Log

**Features**:
- Immutable audit log of all admin actions
- Table columns:
  - Timestamp
  - Admin username
  - Action (user_banned, content_deleted, etc.)
  - Resource type and ID
  - Details (JSON expandable)
  - IP address
  - Status (success/failure)

**Search & Filter**:
- Admin filter: Select specific admin
- Action filter: Select action type
- Resource type filter
- Status filter: Success/Failure only
- Date range picker
- Full-text search in action details

**Actions**:
- "View Details" button: Expand JSON to see all changes
- "Export" button: Download audit log as CSV
- Cannot be deleted or modified (immutable)

**Statistics**:
- Actions this week (count)
- Failed actions (security concern)
- Most active admins
- Most common actions

### 9. Feature Flags Tab
**Access**: Left sidebar → Configuration → Feature Flags

**Features**:
- Feature flags table:
  - Feature name
  - Enabled/Disabled toggle (blue = enabled)
  - Rollout percentage (0-100%)
  - Target users count (if specific users)
  - Target roles (if role-based)
  - Description
  - Created date
  - Last modified

**Actions**:
- Toggle switch: Enable/disable feature
- "Edit" button: Modify feature flag settings
- "Create Flag" button: Create new feature flag
- "Delete" button: Remove feature flag

**Edit Modal**:
- Feature name (read-only)
- Description field
- Enabled checkbox
- Rollout percentage slider (0-100%)
- Target users (comma-separated user IDs or emails)
- Target roles (checkboxes: Admin, Moderator, User)
- Save/Cancel buttons

**Examples**:
- `ai_chat`: AI chat assistant (30% rollout)
- `ai_moderation`: AI content moderation (100%)
- `new_ui_design`: Redesigned dashboard (50% to beta testers)
- `semantic_search`: AI-powered search (10% early access)

### 10. Tenants Tab
**Access**: Left sidebar → Configuration → Tenants (only in multi-tenant deployments)

**Features**:
- Tenants list:
  - Tenant name (company name)
  - Admin contact email
  - User count
  - API quota usage
  - Monthly cost
  - Status (Active, Suspended, Trial)
  - Created date

**Actions**:
- "View" button: See tenant details and configuration
- "Edit" button: Modify tenant settings
- "Suspend" button: Temporarily suspend tenant
- "Upgrade/Downgrade" button: Change tier
- "View Users" button: See all tenant's users
- "View Usage" button: API usage breakdown
- "Create New Tenant" button: Onboard new customer

### 11. AI Agent Tab
**Access**: Left sidebar → AI & Automation → AI Agent

**Features**:
- AI agent task history showing:
  - Task name
  - Status (Running, Completed, Failed)
  - Started time
  - Duration
  - Performed actions
  - Result summary

**Agent Capabilities Displayed**:
- Anomaly detection and notification
- Automated remediation (restart service, scale pods)
- Log analysis and pattern detection
- Cost optimization recommendations
- Compliance violation detection
- SLA breach prediction

**Actions**:
- "View Execution Details" button: See full agent logs and reasoning
- "Manual Run Task" button: Trigger agent to run specific task
- "View Agent Logs" button: See all agent decision logs
- "Configure Agent" button: Set agent behavior and thresholds

**Task Types**:
- Daily anomaly analysis
- Weekly cost optimization review
- Compliance check
- SLA prediction
- Security pattern analysis
- Incident remediation

### 12. AI Integration Tab
**Access**: Left sidebar → AI & Automation → AI Integration

**Features**:
- AI provider configuration:
  - Selected provider (Gemini or Ollama)
  - API key status (configured/missing)
  - Current model
  - Response time (ms)
  - Last health check

**Configuration**:
- "Change Provider" button: Switch between Gemini and Ollama
- "API Key Settings" button: Update API key
- "Model Selection" button: Choose model variant
- "Test Connection" button: Verify AI service is responding

**Test Interface**:
- Text input field for test prompts
- Response preview
- Token count shown
- Latency measurement

**AI Features Using This**:
- Content moderation
- Semantic search
- User analysis
- Log analysis
- Recommendations

### 13. Alerts Tab
**Access**: Left sidebar → Monitoring → Alerts

**Features**:
- Active alerts list:
  - Alert title
  - Severity (Critical/High/Medium/Low)
  - Status (Active, Acknowledged, Resolved)
  - Affected service
  - Metric value
  - Triggered time
  - Duration

**Filter & Search**:
- Severity filter
- Status filter: Active/Acknowledged/Resolved
- Service filter
- Date range

**Actions**:
- "Acknowledge" button: Confirm alert (show you've seen it)
- "Resolve" button: Close alert (issue is fixed)
- "View History" button: See past occurrences
- "Edit Threshold" button: Adjust alert trigger level
- "Create Alert" button: Create custom alert

**Alert Channels** (settings):
- Email notifications
- Slack webhook URL
- PagerDuty routing key
- Teams webhook
- SMS (if configured)

### 14. SLA Tab
**Access**: Left sidebar → Monitoring → SLA

**Features**:
- Service level agreements display:
  - Service name
  - Uptime % (current month)
  - MTTR (mean time to recovery, hours)
  - MTTF (mean time to failure, hours)
  - Incidents (count this month)
  - SLA status (Met/Breached/At Risk)
  - Breach prediction indicator

**Time Period**:
- Selector: Current Month, Last 30 days, Custom range
- Compare periods

**Breach Prediction**:
- "30-minute forecast" showing if SLA likely to be breached
- Based on current error rate, latency trends, incident history

**Actions**:
- "View Incidents" button: See list of service degradations
- "View Breach History" button: See past SLA breaches
- "Edit SLA" button: Modify SLA thresholds
- "Export Report" button: Generate PDF SLA report

### 15. Compliance Tab
**Access**: Left sidebar → Security → Compliance

**Features**:
- GDPR compliance dashboard:
  - Data request status (pending, completed)
  - Data retention policy compliance
  - Consent tracking
  - Privacy policy version active
  - Data breach notifications (if any)
  - Audit trail integrity status

**Data Requests**:
- Table of user data export/deletion requests
- Status: Pending, In Progress, Completed
- User email
- Request date
- Requested action (Export/Delete)
- Approval status

**Actions**:
- "Approve" button: Authorize data request
- "Download" button: Get exported data archive
- "View Details" button: See request specifics
- "Deny" button: Reject request with reason
- "Auto-approve GDPR Requests" toggle

**Policy Management**:
- "View Privacy Policy" button
- "View Terms of Service" button
- "Upload New Policy" button
- "Track Consents" button: See user consent records per policy version

### 16. Cost Tab
**Access**: Left sidebar → Administration → Cost

**Features**:
- Cost dashboard showing:
  - This month's spending (vs budget)
  - Per-service cost breakdown (pie chart)
  - Daily cost trend (line chart)
  - Forecast for month (projected total)
  - Budget vs actual

**Cost Breakdown**:
- Compute (EC2/VMs)
- Storage (S3/GCS)
- Database (RDS)
- Networking (data transfer)
- Third-party services (Stripe, Twilio)

**Filter**:
- Date range selector
- Service filter
- Cost category filter

**Actions**:
- "View Detailed Report" button: See itemized costs
- "Export CSV" button: Download cost data
- "Set Budget Alert" button: Configure budget threshold
- "Optimization Recommendations" button: ML suggestions for cost savings
- "View Per-Tenant Costs" button: Cost breakdown by tenant (multi-tenant only)

**Cost Optimization**:
- Unused resources
- Right-sizing suggestions
- Reserved instance opportunities
- Data transfer optimization

### 17. Webhooks Tab
**Access**: Left sidebar → Integration → Webhooks

**Features**:
- Registered webhooks list:
  - Webhook URL
  - Events subscribed to
  - Status (Enabled/Disabled)
  - Last delivery time
  - Last delivery status (Success/Failed)
  - Created date

**Event Types**:
- user.created
- user.banned
- user.deleted
- content.created
- content.deleted
- content.flagged
- alert.triggered
- sla.breached

**Actions**:
- "Create Webhook" button: Register new endpoint
- "Edit" button: Modify webhook
- "Delete" button: Remove webhook
- "Test" button: Send test event
- "View Delivery Log" button: See all deliveries
- "Retry Failed" button: Re-send failed deliveries

**Webhook Form**:
- URL field
- Event type checkboxes (select multiple)
- Authentication: API key field
- Signing secret (auto-generated)
- Active toggle
- Save button

### 18. Email Admin Tab
**Access**: Left sidebar → Integration → Email

**Features**:
- Email configuration settings:
  - SMTP server
  - SMTP port
  - From address
  - From name
  - Authentication status
  - Test email status

**Email Templates**:
- Account verification email
- Password reset email
- Admin alerts email
- Newsletter template
- Custom email template editor

**Actions**:
- "Edit Settings" button: Update SMTP configuration
- "Test Email" button: Send test email to your inbox
- "Edit Template" button: Customize email templates
- "View Delivery Log" button: See sent emails
- "Resend Email" button: Retry failed emails

**Email Logs**:
- To address
- Template used
- Status (Sent/Failed/Bounced)
- Sent date
- Error message (if failed)

### 19. Bots Tab
**Access**: Left sidebar → Integration → Bots

**Features**:
- Bot integrations:
  - Slack bot (status, workspace, channels)
  - Telegram bot (status, chat ID, allowed users)
  - Teams bot (status, application ID, channels)

**Slack Configuration**:
- Bot token
- Signing secret
- Channel subscriptions
- Commands available

**Telegram Configuration**:
- Bot token
- Authorized user IDs
- Commands available

**Teams Configuration**:
- Application ID
- Application password
- Channel subscriptions

**Actions**:
- "Connect Slack" button: Authorize Slack bot
- "Connect Telegram" button: Register Telegram bot
- "Connect Teams" button: Setup Teams bot
- "Test Bot" button: Send test message
- "View Logs" button: See bot activity
- "Configure Commands" button: Set available commands per bot

### 20. Runbooks Tab
**Access**: Left sidebar → Automation → Runbooks

**Features**:
- Runbook list:
  - Name
  - Trigger condition
  - Actions (count)
  - Status (Enabled/Disabled)
  - Last executed
- Execution history

**Runbook Examples**:
- High memory response
- Database slow queries
- API timeout response
- DDoS attack mitigation
- Data backup verification

**Actions**:
- "View" button: See runbook steps
- "Edit" button: Modify runbook
- "Execute" button: Manually trigger
- "View History" button: See past executions
- "Create Runbook" button: Write new automation

**Runbook Editor**:
- Step-by-step workflow builder
- Conditions (if statements)
- Actions (restart service, send alert, scale pods)
- Notification settings
- Approval requirements
- Save button

### 21. Anomaly Tab
**Access**: Left sidebar → Monitoring → Anomaly Detection

**Features**:
- Anomaly detection dashboard:
  - Detected anomalies list
  - Anomaly type (Performance, Security, Cost)
  - Affected metric/service
  - Severity score
  - Detection time
  - Status (Open, Acknowledged, Resolved)
  - Recommended action

**Visualizations**:
- Time-series graphs showing normal pattern vs anomaly
- Heatmap of anomalies across services
- Anomaly frequency histogram

**Actions**:
- "View Details" button: See anomaly analysis
- "Acknowledge" button: Mark as reviewed
- "Apply Recommendation" button: Execute suggested fix
- "Dismiss" button: Mark as false positive
- "View Similar" button: See related anomalies

**ML Model Info**:
- Model accuracy on this metric
- Baseline parameters
- Last retrained

### 22. Change Log Tab
**Access**: Left sidebar → Administration → Change Log

**Features**:
- Platform change history:
  - Version number
  - Release date
  - Changes (features, bugfixes, improvements)
  - Deployment status
  - Rollback option (if recent)

**Information Shown**:
- Commit hash
- Changed services
- API changes (breaking/non-breaking)
- Database migrations
- Dependencies updated

**Actions**:
- "View Details" button: See full release notes
- "Rollback" button: Revert to previous version (if available)
- "View Commits" button: See Git commits
- "View Diff" button: See code changes
- "View Deployment Log" button: See deployment execution log

### 23. Knowledge Tab
**Access**: Left sidebar → Help & Documentation → Knowledge Base

**Features**:
- Admin knowledge base articles:
  - Search functionality
  - Category organization
  - Tags
  - Recently edited
  - Most viewed

**Categories**:
- User Management
- Content Moderation
- System Operations
- Troubleshooting
- API Documentation
- Best Practices

**Actions**:
- "Search" button: Find articles
- "View Article" button: Read full content
- "Create Article" button: Write new documentation
- "Edit Article" button: Update existing docs
- "Print/Export" button: Generate PDF

### 24. Reports Tab
**Access**: Left sidebar → Analytics → Reports

**Features**:
- Generate platform reports:
  - User growth report
  - Content statistics
  - Engagement metrics
  - Revenue report (if applicable)
  - Moderation statistics
  - System performance report

**Report Parameters**:
- Time period (custom date range)
- Granularity (daily, weekly, monthly)
- Include charts vs tables
- Include comparisons to previous period

**Actions**:
- "Generate Report" button: Create report (PDF/CSV)
- "Schedule Report" button: Automated weekly/monthly email
- "View Saved Reports" button: See previously generated reports
- "Share Report" button: Export link to share
- "Export Data" button: Download raw data

### 25. Shop Tab
**Access**: Left sidebar → Services → Shop (if enabled)

**Features**:
- Marketplace administration:
  - Products list
  - Categories
  - Sales analytics
  - Orders management
  - Seller management
  - Payment transactions

**Products Table**:
- Product name
- Category
- Price
- Stock count
- Status (Published, Draft, Out of Stock)
- Sales count
- Rating

**Actions**:
- "View" button: See product details
- "Edit" button: Modify product
- "Publish/Unpublish" button: Control visibility
- "Delete" button: Remove product
- "View Orders" button: See purchases
- "View Reviews" button: See customer feedback

### 26. Streaming Tab
**Access**: Left sidebar → Services → Streaming (if enabled)

**Features**:
- TV and radio administration:
  - Channels list
  - Broadcast schedule
  - Viewer analytics
  - Recordings management
  - Guide data

**Actions**:
- "Edit Channel" button: Modify channel info
- "View Schedule" button: See broadcast schedule
- "Add Program" button: Schedule new content
- "View Analytics" button: Viewership stats
- "Manage Recordings" button: Control DVR storage

### 27. Meetings Tab
**Access**: Left sidebar → Services → Meetings (if enabled)

**Features**:
- Video meeting administration:
  - Active meetings
  - Meeting history
  - Participant logs
  - Recording storage
  - Meeting policies

**Actions**:
- "View Meeting" button: See participants and details
- "End Meeting" button: Force terminate meeting
- "Download Recording" button: Get meeting video
- "View Participants" button: See attendee list
- "Manage Policy" button: Set meeting rules and time limits

### 28. API Keys Tab
**Access**: Left sidebar → Security → API Keys

**Features**:
- Manage API keys and OAuth applications:
  - API key name
  - Last 4 characters of key
  - Scopes (permissions)
  - Created date
  - Last used
  - Status (Active, Revoked)

**Actions**:
- "Create API Key" button: Generate new key
- "View" button: See full key (shown once)
- "Edit Scopes" button: Change permissions
- "Revoke" button: Disable key
- "Regenerate" button: Create new key and retire old
- "View Usage" button: See API calls made with this key

**OAuth Apps**:
- Application name
- Client ID
- Redirect URIs
- Authorized scopes
- Created date

**Actions**:
- "Edit" button: Modify app settings
- "View Credentials" button: See client secret
- "View Usage" button: See API calls
- "Delete" button: Remove OAuth app

### 29. Secrets Tab
**Access**: Left sidebar → Security → Secrets

**Features**:
- Secrets vault (encrypted storage):
  - Secret name
  - Type (API key, password, certificate, token)
  - Created date
  - Last accessed
  - Status (Active, Rotated)

**Actions**:
- "Create Secret" button: Add new secret
- "View" button: Decrypt and display (logged)
- "Rotate" button: Generate new value
- "Delete" button: Remove secret
- "View Access Log" button: See who accessed this secret

**Secret Types**:
- Third-party API keys (Stripe, Twilio)
- OAuth secrets
- SSL certificates
- Signing keys
- Database credentials
- SSH keys

### 30. Settings Tab
**Access**: Left sidebar → Administration → Settings

**Features**:
- Platform-wide configuration:
  - Platform name
  - Logo and branding
  - CORS allowed origins
  - Rate limit settings
  - Email configuration
  - OAuth provider settings
  - Feature toggles
  - Payment settings (if applicable)

**Settings Categories**:
1. **General**: Name, logo, tagline
2. **Security**: Password policy, 2FA requirement, session timeout
3. **Email**: SMTP settings, from address, templates
4. **APIs**: Rate limits, CORS, allowed origins
5. **Storage**: File upload limits, S3 settings
6. **OAuth**: Google, GitHub, Discord, Apple settings
7. **Payments**: Stripe keys, currency settings
8. **Features**: Toggle platform features on/off
9. **Notifications**: Default channels, alert recipients
10. **Performance**: Cache settings, database pool size

**Actions**:
- Edit any setting
- Save changes
- Reset to defaults (button)
- Import settings from file
- Export current settings
- Test (for OAuth/email/webhooks)

## Dashboard Features

### Real-Time Updates
- WebSocket connection for live data
- Notifications appear instantly
- Charts update every 30 seconds
- Active users and online status refreshed
- New alerts appear without page reload

### Pagination
- Tables show 25 rows by default
- Configurable: 10, 25, 50, 100 rows
- Previous/Next buttons
- Jump to page input
- Total count display

### Bulk Actions
Available on tables with multiple rows:
- Checkbox to select all
- Individual row checkboxes
- "Bulk Actions" dropdown appears when items selected
- Actions vary by context (ban, delete, export, etc.)
- Confirmation modal before executing

### Search & Filters
- Real-time search (results update as you type)
- Multiple filter dropdowns
- Date range pickers
- Numerical range sliders
- Text search with operators (AND, OR, NOT)
- Save filter presets

### Export Options
- CSV format (Excel compatible)
- JSON format (API integration)
- PDF format (pretty printing, branded)
- Schedule recurring exports
- Email export links

### Sorting
- Click column header to sort ascending
- Click again to sort descending
- Multi-column sort (Shift+Click)
- Maintains sort on pagination

### Mobile Responsive
- Sidebar collapses on mobile
- Tables become scrollable
- Touch-friendly buttons
- Optimized for smaller screens
- Mobile-specific navigation drawer

## Common Workflows

### Banning a User
1. Navigate to Users tab
2. Search for user
3. Click username to open profile
4. Click "Ban User" button
5. Select ban duration
6. Enter reason
7. Confirm

### Content Moderation
1. Navigate to Moderation tab
2. Review flagged item
3. Click "Approve" (keep) or "Remove" (delete)
4. If removing, select reason
5. Optionally warn or ban user
6. Click confirm

### Investigating Security Alert
1. Go to Security or Alerts tab
2. Find relevant alert
3. Click "View Details"
4. See affected resources
5. Click resources to drill in
6. Determine root cause
7. Execute remediation (ban IP, reset account, etc.)
8. Acknowledge alert when resolved

### Deploying Feature Flag
1. Go to Feature Flags tab
2. Click "Create Flag" for new feature
3. Set rollout percentage (start low, e.g., 5%)
4. Monitor for issues (check Anomaly tab)
5. Gradually increase percentage
6. Once verified stable, set to 100%
7. Eventually remove flag from code

## Keyboard Shortcuts

- `/` - Open search
- `?` - Show help
- `ESC` - Close modals/popups
- `Arrow Keys` - Navigate tables
- `Enter` - Confirm action
- `CTRL+S` - Save form
- `CTRL+K` - Command palette (quick navigation)

## Accessibility

- Full keyboard navigation support
- Screen reader friendly
- High contrast mode (Settings → Accessibility)
- WCAG 2.1 AA compliance
- Focus indicators on all interactive elements

---

Last Updated: 2024 | Milonexa Platform Documentation
