# User Management Guide for Administrators

> **Detailed guide for managing users, roles, and access control on the Let's Connect platform**

## Table of Contents

1. [Overview](#overview)
2. [User Roles](#user-roles)
3. [User Lifecycle Management](#user-lifecycle-management)
4. [Role Management](#role-management)
5. [User Banning & Suspension](#user-banning--suspension)
6. [User Search & Filtering](#user-search--filtering)
7. [Bulk Operations](#bulk-operations)
8. [User Analytics](#user-analytics)
9. [Best Practices](#best-practices)

---

## Overview

The User Management system allows administrators to:
- View and search all platform users
- Manage user roles and permissions
- Ban or suspend problematic users
- Monitor user activity and engagement
- Create admin and moderator accounts
- Track user growth and metrics

**Access:** Admin Dashboard → Users Tab

---

## User Roles

### Role Hierarchy

```
Admin
  ├─ Full platform control
  ├─ User management
  ├─ System configuration
  └─ All moderator permissions
  
Moderator
  ├─ Content moderation
  ├─ Flag review
  ├─ Limited user management
  └─ No system configuration
  
User (Default)
  ├─ Standard platform access
  ├─ Create and share content
  ├─ Message and collaborate
  └─ No admin capabilities
```

### Permission Matrix

| Permission | User | Moderator | Admin |
|-----------|------|-----------|-------|
| Create content | ✅ | ✅ | ✅ |
| View Dashboard | ❌ | ✅ | ✅ |
| Moderate content | ❌ | ✅ | ✅ |
| Ban users | ❌ | ⚠️ Limited | ✅ |
| Change roles | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ⚠️ Own | ✅ |
| Manage admins | ❌ | ❌ | ✅ |

---

## User Lifecycle Management

### New User Registration

**Automatic Process:**
1. User visits registration page
2. Fills in required fields:
   - Username (unique)
   - Email (unique, validated)
   - Password (min 8 characters)
3. Email verification sent (if enabled)
4. User receives "user" role by default
5. Welcome email sent (if configured)

**Admin Review (Optional):**
- Enable manual approval in settings
- New users pending admin approval
- Admin reviews and approves/rejects

### User Onboarding

**Default Experience:**
- Welcome message
- Profile completion prompt
- Feature tour
- Suggested connections

**Admin Customization:**
```javascript
// Configure in user-service
WELCOME_MESSAGE="Welcome to Let's Connect!"
ONBOARDING_ENABLED=true
REQUIRE_EMAIL_VERIFICATION=true
```

### Account Deactivation

Users can deactivate their own accounts:
- Account hidden from searches
- Content remains visible
- Can reactivate within 30 days
- Permanent deletion after 30 days

**Admin Override:**
- Immediately delete account
- Export user data before deletion
- Preserve audit trail

---

## Role Management

### Viewing User Roles

1. Navigate to **Admin Dashboard → Users**
2. See role badge next to each user:
   - 🔵 User
   - 🟡 Moderator  
   - 🔴 Admin

3. Filter by role using dropdown

### Promoting Users

**To Moderator:**

**When to Promote:**
- Trusted community member
- Demonstrates good judgment
- Active on platform
- Understands community guidelines

**Steps:**
1. Find user in Users tab
2. Click **Edit** button
3. Select "Moderator" from role dropdown
4. Add notes explaining promotion
5. Click **Save**
6. User notified via email and in-app

**What Changes:**
- User gains access to Moderation dashboard
- Can review content flags
- Can issue warnings
- Limited ban capabilities

**To Admin:**

**When to Promote:**
- Internal team member
- Technical knowledge
- Trusted with system access
- Business need for admin access

**Steps:**
1. Find user in Users tab
2. Click **Edit** button
3. Select "Admin" from role dropdown
4. **Confirm** (requires additional confirmation)
5. Add detailed notes
6. Click **Save**
7. User notified

**Security Considerations:**
```bash
# Enable 2FA requirement for admins
REQUIRE_2FA_FOR_ADMIN=true

# Notify all admins of new admin
NOTIFY_ADMINS_ON_PROMOTION=true

# Log to audit
Action: ROLE_CHANGE
From: user
To: admin
By: super_admin
Reason: New team member
```

### Demoting Users

**When to Demote:**
- No longer needs elevated access
- Leaving team/organization
- Inactive for extended period
- Misuse of privileges

**Steps:**
1. Review user's access needs
2. Document reason for demotion
3. Click **Edit** on user
4. Select lower role
5. Click **Save**
6. Remove from any admin channels
7. Notif user (optional)

---

## User Banning & Suspension

### When to Ban

**Immediate Ban:**
- Illegal content
- Severe harassment or threats
- Coordinated spam attack
- Hacking or security violations
- Terms of service violations (egregious)

**Warning First:**
- Minor policy violations
- Inappropriate language
- Off-topic content
- First-time offenses

### Ban Process

**Standard Ban:**
1. Review user's violations
2. Document reason
3. Click **Ban** button on user
4. Confirm action
5. Add ban reason and duration
6. Click **Confirm Ban**

**What Happens:**
```
✅ User logged out immediately
✅ All active sessions terminated
✅ Cannot log in
✅ Content remains visible
✅ Audit log entry created
✅ Can be unbanned by admin
```

**What Doesn't Happen:**
```
❌ Content NOT deleted automatically
❌ Data NOT removed
❌ Email NOT blocked
❌ IP NOT blacklisted
```

### Temporary vs Permanent Bans

**Temporary Ban:**
```javascript
Ban Duration: 7 days
Reason: Spam posting
Auto-Unban: Yes
Notification: "Your account has been temporarily suspended for 7 days"
```

**Permanent Ban:**
```javascript
Ban Duration: Permanent
Reason: Repeated harassment
Auto-Unban: No
Notification: "Your account has been permanently banned"
```

### Unbanning Users

**When to Unban:**
- Ban duration expired
- User appeals successfully
- Ban issued in error
- Changed circumstances

**Steps:**
1. Filter users by status: "Banned"
2. Review ban reason and history
3. Click **Unban** button
4. Add unban notes
5. Click **Confirm**
6. User can immediately log in

### Ban Appeals

**Appeal Process:**
1. User submits appeal (if appeal system enabled)
2. Admin reviews:
   - Original ban reason
   - User history
   - Appeal message
   - Time since ban
3. Decision: Uphold or overturn
4. Document decision
5. Notify user

---

## User Search & Filtering

### Search Methods

**By Username:**
```
Search: "john"
Results: john123, johnny, john_doe
```

**By Email:**
```
Search: "gmail.com"
Results: All users with Gmail addresses
```

**By ID:**
```
Search: "123"
Results: User with ID 123
```

### Advanced Filtering

**Filter Options:**

1. **Role Filter:**
   - All
   - User
   - Moderator
   - Admin

2. **Status Filter:**
   - All
   - Active
   - Banned
   - Inactive (no activity 30+ days)

3. **Registration Date:**
   - Today
   - This week
   - This month
   - Custom range

4. **Activity Level:**
   - Very active (daily)
   - Active (weekly)
   - Occasional (monthly)
   - Inactive (30+ days)

### Sorting Users

**Sort Options:**
- Newest first
- Oldest first
- Most active
- Most content
- Alphabetical

### Bulk Selection

1. Use checkboxes to select multiple users
2. Apply bulk actions:
   - Export data
   - Send message
   - Change role (same role only)
   - Add to group

---

## Bulk Operations

### Export User Data

**Single User:**
```bash
# From Admin Dashboard
User Actions → Export User Data → Download JSON

# Includes:
- Profile information
- Posts and comments
- Messages (sent only)
- Files uploaded
- Activity log
```

**Multiple Users:**
```bash
# Select users
# Click "Export Selected"
# Choose format: CSV, JSON, Excel
# Download file
```

**All Users:**
```bash
# Export → All Users
# Warning: Large file
# Background process
# Download link via email
```

### Bulk Messaging

Send announcement to multiple users:
```bash
1. Select users
2. Click "Message Selected"
3. Compose message
4. Choose delivery:
   - In-app notification
   - Email
   - Both
5. Send
```

### Bulk Role Changes

**Use Cases:**
- Promote multiple moderators
- Demote inactive moderators
- Reset test accounts

**Process:**
1. Select users with same target role
2. Click "Change Role"
3. Select new role
4. Add reason
5. Confirm (requires admin password)

---

## User Analytics

### User Growth Metrics

**Dashboard View:**
```
Total Users: 10,234
New This Week: 245
New This Month: 1,234
Growth Rate: +12.5%
```

**Detailed Analytics:**
- Daily sign-ups graph
- Weekly active users (WAU)
- Monthly active users (MAU)
- Retention rate
- Churn rate

### Engagement Metrics

**Per User:**
- Total posts created
- Total comments
- Total messages sent
- Total likes given
- Last active date
- Average session duration

**Platform-Wide:**
- Posts per user average
- Messages per user average
- Daily active users (DAU)
- Weekly active users (WAU)
- Engagement rate

### User Segments

**Segment by Activity:**
- Power users (top 10% most active)
- Regular users (weekly activity)
- Casual users (monthly activity)
- Dormant users (no activity 30+ days)

**Segment by Content:**
- Content creators (regular posters)
- Consumers (mostly browsing)
- Social (mostly messaging)
- Shoppers (e-commerce focus)

### Retention Analysis

**Cohort Analysis:**
```
Week 0: 100% (sign-up week)
Week 1: 60% returned
Week 2: 45% returned
Week 4: 35% returned
Week 8: 28% retained
```

**Churn Prevention:**
- Identify at-risk users
- Re-engagement campaigns
- Feature reminders
- Personal outreach

---

## Best Practices

### Security Best Practices

1. **Verify Before Promoting:**
   - Check user history
   - Review content quality
   - Verify identity if possible
   - Start with moderator, not admin

2. **Document Everything:**
   - Always add notes when changing roles
   - Document ban reasons
   - Track appeal decisions
   - Maintain paper trail

3. **Regular Audits:**
   - Review admin list monthly
   - Check moderator activity
   - Remove inactive admin accounts
   - Verify permissions are appropriate

4. **Protect Admin Accounts:**
   - Require strong passwords
   - Enable 2FA
   - Monitor for unusual activity
   - Rotate credentials regularly

### Moderation Best Practices

1. **Consistent Enforcement:**
   - Apply rules equally
   - Don't play favorites
   - Document exceptions
   - Be transparent

2. **Progressive Discipline:**
   - Warning → Temporary ban → Permanent ban
   - Give users chance to improve
   - Document each step
   - Allow appeals

3. **Communication:**
   - Explain bans clearly
   - Provide ban duration
   - Outline what user did wrong
   - Explain how to appeal

4. **Context Matters:**
   - Consider user history
   - Review full conversation
   - Understand intent
   - Cultural differences

### User Management Best Practices

1. **Regular Review:**
   - Weekly: Review new admin/moderator activity
   - Monthly: Audit all elevated accounts
   - Quarterly: Full user permissions review
   - Annually: Comprehensive security audit

2. **Communication:**
   - Notify users of role changes
   - Explain bans clearly
   - Respond to appeals promptly
   - Be professional

3. **Data Protection:**
   - Export user data on request
   - Delete data when required
   - Comply with privacy laws (GDPR, CCPA)
   - Secure admin access

4. **Automation:**
   - Auto-flag suspicious accounts
   - Auto-ban obvious spam
   - Auto-demote inactive moderators
   - Auto-backup user data

### Common Mistakes to Avoid

❌ **Don't:**
- Promote users to admin hastily
- Ban without documentation
- Ignore appeals
- Share admin credentials
- Make decisions when emotional
- Delete users without backup

✅ **Do:**
- Follow established procedures
- Document all actions
- Review before acting
- Consult other admins
- Be consistent and fair
- Maintain audit trail

---

## Troubleshooting

### User Can't Log In

**Checklist:**
1. Verify user exists
2. Check if banned
3. Verify email is confirmed (if required)
4. Check password reset options
5. Review recent login attempts
6. Check for IP blocks

**Solution:**
```bash
# Unban if needed
# Reset password
# Resend verification email
# Remove IP block
```

### Role Change Not Working

**Checklist:**
1. Verify you have admin role
2. Check target user exists
3. Ensure not blocked by policy
4. Clear cache
5. Try different browser

### Missing Users

**Checklist:**
1. Check filters are not applied
2. Verify search query
3. Check if user deleted account
4. Review database for data

---

## Appendix

### Useful Admin Commands

```bash
# Count total users
curl http://localhost:8000/api/admin/stats | jq '.totalUsers'

# Get user details
curl http://localhost:8000/api/admin/users?search=username

# Ban user
curl -X POST http://localhost:8000/api/admin/users/123/ban \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"reason":"spam"}'

# Change role
curl -X PUT http://localhost:8000/api/admin/users/123/role \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role":"moderator"}'
```

### User Lifecycle Flowchart

```
User Registration
    ↓
Email Verification (optional)
    ↓
Account Active (User role)
    ↓
    ├─ Regular Use
    ├─ Promoted to Moderator
    ├─ Promoted to Admin
    ├─ Banned (temporary/permanent)
    ├─ Deactivated (self)
    └─ Deleted (self or admin)
```

---

**Last Updated:** March 9, 2026
**Version:** 2.5.0
