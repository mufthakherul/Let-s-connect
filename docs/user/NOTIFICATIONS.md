# Notifications Guide

Welcome to the Milonexa Notifications guide. This comprehensive resource explains all notification types, management options, and how to customize your notification preferences.

## Types of Notifications

Milonexa sends notifications for various platform activities. Understanding notification types helps you stay informed about what matters most.

### Social Notifications

Notifications related to your posts and social interactions:

**Likes and Reactions**
- Someone liked your post
- Someone reacted (love, laugh, etc.) to your post
- Example: "Jane Smith loved your post"
- Shows which post was liked
- Click to view the post

**Comments**
- Someone commented on your post
- Someone replied to a comment you made
- Example: "John Developer commented on your post"
- Shows comment preview
- Click to view full discussion

**Mentions**
- Someone mentioned you with @username
- In posts, comments, or chat
- Example: "Jane Smith mentioned you: 'Great work, @john_smith!'"
- Helps you see when others reference you
- Click to view context

**Reposts**
- Someone shared/reposted your content
- Your post appears on their profile/followers' feeds
- Example: "Jane Smith reposted your article"
- Shows number of reposts
- Click to see who reposted

**Comments on Your Comments**
- Someone replied to a comment you made
- Thread-specific notifications
- Example: "John Developer replied to your comment"
- Helps you follow conversations
- Click to continue discussion

### Friend Notifications

Notifications about your friends and friend requests:

**Friend Request Received**
- Someone sent you a friend request
- Shows requester's name and profile
- Example: "Jane Smith sent you a friend request"
- Accept or Decline buttons
- Click profile to review before accepting

**Friend Request Accepted**
- Someone accepted your friend request
- You're now friends
- Example: "John Developer accepted your friend request"
- Can now see friend-only posts
- Can send direct messages

**Mutual Friend Connection**
- Someone you both know became friends
- Helps expand your network
- Example: "Jane Smith is now friends with John Developer (mutual friend)"
- Shows mutual connection
- Click to view their profile

### Message Notifications

Notifications about direct messages:

**New Direct Message**
- Someone sent you a direct message
- Shows sender name and message preview
- Example: "Jane Smith: 'Hey, want to grab coffee tomorrow?'"
- Click to open conversation
- Read message immediately

**New Group Message**
- New message in a group chat
- If you're mentioned, you receive notification
- Shows group name and message preview
- Only notified if @mentioned (can adjust settings)

**Message Reactions**
- Someone reacted to your message
- Emoji reaction on your DM
- Example: "Jane Smith reacted with 😂 to your message"

### Group Notifications

Notifications about groups you manage or participate in:

**Join Request Approved**
- Your request to join a private group was approved
- Example: "Your join request to 'Frontend Developers' was approved"
- Now can see group posts and participate
- Click to visit group

**Join Request Denied**
- Your request to join a group was declined
- Example: "Your join request to 'Private Group' was not approved"
- Can request again later if desired

**Someone Joined Your Group**
- A new member joined a group you manage
- Shows member's name
- Example: "Jane Smith joined 'Your Group Name'"
- As admin, you can manage new members
- Click to view member profile

**Post in Group You Manage**
- New post created in a group you administer
- Example: "3 new posts in 'Frontend Developers' (group you manage)"
- Helps you moderate and stay informed
- Click to review posts

**Group Announcement**
- Important announcement from group admins
- Appears as prominent notification
- Example: "Group announcement in 'Web Developers'"
- May include pinned posts or rules updates

### Shop Notifications

Notifications related to e-commerce features:

**Order Placed**
- Your order was successfully placed
- Shows order number and total
- Example: "Your order #12345 was placed - $149.99"
- Click for order details
- Track order status

**Order Shipped**
- Your order has been shipped
- Shows tracking number (if available)
- Example: "Your order #12345 has shipped"
- Click to view tracking information
- Estimate delivery date provided

**Order Delivered**
- Your order has been delivered
- Example: "Your order #12345 was delivered"
- Leave review option appears
- Click to confirm receipt

**Product Review**
- Someone left a review of your product (if seller)
- Shows review rating and text
- Example: "Jane Smith left a 5-star review on 'Your Product'"
- Respond to review
- Click to manage reviews

**Order Status Update**
- General order status changes
- Processing, preparing, ready for pickup, etc.
- Example: "Your order #12345 is ready for pickup"
- Click for details

### System Notifications

Platform announcements and security alerts:

**Platform Announcements**
- New feature releases and updates
- Scheduled maintenance notifications
- Policy changes
- Example: "Milonexa now supports video playlists!"
- Informational only
- May include action buttons

**Security Alerts**
- New login from new device
- Suspicious activity detected
- Password change confirmation
- Example: "New login from Chrome in New York"
- Review security status
- Confirm if it was you

**Verification Status**
- Page verification approved or denied
- Account verification status updates
- Example: "Your page verification was approved!"

**Account Issues**
- Violations of community guidelines
- Account warnings or suspensions (if applicable)
- Recovery notifications
- Example: "We need to verify your account"
- Click for instructions

### Page Notifications

Notifications for pages you manage:

**New Follower for Page**
- Someone followed one of your pages
- Shows follower name and count
- Example: "Jane Smith started following 'Your Brand'"
- New follower count updated in real-time

**Page Milestone**
- Page reaches milestone followers
- Example: "Congratulations! 'Your Brand' reached 10,000 followers"
- Celebratory notification
- Share achievement

## Viewing Notifications

### Bell Icon

**Location:**
- Top navigation bar, top-right area
- Shows as a bell icon (🔔)
- Displays red badge with unread count

**Badge Information:**
- Red dot: You have unread notifications
- Number badge: Shows count of unread (e.g., "5")
- No badge: All notifications read

**Clicking Bell Icon:**
1. Click the bell to open notifications panel
2. Dropdown or side panel appears
3. Shows recent notifications
4. Can scroll to see more
5. Shows "Notifications" page link

### Notifications Panel

**Layout:**
- Scrollable list of notifications
- Newest at top
- Shows unread notifications first
- Then read notifications
- Compact list format with summaries

**Notification Item Format:**
- **Icon/Avatar**: Shows type or person
- **Message**: Notification text
- **Time**: "2 hours ago", "Yesterday", "Jan 10"
- **Preview**: Additional context (optional)
- **Action Button**: Accept, Decline, Follow, etc.
- **Read Status**: Filled/unfilled circle indicates read

**Loading More:**
- Scroll to bottom of panel
- More notifications load automatically
- "Load More" button may appear
- Previously delivered notifications appear

### Viewing Full Notifications Page

**Access Full Notifications:**
1. Click bell icon (🔔) in top navigation
2. Click **"View All"** or **"See All Notifications"**
3. Or go directly to **/notifications**
4. Full-screen notifications page loads

**Full Page Features:**
- Complete notification list (no limit)
- Better organization and filtering
- Search and sort options
- Detailed view of each notification
- Faster loading for older notifications

## Managing Notifications

### Marking as Read

**Single Notification:**
1. Click any unread notification
2. Notification automatically marked as read
3. Visual change indicates read status
4. Redirects to notification content

**Batch Mark as Read:**
1. In notifications panel, find **"Mark All as Read"**
2. Click button at top of panel
3. All visible notifications marked as read
4. Badge disappears from bell icon

### API: Mark Notification as Read

```bash
PUT /api/user/notifications/:id/read
```

**Mark All as Read:**
```bash
PUT /api/user/notifications/mark-all-read
```

**Response:**
```json
{
  "success": true,
  "markedCount": 12
}
```

### Deleting Notifications

**Delete Single Notification:**
1. Hover over notification in list
2. Click **X** button or trash icon
3. Click **"Delete"** in confirmation
4. Notification removed
5. Cannot be recovered

**Delete Multiple Notifications:**
1. Select multiple notifications (checkboxes)
2. Click **"Delete Selected"** button
3. Confirm deletion
4. All selected notifications deleted

**Clear All Notifications:**
1. In notifications panel, click **"..."** (more options)
2. Select **"Clear All"**
3. WARNING: This deletes all notifications
4. Confirm the action
5. All notifications permanently deleted

### API: Delete Notification

```bash
DELETE /api/user/notifications/:id
```

**Clear All Notifications:**
```bash
DELETE /api/user/notifications
```

## Notification Preferences

### Accessing Settings

Configure which notifications you receive:

**Go to Notification Preferences:**
1. Click your profile icon (top-right)
2. Select **"Settings"** or **"Preferences"**
3. Find **"Notifications"** section
4. Or navigate to **/settings/notifications**

### Category Preferences

**Toggle Notification Categories:**

**Social**
- Toggle ON/OFF to receive social notifications
- Affects: Likes, comments, mentions, reposts
- Default: ON
- Uncheck to silence social notifications

**Messages**
- Toggle ON/OFF for direct message notifications
- Affects: New DMs, group messages, message reactions
- Default: ON
- Helpful when you want to stay focused

**Friend Requests**
- Toggle ON/OFF for friend request notifications
- Affects: Friend requests, acceptances
- Default: ON
- Some users disable to reduce notification volume

**Groups**
- Toggle ON/OFF for group notifications
- Affects: Join requests, member joins, group announcements
- Default: ON
- Group admins may want this ON to manage groups

**Shop**
- Toggle ON/OFF for shopping notifications
- Affects: Order updates, reviews, deliveries
- Default: ON
- Helpful for online shoppers

**System**
- Toggle ON/OFF for platform announcements
- Affects: Security alerts, feature announcements, maintenance
- Default: ON
- Recommended to keep ON for security alerts

**Page** (if applicable)
- Toggle ON/OFF for page follower notifications
- Affects: New page followers, page milestones
- Default: ON
- Useful for page creators

### Granular Notification Controls

**Per-Category Customization:**
1. Expand each category section
2. See sub-options for fine-tuning
3. Examples:
   - Social: Toggle "Likes" separately from "Comments"
   - Messages: DMs vs. Group chats
   - Shop: Orders vs. Reviews

**Sound & Vibration:**
- Toggle notification sounds ON/OFF
- Vibration for mobile devices
- Choose specific sound per category
- Silent mode option

**Desktop Notifications:**
- Browser pop-up notifications
- Appears even when tab not focused
- Click to jump to notification content
- Requires browser permission

### API: Get Notification Preferences

```bash
GET /api/user/notifications/preferences
```

**Response:**
```json
{
  "social": true,
  "messages": true,
  "friendRequests": true,
  "groups": true,
  "shop": true,
  "system": true,
  "pages": true,
  "sound": true,
  "vibration": true,
  "desktopNotifications": true
}
```

### API: Update Notification Preferences

```bash
PUT /api/user/notifications/preferences
Content-Type: application/json

{
  "social": true,
  "messages": false,
  "friendRequests": true,
  "groups": true,
  "shop": false,
  "system": true,
  "sound": true
}
```

## Email Notifications

### Email Notification Settings

Milonexa can send email summaries and important alerts:

**Accessing Email Settings:**
1. Go to Settings → **"Email Preferences"**
2. Separate from in-app notifications
3. Control email delivery separately

### Email Notification Types

**Digest Emails**
- Daily digest: Summary of day's activity
- Weekly digest: Summary of week's activity
- Contains top posts, engagement, messages
- Sent at preferred time
- Unsubscribe anytime

**Real-Time Important Emails**
- Security alerts: Unusual login attempts, password changes
- Order updates: Important shopping notifications
- Moderation: If your content was removed
- Account issues: Suspension warnings, verification requests
- Sent immediately when important

**Newsletter**
- Platform announcements
- New features
- Community highlights
- Typically weekly or monthly
- Unsubscribe option at bottom of email

### Email Preference Options

**Frequency Selection:**
- **Never**: Don't send digest emails
- **Daily**: One email per day
- **Weekly**: One email per week
- **Monthly**: One email per month
- **Real-time**: Only for critical alerts

**Time of Delivery:**
- Choose preferred time for digest emails
- Respects your timezone
- Example: "9:00 AM every Monday"

**Content Selection:**
- Choose what to include in digests
- Posts you might like
- Messages summary
- Engagement on your content
- New followers
- Group activity (if in groups)

## Push Notifications

### Web Push Notifications

Browser notifications delivered directly to your device:

**Browser Support:**
- Chrome, Firefox, Safari, Edge
- Requires permission (one-time dialog)
- Can be disabled in browser settings

**Enable Web Push:**
1. Click bell icon notification
2. Look for **"Enable Notifications"** option
3. Browser permission dialog appears
4. Click **"Allow"** to enable
5. Web push now active

**Disable Web Push:**
1. Go to Settings → **"Notifications"**
2. Find **"Web Push"** option
3. Toggle OFF
4. No more browser notifications

**Desktop Notifications:**
- Pop-up appears on your device
- Appears even when browser in background
- Click notification to jump to content
- Close to dismiss

### Mobile Notifications

If using Milonexa mobile app:
- Push notifications to lock screen
- App icon badge shows count
- Configure in app settings
- Separate settings from web version

## Real-Time Notification Delivery

### How Notifications Are Delivered

**Socket.io (Real-Time)**
- Instant delivery when subscribed
- Active websocket connection to server
- Best for responsive experience
- Used when browser/app is active

**Polling Fallback**
- If websocket unavailable
- Checks for new notifications periodically
- Slightly delayed but reliable
- Used as backup

**Email/Push**
- Important notifications sent via email
- Push notifications to devices
- Doesn't rely on active connection
- Ensures critical notifications reach you

### Notification Latency

**Real-Time (Instant):**
- If online and websocket connected: < 1 second
- Notifications appear immediately

**Delayed:**
- If offline or low connection: 5-30 seconds
- Delivered when connection restored
- All notifications queued and delivered

**Email Digest:**
- Batched and sent at scheduled time
- 5 minutes to 1 hour delay
- Reliable even if offline

## Advanced Notification Features

### Do Not Disturb Mode

**Activate Do Not Disturb:**
1. Go to Settings → **"Notifications"**
2. Find **"Do Not Disturb"** option
3. Toggle ON to activate
4. Set duration (1 hour, until tomorrow, until disabled)
5. All notifications silenced but logged

**During Do Not Disturb:**
- No sounds or vibrations
- No browser notifications
- No email notifications
- Notifications still recorded
- View them when checking app

### Notification Scheduling

**Quiet Hours:**
1. Settings → **"Notifications"** → **"Quiet Hours"**
2. Set start time and end time
3. Example: 10 PM to 8 AM
4. Critical alerts still send
5. Regular notifications silenced during quiet hours

### Snooze Notifications

**Snooze Reminders:**
1. On any notification, click **"Snooze"**
2. Choose snooze duration:
   - 5 minutes
   - 1 hour
   - Tomorrow
   - Next week
3. Notification reappears at selected time
4. Helpful for dealing with later

## Best Practices

### Managing Notification Overload

1. **Turn Off Unnecessary**: Disable categories you don't need
2. **Use Quiet Hours**: Set quiet hours for focused work
3. **Digest Instead of Real-Time**: Use daily digest instead of all notifications
4. **Mute Specific People**: Silence notifications from frequent posters
5. **Unfollow Noisy Hashtags**: Stop following hashtags with too many posts
6. **Clear Regularly**: Delete old notifications to keep list clean

### Staying Informed Without Overload

**Suggested Settings:**
- Social: ON (keep connected)
- Messages: ON (don't miss conversations)
- Friend Requests: ON (stay connected)
- Groups: OFF unless managing
- Shop: ON if online shopper
- System: ON (security is important)
- Sound: OFF for focus
- Email Digest: Daily or weekly
- Quiet Hours: During sleep/work

### Security Best Practices

- **Enable Security Alerts**: Keep system ON
- **Review New Logins**: Check new device notifications
- **Monitor Account**: Watch for suspicious activity
- **Verify Email Changes**: Confirm account changes via email
- **Use 2FA**: Additional security measure (if available)

## Troubleshooting

**Q: I'm not receiving notifications but I enabled them.**
- A: Check notification permissions in browser settings, ensure socket connection is active, try clearing browser cache.

**Q: Why am I getting duplicate notifications?**
- A: If you have both web and email enabled, you'll get duplicates. Disable one channel or adjust settings.

**Q: How do I mute notifications from one person?**
- A: Go to their profile, click menu, select "Mute" to silence their notifications without unfollowing.

**Q: Can I schedule notifications for specific times?**
- A: You can set Quiet Hours for automatic muting. Email digest notifications can be scheduled.

**Q: Why is notification badge not disappearing?**
- A: Clear browser cache or restart browser. Sometimes badge doesn't update immediately.

**Q: How do I get notifications for only important events?**
- A: Disable non-critical categories and enable only Messages, Security, and Key alerts.

For additional help with notifications, visit [support.milonexa.com](https://support.milonexa.com).
