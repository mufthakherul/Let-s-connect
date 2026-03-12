# Groups and Communities Guide

Welcome to the Groups and Communities section of Milonexa. This guide covers everything you need to know about creating, managing, and participating in groups and communities.

## What Are Groups and Communities?

**Groups** are smaller, friend-group-oriented spaces where members can share content, organize events, and collaborate. Groups are ideal for:
- Close friend circles
- Project teams
- Study groups
- Hobby enthusiasts
- Local meetups

**Communities** are larger, topic-based spaces designed for broader discussions and engagement. Communities are ideal for:
- Professional networks
- Interest-based communities
- Industry discussions
- Global movements
- Educational institutions

While both offer similar core features, Communities include additional governance tools and analytics for larger-scale organization.

## Creating a Group

### Getting Started

To create a new group, navigate to the Groups section and click the **"Create Group"** button.

### Group Details Form

When creating a group, you'll need to provide:

1. **Group Name** (required)
   - Clear, descriptive name for your group
   - Examples: "Frontend Developers 2024", "Book Club Enthusiasts", "Startup Founders NYC"
   - Maximum 100 characters

2. **Description** (required)
   - Brief explanation of the group's purpose
   - What type of discussions and activities are welcomed
   - Any prerequisites or guidelines
   - Maximum 500 characters

3. **Privacy Level** (required)
   - Choose one of three privacy types (see below)
   - This determines who can see and join your group

4. **Category** (required)
   - Select from predefined categories: Technology, Education, Entertainment, Gaming, Music, Sports, Business, Health, Travel, Food, Art, Community Service, Other
   - Helps users discover your group through category browsing

5. **Cover Image** (optional)
   - Visually represents your group
   - Recommended size: 1200x600px
   - Supported formats: JPG, PNG, WebP
   - Maximum file size: 5MB

### API: Creating a Group

To create a group programmatically:

```bash
POST /api/content/groups
Content-Type: application/json

{
  "name": "Frontend Developers Circle",
  "description": "A group for frontend developers to share tips, tools, and best practices",
  "privacy": "private",
  "category": "Technology",
  "coverImage": "https://cdn.example.com/cover.jpg"
}
```

**Response:**
```json
{
  "id": "group_abc123",
  "name": "Frontend Developers Circle",
  "description": "A group for frontend developers...",
  "privacy": "private",
  "category": "Technology",
  "createdAt": "2024-01-15T10:30:00Z",
  "members": [
    {
      "userId": "user_xyz789",
      "role": "admin"
    }
  ]
}
```

## Group Privacy Types

Choose the privacy level that best fits your group's needs:

### Public Groups

- **Visibility**: Anyone can see the group in search results and public listings
- **Joining**: Users can join instantly with a single click—no approval required
- **Best for**: Open communities, professional networks, public interest groups
- **Considerations**: Content is visible to non-members, less control over membership

### Private Groups

- **Visibility**: Visible in search results and browsable directory
- **Joining**: Users must submit a join request; group admins must approve
- **Best for**: Professional groups, specialized communities, groups with membership standards
- **Considerations**: Moderate control over membership, can review applicants before approval

### Secret Groups

- **Visibility**: Not visible in search or public listings
- **Joining**: Invite-only membership
- **Best for**: Closed friend circles, confidential teams, exclusive networks
- **Considerations**: Members can only be added via direct invitation from existing members or admins
- **Discovery**: Members can only find these groups through direct invitations

## Joining a Group

### Public Groups

Click the **"Join"** button on the group page. Membership is instant and automatic.

### Private Groups

Click the **"Request to Join"** button. Your request will appear in the group's management queue for admin review. You'll receive a notification when your request is approved or declined.

**API Endpoint:**
```bash
POST /api/content/groups/:id/join
```

Upon joining, you immediately see the group feed and can participate.

### Secret Groups

You can only join if invited by an existing member. When you receive an invitation:
- A notification appears with an invitation link
- Click "Accept" to join the group
- Once accepted, you'll see the group in your groups list

## Managing Join Requests

### For Group Admins

If you created a private group, you'll need to manage join requests.

**Accessing the Management Queue:**
1. Go to your group
2. Click the **Settings** icon (⚙️)
3. Select **"Manage Requests"**
4. View all pending join requests with applicant information

**Actions on Requests:**
- **Approve**: Click the checkmark icon to accept the user into the group
- **Decline**: Click the X icon to reject the request
- **View Profile**: Click the user's name or avatar to view their profile before deciding

**API: Get Join Requests**
```bash
GET /api/content/groups/:id/join-requests
```

**Response:**
```json
{
  "requests": [
    {
      "id": "req_123",
      "userId": "user_456",
      "userName": "john_doe",
      "userAvatar": "https://...",
      "requestedAt": "2024-01-15T14:20:00Z"
    }
  ]
}
```

**API: Approve Request**
```bash
PUT /api/content/groups/:id/join-requests/:requestId
Content-Type: application/json

{
  "action": "approve"
}
```

**API: Decline Request**
```bash
PUT /api/content/groups/:id/join-requests/:requestId
Content-Type: application/json

{
  "action": "decline"
}
```

## Group Feed

The group feed displays all posts made within the group. 

### Privacy Note

Posts in a group are **visible only to group members**. Non-members cannot see the group feed or its content, regardless of the group's privacy type.

### Creating Group Posts

Creating a post in a group is identical to creating a regular post, with one key difference—you specify which group the post belongs to.

**How to Create a Group Post:**
1. Navigate to the group
2. Click the compose box at the top ("What's on your mind?")
3. Write your post content (text, images, videos)
4. The group is automatically selected as the destination
5. Click **"Post"**

**API: Create Group Post**
```bash
POST /api/content/posts
Content-Type: application/json

{
  "content": "Check out this cool technique I learned today!",
  "groupId": "group_abc123",
  "attachments": [
    {
      "type": "image",
      "url": "https://cdn.example.com/image.jpg"
    }
  ],
  "visibility": "group"
}
```

### Group Feed Features

- **Chronological Order**: Posts appear with newest first
- **Reactions**: Members can like, love, laugh, or react with custom emojis
- **Comments**: Members can discuss and reply to posts
- **Shares**: Members can share group posts to their personal feeds (with proper credit)
- **Search**: Search within group posts using keywords

## Group Members List

### Viewing Members

Access the group members list:
1. Go to the group page
2. Click **"Members"** tab
3. See all current members with their profile information

### Member Information

Each member entry displays:
- Profile avatar and name
- Role badge (Member, Moderator, Admin)
- Join date
- Member status (active, inactive)

### Member Roles

**Member**
- Can view all group content
- Can create posts and comments
- Cannot manage group settings or moderate content

**Moderator**
- All member permissions plus:
- Can moderate content and flag inappropriate posts
- Can review reported content in moderation queue
- Cannot manage member roles or delete group

**Admin**
- Full control over the group
- Can manage all members and their roles
- Can edit group settings (name, description, privacy, cover image)
- Can delete the group
- Can access group analytics
- Can create and manage group events

## Member Management

### Promoting a Member

To promote a member to moderator or admin:

1. Navigate to the group
2. Click **"Members"**
3. Find the member you want to promote
4. Click the **three-dot menu** (⋯) next to their name
5. Select **"Make Moderator"** or **"Make Admin"**

**API: Change Member Role**
```bash
PUT /api/content/groups/:id/members/:userId/role
Content-Type: application/json

{
  "role": "moderator"
}
```

Valid roles: `member`, `moderator`, `admin`

### Removing a Member

To remove a member from the group:

1. Navigate to the group
2. Click **"Members"**
3. Find the member you want to remove
4. Click the **three-dot menu** (⋯) next to their name
5. Select **"Remove Member"**
6. Confirm the removal

**API: Remove Member**
```bash
DELETE /api/content/groups/:id/members/:userId
```

When a member is removed:
- They no longer see the group in their list
- They can no longer access group posts
- For private groups, they must request to join again
- For secret groups, they must receive a new invitation

## Group Events

### Creating an Event

Groups support event creation for organizing meetups, discussions, or activities.

**How to Create an Event:**
1. Go to your group
2. Click the **"Events"** tab
3. Click **"Create Event"**
4. Fill in the event details:
   - **Event Title**: Name of the event
   - **Description**: Details about the event
   - **Date & Time**: When the event occurs (timezone-aware)
   - **Location**: Physical location or "Online"
   - **Cover Image**: Optional event visual
5. Click **"Create"**

**Event Features:**
- RSVP tracking (Attending, Maybe, Not Attending)
- Event discussion thread
- Attendance notifications
- Shared calendar view
- Automated reminders (1 day, 1 hour before)

### Viewing and RSVPing

Members can:
- View all group events in the Events section
- See who else is attending
- RSVP with attendance status
- Add events to their personal calendar
- Receive event reminders

## Group Moderation Queue

Group admins and moderators can review and manage flagged content.

**Accessing the Moderation Queue:**
1. Go to your group
2. Click **Settings** (⚙️)
3. Select **"Moderation Queue"**

**What's in the Queue:**
- Posts reported by members as inappropriate
- Spam or self-promotion content
- Harassment or abusive comments
- Misinformation or rule violations

**Actions:**
- **Approve**: Keep the content visible
- **Remove**: Delete the content and warn the member
- **Warn Member**: Send a warning without removing content
- **Ban Member**: Remove the member from the group and prevent rejoining

## Group Analytics

### Accessing Analytics

Group admins and moderators can view analytics at:
1. Group Settings (⚙️) → **"Analytics"**

### Available Metrics

**Member Growth**
- Total members over time
- New members this month
- Growth chart (7-day, 30-day, 90-day views)
- Most active members list

**Post Engagement**
- Total posts this month
- Average reactions per post
- Most popular posts
- Post engagement trends
- Comment activity

**Activity Overview**
- Daily active members
- Peak activity times
- Member retention rates
- Most active hours/days

**Audience Insights**
- Member demographics (if available)
- Member locations
- Join sources (direct, search, invitation, etc.)

### Data Export

Export analytics reports as:
- PDF summary report
- CSV data file
- Scheduled email reports (daily, weekly, monthly)

## Communities

### Creating a Community

Communities function similarly to groups but with additional features for larger-scale organization.

**Key Differences from Groups:**
- Communities support sub-communities (channels)
- Advanced governance and moderation tools
- Member tiers and permissions
- Community guidelines and rules
- Member verification
- Nomination and election systems

**API: Create a Community**
```bash
POST /api/content/communities
Content-Type: application/json

{
  "name": "Web Development Professionals",
  "description": "A community for web developers to share knowledge...",
  "privacy": "private",
  "category": "Technology",
  "coverImage": "https://cdn.example.com/cover.jpg",
  "communityRules": [
    "Be respectful to all members",
    "No spam or self-promotion without approval",
    "Share knowledge generously"
  ]
}
```

### Community Features

Communities include:
- **Sub-communities**: Create channels for specific topics
- **Member Roles**: Admin, Moderator, Contributor, Member, Guest
- **Governance Tools**: Voting on decisions, proposals, constitutional changes
- **Verification**: Verify member credentials or affiliations
- **Badge System**: Award badges for contributions and achievements
- **Extended Analytics**: Detailed metrics and reports
- **Content Library**: Organized wiki and resource collection

## Leaving a Group

### How to Leave

To leave a group:
1. Navigate to the group
2. Click **Settings** (⚙️) at the top right
3. Select **"Leave Group"**
4. Confirm in the dialog that appears: "Are you sure? You'll no longer receive updates from this group."

**Important Notes:**
- You can rejoin public and private groups anytime by requesting or clicking Join again
- You cannot rejoin secret groups unless invited again
- Your posts in the group remain visible to other members
- The group admins retain all group content

### After Leaving

- The group is removed from your groups list
- You stop receiving notifications about group activity
- Group posts no longer appear in your feed
- You cannot see new posts unless you rejoin

## Deleting a Group

### Group Deletion (Admin Only)

Only group admins can delete a group. This action is **permanent and irreversible**.

**How to Delete:**
1. Navigate to the group
2. Click **Settings** (⚙️)
3. Scroll to the bottom
4. Click **"Delete Group"**
5. Read the warning carefully
6. Type the group name to confirm deletion
7. Click **"Permanently Delete"**

### What Happens

When a group is deleted:
- All group posts and comments are deleted
- All members are automatically removed from the group
- The group is removed from all member feeds
- Member notification preferences are cleared
- Events associated with the group are cancelled
- The group name becomes available for reuse after 30 days

### Before Deleting

Consider:
- **Archive instead**: If you might need the group later, inform members and leave it inactive
- **Transfer leadership**: Make someone else an admin if you want the group to continue
- **Export data**: Screenshot or record important posts before deleting

## Best Practices

### For Group Creators

1. **Clear Guidelines**: Set expectations for member behavior in the description
2. **Regular Moderation**: Monitor the feed and manage inappropriate content promptly
3. **Engagement**: Post regularly to keep the group active and engaging
4. **Inclusive**: Welcome new members with introductions or welcome posts
5. **Organized**: Use events and features to structure group activities

### For Group Members

1. **Read First**: Review group description and rules before posting
2. **Respectful**: Maintain a positive, professional tone
3. **On-Topic**: Keep discussions relevant to the group's purpose
4. **Search First**: Check if your question has been answered before posting
5. **Report Issues**: Flag inappropriate content rather than engaging with it

## Troubleshooting

**Q: I can't see a group I joined**
- A: Check your Groups page. The group may be archived or you may have been removed by an admin.

**Q: My join request is pending, how long does it take?**
- A: Group admins usually review requests within 24-48 hours. You can send a message to an admin for faster review.

**Q: Can I change a group from public to private?**
- A: Yes, navigate to group Settings and update the privacy level. Existing members are not affected.

**Q: What happens to my posts if the group is deleted?**
- A: All group posts are permanently deleted when a group is deleted. Download or screenshot important content first.

**Q: Can members see previous posts after joining?**
- A: Yes, members can see all posts created while they were in the group, even if they joined later.

For more help, visit our [support center](https://support.milonexa.com) or contact our community team.
