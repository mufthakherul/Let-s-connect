# Content Moderation Guide

Complete guide for content moderation including the moderation queue, AI moderation, manual review, content actions, and bulk operations.

## Moderation Queue Overview

The moderation queue displays all content that needs human review. Content enters the queue by:
1. User reports (other users flag content as inappropriate)
2. AI auto-flagging (AI-service detects potentially problematic content)
3. Keyword filters (matches banned phrases)
4. Moderator escalation

### Web Dashboard
Navigate to **Content & Moderation → Moderation** tab.

**Queue statistics** (right sidebar):
- Total items pending: 247
- Average review time: 8 minutes
- Moderator workload this week: ~2400 items
- Most common flag reasons: Spam (45%), Hate Speech (25%), NSFW (20%)

**Queue filters**:
- Flagged (user reports)
- Reported (multiple users reported same item)
- Auto-flagged (AI detection)
- Status: Pending, Approved, Removed
- Content type: Post, Comment, Blog, Video
- Severity: Low, Medium, High
- Time period: Today, This week, This month

## Content Flagging

### User Reporting
When a user reports content:
1. They select reason from dropdown
2. Optional additional comment
3. Reason stored with report
4. Multiple reports on same content increase priority

### AI Moderation System
AI-service automatically analyzes new content for:
- **Hate speech**: Racist, sexist, religious intolerance
- **Spam**: Repetitive low-value content, advertising
- **NSFW**: Explicit sexual content, nudity, graphic violence
- **Misinformation**: False medical claims, election manipulation claims
- **Personal attacks**: Targeted harassment, doxxing
- **Copyright**: Potential copyright infringement

### Confidence Scores
Each AI flag has confidence score (0-100%):
- **90-100%**: Auto-removed immediately (can be appealed)
- **75-89%**: Automatically removed but notifies user
- **50-74%**: Added to moderation queue for human review
- **Below 50%**: Ignored, content not flagged

### Keyword Filters
Admins create banned word/phrase list. Any post containing banned keywords:
- Automatically flagged
- Added to moderation queue
- Can be auto-removed (if configured)

Example filters:
- "hate speech phrases" (list of slurs)
- "spam keywords" (pump-and-dump schemes, weight loss scams)
- "misinformation patterns" (COVID false claims, election fraud claims)

## Manual Content Review

### Moderation Queue Interface
Content cards display:
- Thumbnail/preview
- Content type and author
- Flag reason(s) and count
- Submission date
- AI confidence score (if auto-flagged)
- Reporter usernames (for user reports)

### Reviewing Content
1. Click content card to expand
2. View full content with context:
   - Original post + comments (for comments)
   - Profile information
   - User's moderation history
   - Similar reports from other users
3. Take action (below)

## Moderation Actions

### Approve
Keep content, remove from queue. User sees no notification.

**When to use**:
- Content is not actually violating policy
- False report
- Content was borderline but acceptable

**CLI**:
```bash
milonexa> content approve c1b2a3d4
✓ Content approved
  Removed from moderation queue
```

**Web Dashboard**: "Approve" button

### Remove
Delete content entirely. User receives notification with reason.

**When to use**:
- Clear policy violation
- Hate speech, harassment, spam
- Explicit content

**Steps**:
1. Click "Remove" button
2. Select reason:
   - Hate Speech
   - Harassment
   - Spam
   - NSFW/Explicit
   - Misinformation
   - Copyright Violation
   - Violence/Threats
   - Other
3. Optional comment to explain
4. Confirm

**CLI**:
```bash
milonexa> content delete c1b2a3d4 --reason "hate speech"
✓ Content deleted
  User notified of removal reason
  Reason: Hate Speech
```

**REST API**:
```bash
DELETE /api/admin/content/c1b2a3d4
{
  "reason": "hate speech"
}
```

### Warn User
Send warning email to user without removing content.

**When to use**:
- First offense of user
- Minor policy violation
- Borderline content
- Want to give user chance to self-correct

**Email template**:
```
Subject: Warning - Policy Violation

Your post [title] was found to violate our community guidelines.

Reason: [Selected reason]

Please review our policies at [link]. Further violations may result in account suspension.

You can appeal this warning by replying to this email.
```

### Ban User
Immediately suspend user account.

**When to use**:
- Severe policy violation (hate speech, threats)
- Repeated violations
- Spam bot account
- Evidence of harassment campaign

**Steps**:
1. Click "Ban User"
2. Select duration (1h, 24h, 7d, 30d, permanent)
3. Enter reason
4. Confirm
5. User receives suspension notification
6. All their content remains (can be removed separately)

## Content Types in Moderation

### Posts
Main user-created content. Can contain text, images, videos, links.

**Common issues**:
- Promotional content / spam
- Misinformation
- Hate speech
- Threats / harassment

### Comments
Replies to posts. Smaller but often problematic.

**Common issues**:
- Harassment of post author
- Spam / promotional
- Reply with misinformation

### Blog Posts
Longer-form user content.

**Common issues**:
- Misinformation (medical claims, conspiracy)
- Copyright violation
- Spam

### Videos
User-uploaded or linked videos.

**Common issues**:
- Copyright infringement
- NSFW content
- Violent content
- Misleading thumbnails

### Profile Information
Usernames, bios, profile pictures.

**Common issues**:
- Offensive usernames
- NSFW profile pictures
- Impersonation

## Keyword/Phrase Filters

### Managing Filters
**Web Dashboard**: Settings → Filters

Create keyword filter:
1. Click "Add Filter"
2. Enter term/phrase
3. Select action:
   - Flag for review
   - Auto-remove
4. Severity level
5. Save

### Filter Examples
```
Filter: "hate slur 1"
Action: Auto-remove
Severity: High
Auto-notifies user: "Your post violates community standards"

Filter: "buy viagra online"
Action: Flag for review
Severity: Medium
Review before deletion to avoid false positives

Filter: "crypto scam phrase"
Action: Auto-remove
Severity: High
```

### Best Practices
- Start with "flag for review" not auto-remove
- Monitor false positives and adjust
- Regularly audit filter effectiveness
- Document reason for each filter
- Have policy discussion with team

## Image Moderation

### NSFW Detection
AI-service analyzes images for:
- Nudity (partial or full)
- Explicit sexual acts
- Graphic violence
- Gore

Confidence scores:
- **90-100%**: Auto-removed
- **70-89%**: Manual review
- **Below 70%**: Ignored

### Image Recognition
Identify objects in images:
- Weapons/violence
- Drugs/drug paraphernalia
- Certain animals (for animal cruelty detection)

### QR Code Detection
Automatically scans images for QR codes that might lead to:
- Malware
- Phishing sites
- Spam links

## Appeal System

Users can appeal moderation decisions:
1. User receives removal notification
2. Email contains "Appeal" link
3. User submits appeal with explanation
4. Appeals stored in database
5. Moderator reviews appeal
6. Can override decision or uphold removal

**Web Dashboard**: Appeals section shows pending user appeals

### Reviewing Appeals
1. Click appeal
2. View original content (even if deleted)
3. Review user's appeal explanation
4. Accept appeal (restore content) or Deny (uphold removal)
5. Send response to user

## Moderation Log

Every action logged immutably:
- Timestamp
- Moderator ID
- Action (approve, remove, warn, ban)
- Content ID
- Reason
- User notified? (yes/no)

**Web Dashboard**: Audit Log tab → Filter by action type

**CLI**:
```bash
milonexa> system audit --search "content remove" --format table

Output:
2024-12-15 15:42:00 | moderator1 | content remove | Post c1b2a3d4
  Reason: hate speech
  User notified: yes
  
2024-12-15 14:30:00 | administrator | content remove | Comment d4e5f6a7
  Reason: harassment
  User notified: yes
```

## Statistics and Reporting

### Moderation Dashboard
**Web Dashboard**: Analytics → Moderation Report

Shows:
- Daily moderation volume (items reviewed per day)
- AI accuracy metrics
  - Precision: % of auto-flags that were correct
  - Recall: % of violating content caught by AI
- Moderator performance
  - Average review time per moderator
  - Items processed per moderator
  - Appeal rate (% of actions appealed)
- Violation breakdown by type
- Trend over time (decreasing violations = good policy enforcement)

### Reports
Generate moderation reports:
- Weekly: Violations found this week, action taken
- Monthly: Trend analysis, top violators, content type breakdown
- Custom: Any date range, any content type

Export formats: PDF, CSV, JSON

## Best Practices

### Decision Quality
- Review context: Author's history, type of content, clear violation vs borderline
- Consistency: Apply policies consistently across users and content types
- Proportionality: Punishment matches severity (warn for minor, ban for severe)
- Transparency: Provide clear reason to user

### User Communication
- Always explain why content removed
- Link to relevant policy
- Provide appeal mechanism
- Be respectful and non-judgmental

### Handling False Positives
- AI flags: Review before removing to catch false positives
- Keyword filters: Monitor for overly broad matches
- User reports: Consider context before accepting report

### Escalation
If unsure, don't remove content. Instead:
- Warn user
- Flag for senior moderator review
- Document concerns
- Discuss in team meeting

## Bulk Moderation

### Select Multiple Items
1. Click checkboxes on content cards
2. "Bulk Action" dropdown appears
3. Select action:
   - Approve Selected
   - Remove Selected
   - Warn Users
   - Ban Users

### Example: Remove Spam Campaign
1. Identify spam bot account creating dozens of posts
2. Select all their posts (can filter by author)
3. Click "Remove Selected"
4. Select reason: "Spam"
5. Confirm
6. All posts deleted
7. Can optionally ban user in separate action

## Content Policy

Create content policy that defines violations:

### Prohibited Content Examples
- Hate speech / discrimination
- Harassment and bullying
- Threats and violence
- Sexual exploitation
- Spam and scams
- Misinformation (health, election, etc.)
- Copyright and IP infringement
- Impersonation
- Doxing / privacy violation
- Illegal activity promotion

### Policy Communication
- Published policy on website
- Shown during signup
- Accessible in app settings
- Enforcement is transparent

---

Last Updated: 2024 | Milonexa Platform Documentation
