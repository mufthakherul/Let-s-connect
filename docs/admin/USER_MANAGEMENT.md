# User Management Guide

Complete guide for managing Milonexa users including viewing, searching, filtering, changing roles, banning, suspending, GDPR operations, and bulk actions.

## Viewing All Users

### Web Dashboard
Navigate to **User Management → Users** tab. Shows table with:
- Username
- Email  
- Display Name
- Role (User, Moderator, Admin)
- Status (Active, Suspended, Deleted)
- Created date
- Last login date
- Email verified status
- Two-factor authentication enabled

### CLI
```bash
milonexa> users list
milonexa> users list --page 2 --limit 50 --format table
```

### REST API
```bash
GET /api/admin/users
GET /api/admin/users?page=2&limit=50&role=admin&status=active
Authorization: Bearer <admin_token>
```

## User Record Fields

Each user record contains:
- **id**: UUID unique identifier
- **username**: Unique username (3-32 alphanumeric characters + underscores)
- **email**: Valid email address
- **displayName**: Public display name (can be different from username)
- **role**: User, Moderator, Admin, Super Admin
- **status**: Active, Suspended, Deleted, Banned
- **createdAt**: Account creation timestamp
- **lastLogin**: Most recent login timestamp (null if never logged in)
- **emailVerified**: Boolean, true if email address verified
- **twoFactorEnabled**: Boolean, true if 2FA enabled
- **profilePictureUrl**: Avatar URL
- **bio**: User biography text
- **followers**: Count of followers
- **following**: Count of following
- **posts**: Count of published posts
- **bannedUntil**: Timestamp when ban expires (null if not banned)
- **bannedReason**: Text reason for ban (if banned)

## Searching Users

### Web Dashboard
Click search box at top of Users table:
- Search by username, email, or display name
- Real-time results as you type
- Case-insensitive matching
- Supports partial matches

Example:
```
Search: "john" → Results: johndoe, johndoe2, admin.john (3 results)
```

### CLI
```bash
milonexa> users list --search "john"
milonexa> users list --search "john@example.com"
```

### REST API
```bash
GET /api/admin/users?search=john
GET /api/admin/users?search=john@example.com
```

## Filtering Users

### By Role
**Web Dashboard**: Role dropdown
- User
- Moderator  
- Admin

**CLI**:
```bash
milonexa> users list --role admin
milonexa> users list --role moderator --role admin  # Multiple roles
```

**REST API**:
```bash
GET /api/admin/users?role=admin
GET /api/admin/users?role=moderator&role=admin
```

### By Status
**Web Dashboard**: Status dropdown
- Active
- Suspended
- Deleted

**CLI**:
```bash
milonexa> users list --status suspended
milonexa> users list --status active --status suspended
```

**REST API**:
```bash
GET /api/admin/users?status=active
```

### By Creation Date
**Web Dashboard**: Date range picker
- Select from/to dates
- Predefined: Last 7 days, Last 30 days, Last 3 months

**CLI**:
```bash
milonexa> users list --created-after "2024-12-01" --created-before "2024-12-15"
```

**REST API**:
```bash
GET /api/admin/users?createdAfter=2024-12-01&createdBefore=2024-12-15
```

## Viewing User Details

### Web Dashboard
1. Click username in Users table
2. Opens user profile page showing:
   - Profile information (name, email, bio)
   - Posts list (paginated)
   - Followers and following
   - Login sessions
   - Moderation history
   - Account activity log

### CLI
```bash
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
  "followers": 1245,
  "following": 567,
  "posts": 89,
  "bio": "Software developer and technology enthusiast"
}
```

### REST API
```bash
GET /api/admin/users/f47ac10b-58cc-4372-a567-0e02b2c3d479
Authorization: Bearer <admin_token>
```

## Changing User Role

### Web Dashboard
1. Open user profile
2. Click "Edit" button
3. Change "Role" dropdown
4. Click "Save"
5. Confirmation: "Role updated from user to moderator"

### CLI
```bash
milonexa> users promote f47ac10b --role moderator

Output:
✓ User role updated
  User: johndoe
  Previous role: user
  New role: moderator
```

### REST API
```bash
PUT /api/admin/users/f47ac10b
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role": "moderator"
}

Response:
{
  "id": "f47ac10b",
  "role": "moderator",
  "updatedAt": "2024-12-15T15:45:00Z"
}
```

## Banning/Suspending Users

### Web Dashboard
1. Open user profile
2. Click "Ban User" button
3. Select ban duration:
   - 1 hour
   - 24 hours
   - 7 days
   - 30 days
   - Permanent
4. Enter ban reason (required)
5. Click "Confirm Ban"
6. User receives notification email

### CLI
```bash
milonexa> users ban f47ac10b --reason "spam" --duration 7d
milonexa> users ban f47ac10b --reason "harassment" --duration permanent
```

### REST API
```bash
POST /api/admin/users/f47ac10b/ban
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "spam",
  "duration": "7d"
}

Response:
{
  "status": "success",
  "user": "johndoe",
  "bannedUntil": "2024-12-22T15:45:00Z"
}
```

### User Experience When Banned
- Login attempt shows: "Your account has been suspended"
- Cannot post, comment, or message
- Cannot access any services
- Can appeal ban (if configured)
- Ban duration displayed to user

## Unbanning Users

### Web Dashboard
1. Open user profile
2. Click "Unban" button
3. Confirmation: "Ban lifted"

### CLI
```bash
milonexa> users unban f47ac10b

Output:
✓ User suspension lifted
  User: johndoe
  Ban ended: 2024-12-15T15:45:00Z
```

### REST API
```bash
POST /api/admin/users/f47ac10b/unban
Authorization: Bearer <admin_token>
```

## Forcing Password Reset

### Web Dashboard
1. Open user profile
2. Click "Force Password Reset"
3. Confirmation: "User must change password on next login"

### CLI
```bash
milonexa> users force-reset-password f47ac10b
```

### REST API
```bash
POST /api/admin/users/f47ac10b/force-password-reset
Authorization: Bearer <admin_token>
```

User will see "Password reset required" on next login and must set new password before continuing.

## Revoking All Sessions

### Web Dashboard
1. Open user profile
2. Click "Revoke All Sessions"
3. Confirmation modal
4. User logged out from all devices

### CLI
```bash
milonexa> users revoke-sessions f47ac10b

Output:
✓ All sessions revoked
  User: johndoe
  Sessions terminated: 3
  User will need to login again
```

### REST API
```bash
POST /api/admin/users/f47ac10b/revoke-sessions
Authorization: Bearer <admin_token>
```

## GDPR Data Export

User data archive includes:
- Profile information and settings
- All posts and comments
- All messages and conversations
- All reactions and bookmarks
- Login history
- Account activity log
- Media files (photos, videos)

### Web Dashboard
1. Open user profile
2. Click "Export Data" (GDPR)
3. Export starts (background job)
4. Notification when ready
5. Download link provided
6. Expires after 24 hours

### CLI
```bash
milonexa> gdpr export f47ac10b

Output:
✓ Export scheduled
  User: johndoe
  Job ID: gdpr-exp-20241215-001
  Estimated time: 5 minutes
  Download URL: https://admin.local/exports/gdpr-exp-20241215-001.zip
  Expires: 2024-12-22 15:45:00
```

### REST API
```bash
POST /api/admin/users/f47ac10b/export
Authorization: Bearer <admin_token>

Response:
{
  "jobId": "gdpr-exp-20241215-001",
  "status": "processing",
  "downloadUrl": "https://admin.local/exports/...",
  "expiresAt": "2024-12-22T15:45:00Z"
}
```

## GDPR Data Deletion

**WARNING**: Irreversible operation. All user data permanently deleted.

Deleted:
- User account
- All posts and comments
- All messages
- All profile data
- All personal information

NOT deleted (for compliance):
- Audit trail of deletion
- Transaction history (for financial records)
- Anonymized usage statistics

### Web Dashboard
1. Open user profile
2. Click "Delete User" 
3. Confirmation modal lists what will be deleted
4. Must confirm twice
5. Deletion starts

### CLI
```bash
milonexa> users delete f47ac10b --gdpr

! WARNING: Irreversible operation
  User: johndoe (john@example.com)
  
Continue? (y/n): y

Output:
✓ User deletion scheduled
  Job ID: gdpr-del-20241215-001
  Will complete in: 10 minutes
  User will be notified
```

### REST API
```bash
DELETE /api/admin/users/f47ac10b?gdpr=true
Authorization: Bearer <admin_token>
```

## Bulk Operations

### Web Dashboard
1. Select multiple users (checkboxes)
2. Bulk action dropdown appears
3. Select action:
   - Ban Selected
   - Unban Selected
   - Promote (change role)
   - Export Data
   - Delete
   - Send Message
   - Add to Group
   - Remove from Group

### CLI
```bash
# No built-in bulk command; use scripting
milonexa> users list --status inactive --format json | \
  jq '.users[].id' | \
  while read uid; do
    milonexa> users ban "$uid" --reason "inactive"
  done
```

### REST API
```bash
POST /api/admin/users/bulk-action
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userIds": ["f47ac10b", "a1b2c3d4", "e5f6g7h8"],
  "action": "ban",
  "reason": "spam",
  "duration": "7d"
}
```

## User Moderation History

View all moderation actions on a user:

### Web Dashboard
1. Open user profile
2. Click "Moderation History" tab
3. Shows all actions:
   - Date
   - Action (ban, warn, content deleted)
   - Admin who took action
   - Reason
   - Details

### CLI
```bash
milonexa> users moderation-history f47ac10b

Output:
Moderation History: johndoe
═════════════════════════════════════════

2024-12-15 15:42:00 | BANNED                    | administrator
  Reason: spam
  Duration: 7 days
  
2024-12-10 09:30:00 | WARNED                    | moderator1
  Reason: harassment
  Message: Be respectful to others
  
2024-12-05 14:15:00 | CONTENT DELETED (Post)    | moderator1
  Post ID: c1b2a3d4
  Reason: misinformation
```

### REST API
```bash
GET /api/admin/users/f47ac10b/moderation-history
Authorization: Bearer <admin_token>
```

## IP Address Management

### View User's IP Addresses
```bash
milonexa> users ips f47ac10b

Output:
IP Addresses Used by User
═════════════════════════

192.168.1.100      Used 45 times      Last login: 2024-12-15 14:30
203.0.113.50       Used 12 times      Last login: 2024-12-14 09:15
198.51.100.200     Used 3 times       Last login: 2024-12-10 16:45
```

### Block IP Address
```bash
milonexa> security block-ip 192.168.1.100 --reason "spammer account used from this IP"

Output:
✓ IP address blocked
  IP: 192.168.1.100
  Blocked accounts from this IP: 3
```

### Unblock IP Address
```bash
milonexa> security unblock-ip 192.168.1.100
```

## User Sessions Management

### View Active Sessions
```bash
milonexa> users sessions f47ac10b

Output:
Active Sessions: johndoe
═════════════════════════

Session ID              IP Address        Device                  Created
──────────────────────  ─────────────────  ──────────────────────  ──────────────
a1b2c3d4e5f6...         192.168.1.100     Chrome/Mac (v131)       2024-12-15 10:30
b2c3d4e5f6a1...         203.0.113.50      iPhone Safari (v18)     2024-12-14 15:42
c3d4e5f6a1b2...         198.51.100.200    Firefox/Linux (v123)    2024-12-10 08:20
```

### Terminate Specific Session
```bash
milonexa> users session-terminate a1b2c3d4e5f6

Output:
✓ Session terminated
  User: johndoe
  Device: Chrome/Mac
  Logged out from that device
```

---

Last Updated: 2024 | Milonexa Platform Documentation
