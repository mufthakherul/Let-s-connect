# Social Features Guide

Welcome to the Milonexa Social Platform! This guide covers all the social features available to help you connect, communicate, and share with others in our community.

## Table of Contents

1. [Social Feed vs Homepage](#social-feed-vs-homepage)
2. [Creating Posts](#creating-posts)
3. [Post Reactions](#post-reactions)
4. [Comments and Discussions](#comments-and-discussions)
5. [Reposts and Shares](#reposts-and-shares)
6. [Friends System](#friends-system)
7. [Follow and Unfollow](#follow-and-unfollow)
8. [Friend Suggestions](#friend-suggestions)
9. [Profiles and Mutual Friends](#profiles-and-mutual-friends)
10. [Skills and Endorsements](#skills-and-endorsements)
11. [Feed Algorithm](#feed-algorithm)

---

## Social Feed vs Homepage

### Homepage (/)

The **Homepage** is your personalized dashboard that displays:
- Curated widgets with important information
- Account statistics and activity summary
- Quick-access shortcuts to main features
- Personalized recommendations
- Recent activity highlights

### Social Feed (/feed)

The **Social Feed** is your real-time social stream that displays:
- Posts from friends and people you follow
- Content ranked by engagement and relevance
- Real-time updates as your network posts
- Trending topics within your network
- Stories and moments from close friends

Navigate to `/feed` to view your social feed or stay on `/` to access your dashboard.

---

## Creating Posts

### Text Posts

Create engaging text-based posts to share your thoughts and updates:
- **Character Limit**: 5,000 characters maximum
- **Formatting**: Support for basic text formatting (bold, italic, links)
- **Mentions**: Tag other users with @username
- **Hashtags**: Organize content with #hashtag
- **Links**: Auto-preview embedded links

### Media Attachments

Enhance your posts with rich media:

**Images**
- Maximum 4 images per post
- Supported formats: JPG, PNG, WebP, GIF
- Image size: Up to 10MB per image
- Auto-compression for optimization

**Videos**
- Maximum 1 video per post
- Supported formats: MP4, WebM, MOV
- Max duration: 10 minutes
- Max file size: 100MB
- Auto-transcoding for various devices

**Files**
- Maximum 3 file attachments
- Supported types: PDF, DOC, DOCX, XLS, XLSX, ZIP, etc.
- Max file size: 50MB per file
- Automatically encrypted for security

### Emoji Picker

Express yourself with 1,500+ emojis:
- **Access**: Click the emoji icon in the post composer
- **Search**: Search emojis by keyword (e.g., "smile" or "party")
- **Frequent**: Your most-used emojis appear at the top
- **Custom reactions**: Create custom emoji packs (Premium feature)

### Post Visibility Settings

Control who can see your posts:

**Public**
- Visible to all users on the platform
- Searchable and shareable
- Can appear in trending sections
- Friends of friends can discover and engage

**Friends Only**
- Visible only to your confirmed friends
- Not searchable publicly
- Cannot be shared with non-friends
- Restricted engagement from non-friends

**Private**
- Visible only to you
- Perfect for personal drafts or notes
- Cannot be shared or interacted with by others
- Private backup and archival

### Creating a Post - API Reference

**Endpoint**: `POST /api/content/posts`

**Request Body**:
```json
{
  "content": "This is my post content",
  "attachments": [
    {
      "type": "image",
      "url": "https://cdn.example.com/image.jpg"
    },
    {
      "type": "video",
      "url": "https://cdn.example.com/video.mp4"
    },
    {
      "type": "file",
      "url": "https://cdn.example.com/document.pdf"
    }
  ],
  "visibility": "public",
  "mentions": ["user123", "user456"],
  "hashtags": ["milonexa", "social"]
}
```

**Response**:
```json
{
  "id": "post_abc123",
  "userId": "user_xyz789",
  "content": "This is my post content",
  "visibility": "public",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "likes": 0,
  "comments": 0,
  "reposts": 0
}
```

---

## Post Reactions

Express your feelings about posts with 6 reaction types:

| Emoji | Name | Usage |
|-------|------|-------|
| 👍 | Like | General approval and support |
| ❤️ | Love | Deep appreciation and connection |
| 😂 | Laugh | Funny and entertaining content |
| 😮 | Wow | Surprising or impressive content |
| 😢 | Sad | Sympathetic or emotional content |
| 😠 | Angry | Disagreement or frustration |

### Adding a Reaction

**Endpoint**: `POST /api/content/posts/:id/react`

**Request Body**:
```json
{
  "reactionType": "like"
}
```

Supported reaction types: `like`, `love`, `laugh`, `wow`, `sad`, `angry`

**Response**:
```json
{
  "postId": "post_abc123",
  "userId": "user_xyz789",
  "reactionType": "like",
  "createdAt": "2024-01-15T10:35:00Z",
  "totalReactions": {
    "like": 45,
    "love": 12,
    "laugh": 8,
    "wow": 3,
    "sad": 1,
    "angry": 0
  }
}
```

### Removing a Reaction

**Endpoint**: `DELETE /api/content/posts/:id/react`

**Request Body**:
```json
{
  "reactionType": "like"
}
```

Remove your reaction to a post and update the reaction count.

### Viewing Reactions

View who reacted to a post:

**Endpoint**: `GET /api/content/posts/:id/reactions`

**Query Parameters**:
- `reactionType`: Filter by specific reaction type (optional)
- `limit`: Number of results (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)

---

## Comments and Discussions

### Adding Comments

Engage in discussions by commenting on posts:

**Endpoint**: `POST /api/content/posts/:id/comments`

**Request Body**:
```json
{
  "content": "Great post! I totally agree.",
  "attachments": []
}
```

**Response**:
```json
{
  "id": "comment_def456",
  "postId": "post_abc123",
  "userId": "user_xyz789",
  "content": "Great post! I totally agree.",
  "createdAt": "2024-01-15T10:40:00Z",
  "likes": 0,
  "replies": 0
}
```

### Reply Threads

Create nested reply threads for organized discussions:

**Endpoint**: `POST /api/content/posts/:id/comments/:commentId/replies`

**Request Body**:
```json
{
  "content": "Thanks for your input!",
  "attachments": []
}
```

Replies maintain context within the parent comment, creating a threaded conversation.

### Editing Comments

Update your own comments within 24 hours:

**Endpoint**: `PATCH /api/content/comments/:commentId`

**Request Body**:
```json
{
  "content": "Updated comment content"
}
```

### Deleting Comments

Remove your comments anytime:

**Endpoint**: `DELETE /api/content/comments/:commentId`

Deleted comments are removed but conversation context is preserved.

### Comment Features

- **Mentions**: Tag users in comments with @username
- **Reactions**: React to comments with the same 6 reaction types
- **Threading**: View nested replies in collapse/expand format
- **Editing History**: Track comment edits (shown to other users)

---

## Reposts and Shares

### Resharing Posts

Amplify great content by resharing with your followers:

**Endpoint**: `POST /api/content/posts/:id/repost`

**Request Body**:
```json
{
  "addedComment": "You should see this!"
}
```

**Response**:
```json
{
  "id": "repost_ghi789",
  "originalPostId": "post_abc123",
  "userId": "user_xyz789",
  "addedComment": "You should see this!",
  "createdAt": "2024-01-15T10:45:00Z"
}
```

### Repost Visibility

- Reposts are visible to all your followers
- Original author receives notification
- Full attribution to original creator maintained
- Can add your own comment when resharing

### Unreposting

**Endpoint**: `DELETE /api/content/posts/:id/reposts/:repostId`

Remove a repost from your feed and followers' feeds.

---

## Friends System

### Sending Friend Requests

Initiate friendships with other users:

**Endpoint**: `POST /api/user/friends/request/:userId`

**Request Body**:
```json
{
  "message": "Hey! I'd love to connect with you." // Optional personal message
}
```

**Response**:
```json
{
  "id": "request_jkl012",
  "fromUserId": "user_xyz789",
  "toUserId": "user_abc123",
  "status": "pending",
  "message": "Hey! I'd love to connect with you.",
  "createdAt": "2024-01-15T11:00:00Z"
}
```

### Accepting Friend Requests

Accept pending friend requests:

**Endpoint**: `POST /api/user/friends/request/:requestId/accept`

**Response**:
```json
{
  "id": "friendship_mno345",
  "userId1": "user_xyz789",
  "userId2": "user_abc123",
  "status": "accepted",
  "createdAt": "2024-01-15T11:05:00Z"
}
```

### Declining Friend Requests

Decline requests you're not interested in:

**Endpoint**: `DELETE /api/user/friends/request/:requestId`

The request is removed and the requesting user is not notified of rejection.

### Unfriending

Remove existing friendships:

**Endpoint**: `DELETE /api/user/friends/:userId`

**Response**:
```json
{
  "status": "success",
  "message": "Friendship removed"
}
```

### Friend List

Retrieve your friends list:

**Endpoint**: `GET /api/user/friends`

**Query Parameters**:
- `limit`: Results per page (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)
- `search`: Search friends by name

---

## Follow and Unfollow

### Following Users

Follow users asymmetrically (without being friends):

**Endpoint**: `POST /api/user/follow/:userId`

**Response**:
```json
{
  "id": "follow_pqr678",
  "followerId": "user_xyz789",
  "followingId": "user_abc123",
  "createdAt": "2024-01-15T11:10:00Z"
}
```

### Unfollowing Users

Stop following users anytime:

**Endpoint**: `DELETE /api/user/follow/:userId`

**Response**:
```json
{
  "status": "success",
  "message": "Unfollowed successfully"
}
```

### Following Permissions

- **Public accounts**: Follow anyone immediately
- **Private accounts**: Send follow request, awaiting approval
- **Friends**: Automatically following (if friendship exists)
- **Blocking**: Cannot follow blocked users

---

## Friend Suggestions

### Getting Suggestions

Receive personalized friend suggestions based on your network:

**Endpoint**: `GET /api/user/friends/suggestions`

**Query Parameters**:
- `limit`: Number of suggestions (default: 10, max: 50)
- `offset`: Pagination offset

**Response**:
```json
{
  "suggestions": [
    {
      "userId": "user_def456",
      "name": "Jane Smith",
      "avatar": "https://cdn.example.com/avatar.jpg",
      "mutualFriendsCount": 5,
      "mutualFriends": [
        { "id": "user_123", "name": "John Doe" },
        { "id": "user_456", "name": "Bob Wilson" }
      ],
      "commonInterests": ["technology", "music", "travel"]
    }
  ]
}
```

### How Suggestions Work

- **Mutual Friends**: Suggestions based on shared friend connections
- **Common Interests**: Users with similar skills and endorsements
- **Activity Similarity**: Based on similar post engagement
- **Network Growth**: Regularly updated to help expand your circle

---

## Profiles and Mutual Friends

### Viewing Profiles

Access user profiles to see:
- Profile information (bio, location, links)
- Mutual friends count
- Shared interests and skills
- Recent posts and activity
- Follow/friend status

**Profile URL**: `/profile/:userId`

### Mutual Friends

View friends you have in common:

**Endpoint**: `GET /api/user/:userId/mutual-friends`

**Response**:
```json
{
  "mutualFriendsCount": 7,
  "mutualFriends": [
    {
      "id": "user_123",
      "name": "John Doe",
      "avatar": "https://cdn.example.com/avatar1.jpg"
    },
    {
      "id": "user_456",
      "name": "Bob Wilson",
      "avatar": "https://cdn.example.com/avatar2.jpg"
    }
  ]
}
```

### Mutual Friends Display

- Shown on user profiles
- Displayed in friend suggestions
- Helps establish trust and common ground
- Quick way to strengthen connections

---

## Skills and Endorsements

### Adding Skills to Profile

Build your professional profile with relevant skills:

**Endpoint**: `POST /api/user/skills`

**Request Body**:
```json
{
  "skill": "Python Programming",
  "category": "technical"
}
```

**Response**:
```json
{
  "id": "skill_stu901",
  "userId": "user_xyz789",
  "skill": "Python Programming",
  "category": "technical",
  "endorsements": 0,
  "createdAt": "2024-01-15T11:15:00Z"
}
```

### Endorsing Skills

Endorse others' skills to build their credibility:

**Endpoint**: `POST /api/user/:userId/skills/:skillId/endorse`

**Response**:
```json
{
  "skillId": "skill_stu901",
  "endorserId": "user_xyz789",
  "endorsedUserId": "user_abc123",
  "totalEndorsements": 15,
  "createdAt": "2024-01-15T11:20:00Z"
}
```

### Skill Categories

- Technical (Programming, Design, DevOps)
- Business (Leadership, Management, Strategy)
- Creative (Writing, Design, Music)
- Language (English, Spanish, Mandarin)
- Other (Custom skills)

### Skill Endorsements

- Each user can endorse a skill once
- Endorsements visible on skill profile
- Top endorsed skills appear prominently
- Endorsements boost professional credibility

---

## Feed Algorithm

### How the Feed Works

The Milonexa feed uses an intelligent algorithm to show relevant content:

**Ranking Factors**:
1. **Chronological Priority**: Recent posts appear first
2. **Close Friend Boost**: Content from close friends gets higher priority
3. **Engagement**: Highly interacted posts are boosted
4. **Relevance**: Posts matching your interests
5. **Relationship Strength**: More interaction with a user = higher priority
6. **Content Freshness**: Newer content generally ranks higher

### Close Friends

Designate close friends for boosted visibility:

**Endpoint**: `POST /api/user/:userId/close-friends`

Close friends' posts:
- Appear earlier in your feed
- Get notification priority
- Are marked with a special indicator
- Can have stories that show higher

### Feed Customization

Personalize your feed experience:

**Endpoint**: `PATCH /api/user/feed-preferences`

**Request Body**:
```json
{
  "hideReposts": false,
  "muteKeywords": ["politics", "sports"],
  "priorityTopics": ["technology", "business"],
  "hideFromUser": ["user_xyz"],
  "allowRecommendations": true
}
```

### Feed Muting

- **Mute Users**: Stop seeing posts from specific users (they don't know)
- **Mute Keywords**: Hide posts containing specific words
- **Mute Topics**: Control content types in your feed
- **Mute Notifications**: Reduce notification frequency for users

### Feed Refresh

- Manual refresh pulls latest posts
- Auto-refresh available on mobile app
- Infinite scroll loads more content
- Notification badge shows new posts available

---

## Tips for Engaging with Social Features

1. **Create Consistently**: Post regularly to maintain visibility
2. **Engage Authentically**: Respond to comments and reactions genuinely
3. **Build Relationships**: Use friend requests and follows to expand network
4. **Use Visibility Controls**: Choose appropriate privacy levels for sensitive posts
5. **Endorse Others**: Build community by endorsing skills and achievements
6. **Follow Interests**: Use hashtags and topics to discover relevant content
7. **Respect Privacy**: Honor others' privacy settings and boundaries

---

## Troubleshooting

**Posts not appearing in feed?**
- Check post visibility settings
- Ensure you're following the poster or they're a friend
- Refresh your feed

**Friend request not sent?**
- Verify user isn't already a friend
- Check if they've blocked you
- Ensure correct user ID

**Reactions not showing?**
- Refresh the post
- Check internet connection
- Clear browser cache

For additional support, contact our support team at support@milonexa.com.
