# Messaging Guide

Stay connected with direct messages, servers, and real-time communication. This guide covers all messaging features available on Milonexa.

## Table of Contents

1. [Direct Messages (DMs)](#direct-messages-dms)
2. [Message Features](#message-features)
3. [Discord-Style Servers](#discord-style-servers)
4. [Server Management](#server-management)
5. [Voice Channels](#voice-channels)
6. [Real-Time Features](#real-time-features)
7. [Push Notifications](#push-notifications)
8. [File Sharing](#file-sharing)
9. [Scheduled Messages](#scheduled-messages)

---

## Direct Messages (DMs)

### Creating a Conversation

Start a direct message with any user on the platform:

**Via UI**:
- Click the "New Message" button
- Search and select a user
- Start typing your message

**Via API**:

**Endpoint**: `POST /api/messaging/conversations`

**Request Body**:
```json
{
  "participantIds": ["user_abc123"],
  "name": "Alex Smith", // Optional for DM
  "type": "direct"
}
```

**Response**:
```json
{
  "id": "conv_def456",
  "type": "direct",
  "participants": [
    {
      "id": "user_xyz789",
      "name": "You",
      "avatar": "https://cdn.example.com/avatar.jpg"
    },
    {
      "id": "user_abc123",
      "name": "Alex Smith",
      "avatar": "https://cdn.example.com/avatar2.jpg"
    }
  ],
  "createdAt": "2024-01-15T12:00:00Z",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

### Viewing Conversations

Retrieve all your conversations:

**Endpoint**: `GET /api/messaging/conversations`

**Query Parameters**:
- `limit`: Results per page (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)
- `type`: Filter by type - "direct", "server", "group"
- `search`: Search conversations by name

**Response**:
```json
{
  "conversations": [
    {
      "id": "conv_def456",
      "name": "Alex Smith",
      "type": "direct",
      "lastMessage": {
        "content": "See you tomorrow!",
        "timestamp": "2024-01-15T14:30:00Z"
      },
      "unreadCount": 2,
      "participants": [...]
    }
  ],
  "pageInfo": {
    "total": 42,
    "hasMore": true
  }
}
```

### Selecting a User

When creating a DM, you can:
- Search by username, email, or display name
- View mutual friends before starting conversation
- See their profile preview
- Block or report before messaging

---

## Message Features

### Sending Messages

Send text messages in conversations:

**Endpoint**: `POST /api/messaging/conversations/:conversationId/messages`

**Request Body**:
```json
{
  "content": "Hey! How are you doing?",
  "attachments": []
}
```

**Response**:
```json
{
  "id": "msg_ghi789",
  "conversationId": "conv_def456",
  "senderId": "user_xyz789",
  "content": "Hey! How are you doing?",
  "timestamp": "2024-01-15T14:35:00Z",
  "read": true,
  "reactions": []
}
```

### Text Messages

- **Length**: No character limit for text messages
- **Formatting**: Support for links, mentions (@username)
- **Emoji**: Full emoji support with emoji picker
- **Auto-linking**: URLs automatically converted to clickable links
- **Preview**: Website previews for links sent

### File Attachments

Attach files to your messages:

**Supported Types**:
- Images: JPG, PNG, WebP, GIF, SVG
- Documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- Archives: ZIP, RAR, 7Z
- Audio: MP3, WAV, FLAC, OGG
- Video: MP4, WebM, MOV, AVI

**Maximum Sizes**:
- Images: 10MB each
- Videos: 100MB each
- Documents: 50MB each
- Total attachments: 5 per message

### Emoji in Messages

Express yourself with emojis:
- **Emoji Picker**: Click emoji button in message compose
- **Frequent Emojis**: Your most-used emojis appear first
- **Search**: Search emojis by keyword
- **Emoji Reactions**: React to messages with emoji

### Replying to Messages

Quote and respond to specific messages:

**Endpoint**: `POST /api/messaging/conversations/:conversationId/messages`

**Request Body**:
```json
{
  "content": "I couldn't agree more!",
  "replyToMessageId": "msg_ghi789"
}
```

**Response**:
```json
{
  "id": "msg_jkl012",
  "conversationId": "conv_def456",
  "senderId": "user_xyz789",
  "content": "I couldn't agree more!",
  "replyTo": {
    "id": "msg_ghi789",
    "content": "Hey! How are you doing?",
    "senderName": "Alex Smith"
  },
  "timestamp": "2024-01-15T14:40:00Z"
}
```

### Forwarding Messages

Share messages to other conversations:

**Endpoint**: `POST /api/messaging/messages/:messageId/forward`

**Request Body**:
```json
{
  "toConversationIds": ["conv_mno345", "conv_pqr678"]
}
```

Forward multiple messages to different conversations at once.

### Pinning Messages

Pin important messages in a conversation:

**Endpoint**: `POST /api/messaging/conversations/:conversationId/pins`

**Request Body**:
```json
{
  "messageId": "msg_ghi789"
}
```

**Response**:
```json
{
  "id": "pin_stu901",
  "conversationId": "conv_def456",
  "messageId": "msg_ghi789",
  "pinnedBy": "user_xyz789",
  "pinnedAt": "2024-01-15T14:45:00Z"
}
```

Pinned messages appear in a special section accessible to all participants.

### Message Reactions

React to messages with emoji:

**Endpoint**: `POST /api/messaging/messages/:messageId/reactions`

**Request Body**:
```json
{
  "emoji": "👍"
}
```

**Response**:
```json
{
  "messageId": "msg_ghi789",
  "reactions": [
    {
      "emoji": "👍",
      "count": 3,
      "users": ["user_xyz789", "user_abc123", "user_def456"]
    },
    {
      "emoji": "❤️",
      "count": 1,
      "users": ["user_ghi789"]
    }
  ]
}
```

### Read Receipts

Track message read status:

**Features**:
- Seen indicator: Shows when message is read
- Typing indicator: See when someone is typing
- Online status: See if user is currently active
- Last seen: Timestamp of last activity

**Endpoint**: `POST /api/messaging/messages/:messageId/read`

Automatically triggered when viewing a message.

### Message Editing

Edit your messages within 24 hours:

**Endpoint**: `PATCH /api/messaging/messages/:messageId`

**Request Body**:
```json
{
  "content": "Updated message content"
}
```

**Response**:
```json
{
  "id": "msg_ghi789",
  "content": "Updated message content",
  "edited": true,
  "editedAt": "2024-01-15T14:50:00Z"
}
```

All participants see "(edited)" indicator on modified messages.

### Message Deletion

Delete messages anytime:

**Endpoint**: `DELETE /api/messaging/messages/:messageId`

**Response**:
```json
{
  "status": "success",
  "message": "Message deleted"
}
```

For the sender: Message is completely removed.
For others: Message shows as "deleted" with no content.

---

## Discord-Style Servers

Milonexa supports Discord-style servers for team communication and community management.

### Creating a Server

Create a new server for group communication:

**Endpoint**: `POST /api/messaging/servers`

**Request Body**:
```json
{
  "name": "Product Development Team",
  "description": "Discussions about our product development initiatives",
  "icon": "https://cdn.example.com/server-icon.png",
  "isPublic": false,
  "maxMembers": 500
}
```

**Response**:
```json
{
  "id": "server_vwx234",
  "name": "Product Development Team",
  "description": "Discussions about our product development initiatives",
  "icon": "https://cdn.example.com/server-icon.png",
  "ownerId": "user_xyz789",
  "isPublic": false,
  "maxMembers": 500,
  "memberCount": 1,
  "inviteCode": "PROD2024ABC",
  "createdAt": "2024-01-15T15:00:00Z"
}
```

### Viewing Servers

Retrieve your servers list:

**Endpoint**: `GET /api/messaging/servers`

**Query Parameters**:
- `limit`: Results per page (default: 20)
- `offset`: Pagination offset
- `owned`: Filter owned servers only
- `search`: Search by server name

### Server Invite Codes

Share servers with others via invite codes:

**Features**:
- **Auto-generated**: Unique code created for each server
- **Custom URLs**: Create readable invite links
- **One-time Use**: Optional single-use invites
- **Expiration**: Set invite code expiration dates
- **Revocation**: Disable old invite codes anytime

**Generating an Invite**:

**Endpoint**: `POST /api/messaging/servers/:serverId/invites`

**Request Body**:
```json
{
  "maxUses": 5, // Optional: null for unlimited
  "expiresIn": 86400 // Optional: seconds until expiration
}
```

**Response**:
```json
{
  "code": "PROD2024ABC",
  "inviteUrl": "https://milonexa.com/join/PROD2024ABC",
  "expiresAt": "2024-01-16T15:00:00Z",
  "maxUses": 5,
  "currentUses": 0
}
```

### Joining a Server

Join via invite code:

**Endpoint**: `POST /api/messaging/servers/join`

**Request Body**:
```json
{
  "inviteCode": "PROD2024ABC"
}
```

Users can join via the UI or API with a valid invite code.

---

## Server Management

### Categories

Organize channels into categories:

**Features**:
- Group related channels
- Collapse/expand categories
- Set category permissions
- Reorder categories and channels

**Creating Categories**:

**Endpoint**: `POST /api/messaging/servers/:serverId/categories`

**Request Body**:
```json
{
  "name": "General",
  "position": 0
}
```

### Text Channels

Create text channels for discussions:

**Endpoint**: `POST /api/messaging/servers/:serverId/channels`

**Request Body**:
```json
{
  "name": "announcements",
  "description": "Important announcements for the team",
  "type": "text",
  "categoryId": "cat_yz123",
  "isPrivate": false
}
```

**Features**:
- Threaded conversations
- Channel topics and descriptions
- Message history and search
- Pinned messages
- Custom permissions

### Voice Channels

Create voice channels for audio communication:

**Endpoint**: `POST /api/messaging/servers/:serverId/channels`

**Request Body**:
```json
{
  "name": "general-voice",
  "description": "Voice channel for team discussions",
  "type": "voice",
  "categoryId": "cat_yz123",
  "maxParticipants": 50,
  "bitrate": 128
}
```

**Voice Channel Features**:
- Multi-user voice communication
- Screen sharing
- Voice activity detection
- Quality adjustable bitrate
- Participant management

### Channel Permissions

Set granular permissions for channels:

**Endpoint**: `PATCH /api/messaging/servers/:serverId/channels/:channelId/permissions`

**Request Body**:
```json
{
  "roleId": "role_abc123",
  "permissions": {
    "sendMessages": true,
    "deleteMessages": false,
    "manageChannel": false,
    "viewChannel": true,
    "readMessageHistory": true,
    "startVoiceSession": true
  }
}
```

### Member Management

Manage server members:

**Endpoints**:
- `GET /api/messaging/servers/:serverId/members` - List members
- `POST /api/messaging/servers/:serverId/members/:userId/kick` - Remove member
- `POST /api/messaging/servers/:serverId/members/:userId/ban` - Ban member
- `PATCH /api/messaging/servers/:serverId/members/:userId/roles` - Assign roles

### Server Roles

Create and manage roles with different permissions:

**Endpoint**: `POST /api/messaging/servers/:serverId/roles`

**Request Body**:
```json
{
  "name": "Moderator",
  "color": "#FF5500",
  "permissions": {
    "sendMessages": true,
    "deleteMessages": true,
    "manageChannel": true,
    "banMembers": true,
    "manageRoles": false
  }
}
```

---

## Voice Channels

### Joining a Voice Channel

Join to start talking with others:

**Features**:
- Automatic connection
- Audio device selection
- Microphone testing
- Voice activity detection
- Noise suppression

### Audio Controls

**During Voice Call**:

**Mute/Unmute**:

**Endpoint**: `POST /api/messaging/voice/:channelId/mute`

```json
{
  "muted": true
}
```

**Camera Toggle**:

**Endpoint**: `POST /api/messaging/voice/:channelId/camera`

```json
{
  "enabled": false
}
```

**Screen Share**:

**Endpoint**: `POST /api/messaging/voice/:channelId/screen-share`

```json
{
  "sharing": true
}
```

### Leaving Voice Channels

**Endpoint**: `POST /api/messaging/voice/:channelId/leave`

Automatically disconnects audio and updates participant list.

### Voice Channel Features

- **Clear Audio**: Opus codec for high-quality audio
- **Low Latency**: Real-time voice communication
- **Echo Cancellation**: Automatic echo reduction
- **Noise Gate**: Minimize background noise
- **Server Recording**: Optional conversation recording (with consent)

---

## Real-Time Features

Milonexa uses **Socket.io** for real-time messaging powered by WebSockets.

### WebSocket Connection

**Connection Details**:
- **Development**: `ws://localhost:8003`
- **Production**: `wss://api.milonexa.com` (WSS/TLS)
- **Namespace**: `/messaging`
- **Authentication**: Bearer token in handshake

**Connection Example**:
```javascript
const io = require('socket.io-client');

const socket = io('wss://api.milonexa.com/messaging', {
  auth: {
    token: 'your-bearer-token'
  }
});

socket.on('connect', () => {
  console.log('Connected to Milonexa messaging');
});
```

### Socket Events

#### Listening for New Messages

**Event**: `new-message`

```javascript
socket.on('new-message', (message) => {
  console.log('New message:', message);
  // {
  //   id: 'msg_jkl012',
  //   conversationId: 'conv_def456',
  //   senderId: 'user_abc123',
  //   content: 'Hello there!',
  //   timestamp: '2024-01-15T15:30:00Z'
  // }
});
```

#### Typing Indicators

Show when someone is typing:

**Send Typing Event**:
```javascript
socket.emit('typing', {
  conversationId: 'conv_def456',
  isTyping: true
});
```

**Listen for Typing**:
```javascript
socket.on('typing', (data) => {
  // {
  //   conversationId: 'conv_def456',
  //   userId: 'user_abc123',
  //   isTyping: true
  // }
});
```

#### Message Read Status

Notify when messages are read:

**Send Read Event**:
```javascript
socket.emit('message-read', {
  conversationId: 'conv_def456',
  messageId: 'msg_ghi789'
});
```

**Listen for Read**:
```javascript
socket.on('message-read', (data) => {
  // {
  //   conversationId: 'conv_def456',
  //   userId: 'user_xyz789',
  //   messageId: 'msg_ghi789'
  // }
});
```

#### User Presence

Track online and offline status:

**Send Presence Update**:
```javascript
socket.emit('user-presence', {
  status: 'online', // or 'away', 'dnd', 'offline'
  lastSeen: new Date()
});
```

**Listen for Presence**:
```javascript
socket.on('user-presence', (data) => {
  // {
  //   userId: 'user_abc123',
  //   status: 'online',
  //   lastSeen: '2024-01-15T15:45:00Z'
  // }
});
```

---

## Push Notifications

### Web Push Subscription

Subscribe to push notifications for new messages:

**Endpoint**: `POST /api/messaging/notifications/subscribe`

**Request Body**:
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "base64-encoded-key",
      "auth": "base64-encoded-auth"
    }
  }
}
```

**VAPID Public Key**:
```
BCdFeSvKwxXe8q2YO4f_Tg2K8_d-xjB7yDdHV5wVmfsBKNlE6mP3rJnEpZ7T7BwD8dQ7rK-5yZ3-x8K5jXfB2hI
```

### Notification Features

- **New Messages**: Notify when you receive messages
- **@Mentions**: Alert when someone mentions you
- **Server Invites**: Notify of server invitations
- **Reminders**: Scheduled message reminders
- **Customizable**: Control notification preferences per conversation

### Managing Notifications

**Endpoint**: `PATCH /api/messaging/notifications/preferences`

**Request Body**:
```json
{
  "muteConversations": ["conv_def456"],
  "mutedKeywords": ["spam", "bot"],
  "allowNotifications": true,
  "notificationSound": true,
  "desktopNotifications": true,
  "mobilePushNotifications": true
}
```

---

## File Sharing

### Uploading Files

Share files in messages:

**Supported File Types**:
- Images: JPG, PNG, GIF, WebP (10MB max)
- Videos: MP4, WebM (100MB max)
- Documents: PDF, DOC, DOCX, XLS, XLSX (50MB max)
- Archives: ZIP, RAR, 7Z (100MB max)

**Endpoint**: `POST /api/messaging/files/upload`

**Multipart Form Data**:
```
file: [binary file data]
conversationId: conv_def456
messageId: msg_jkl012 (optional, for editing)
```

**Response**:
```json
{
  "id": "file_mno345",
  "filename": "project-report.pdf",
  "size": 2048000,
  "mimeType": "application/pdf",
  "url": "https://cdn.milonexa.com/files/project-report.pdf",
  "uploadedAt": "2024-01-15T16:00:00Z"
}
```

### File Security

- **Encryption**: Files encrypted in transit and at rest
- **Virus Scanning**: Automatic malware detection
- **Expiration**: Optional automatic deletion after period
- **Access Control**: Share files with specific users only

---

## Scheduled Messages

Schedule messages to be sent at a future time:

**Endpoint**: `POST /api/messaging/conversations/:conversationId/scheduled-messages`

**Request Body**:
```json
{
  "content": "Don't forget about tomorrow's meeting!",
  "scheduledTime": "2024-01-16T09:00:00Z",
  "attachments": []
}
```

**Response**:
```json
{
  "id": "scheduled_pqr678",
  "conversationId": "conv_def456",
  "content": "Don't forget about tomorrow's meeting!",
  "scheduledTime": "2024-01-16T09:00:00Z",
  "status": "scheduled",
  "createdAt": "2024-01-15T16:05:00Z"
}
```

### Managing Scheduled Messages

**Editing**:

**Endpoint**: `PATCH /api/messaging/scheduled-messages/:scheduledId`

**Cancelling**:

**Endpoint**: `DELETE /api/messaging/scheduled-messages/:scheduledId`

---

## Best Practices

1. **Use Appropriate Channels**: Keep conversations organized by topic
2. **Pin Important Messages**: Mark key information for easy reference
3. **Respect Privacy**: Don't share others' messages without permission
4. **Clear Communication**: Be explicit and detailed in messages
5. **File Organization**: Name files clearly and organize in channels
6. **Server Structure**: Create logical category and channel hierarchy
7. **Notification Management**: Customize alerts to reduce noise

---

## Troubleshooting

**Messages not sending?**
- Check internet connection
- Verify conversation is active
- Clear browser cache

**Not seeing typed messages?**
- Refresh the conversation
- Check WebSocket connection
- Verify permissions

**Voice not working?**
- Test microphone permissions
- Check audio device settings
- Restart connection

**Files won't upload?**
- Verify file size is under limit
- Check file format is supported
- Ensure sufficient storage space

For further assistance, contact support@milonexa.com.
