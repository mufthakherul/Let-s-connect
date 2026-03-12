# WebSocket & Real-Time Documentation

This document covers the Socket.io implementation in the messaging-service and real-time communication patterns across the Milonexa platform.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Client Connection](#2-client-connection)
3. [Authentication](#3-authentication)
4. [Rooms](#4-rooms)
5. [Server-Emitted Events](#5-server-emitted-events)
6. [Client-Emitted Events](#6-client-emitted-events)
7. [Redis Pub/Sub Bridge](#7-redispubsub-bridge)
8. [Presence System](#8-presence-system)
9. [Reconnection Handling](#9-reconnection-handling)
10. [Frontend Integration](#10-frontend-integration)
11. [Debugging](#11-debugging)

---

## 1. Overview

Real-time features in Milonexa are powered by **Socket.io** running in the `messaging-service` on port `8003`. All WebSocket connections go directly to `messaging-service` (not through the API gateway for the WebSocket upgrade, though the gateway proxies the `/socket.io/` path).

**Architecture:**

```
Browser/App
    │
    ├── HTTP API requests → api-gateway:8000 → services
    │
    └── WebSocket (Socket.io) → messaging-service:8003
            │
            ├── Rooms (per conversation, server, user)
            └── Redis pub/sub bridge (for horizontal scaling)
```

**Technologies:**
- Server: `socket.io` v4
- Client: `socket.io-client` v4
- Transport: WebSocket (with HTTP long-polling fallback)
- Scaling: Redis pub/sub (`@socket.io/redis-adapter`)

---

## 2. Client Connection

### Basic Connection

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:8003', {
  extraHeaders: {
    'x-user-id': userId,           // Required for authentication
    'x-access-token': accessToken, // Optional: JWT for stricter validation
  },
  transports: ['websocket', 'polling'], // Try WebSocket first, fall back to polling
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});
```

### Via API Gateway (production Nginx)

In production, Nginx proxies `/socket.io/` to `messaging-service:8003`. The client connects to the API domain:

```js
const socket = io('https://api.milonexa.com', {
  path: '/socket.io',
  extraHeaders: {
    'x-user-id': userId,
  },
});
```

### Connection Lifecycle Events

```js
socket.on('connect', () => {
  console.log('Connected, socket ID:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // 'io server disconnect' — server disconnected us (auth error, etc.)
  // 'transport close' — network issue
  // 'ping timeout' — server not responding
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

---

## 3. Authentication

WebSocket connections are authenticated using the `x-user-id` header (injected by the API gateway or provided directly by the client).

### Server-side Authentication Middleware

```js
// messaging-service socket authentication
io.use((socket, next) => {
  const userId = socket.handshake.headers['x-user-id'];

  if (!userId) {
    return next(new Error('Authentication required: x-user-id header missing'));
  }

  // Validate UUID format
  if (!isValidUUID(userId)) {
    return next(new Error('Authentication required: invalid user ID format'));
  }

  socket.userId = userId;
  next();
});
```

### Strict JWT Validation (optional)

For enhanced security, the server can also validate the access token:

```js
io.use((socket, next) => {
  const token = socket.handshake.headers['x-access-token'];
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.userId;
      socket.userRole = payload.role;
    } catch {
      return next(new Error('Invalid access token'));
    }
  }
  next();
});
```

---

## 4. Rooms

Socket.io rooms are used to broadcast messages to specific audiences.

### Room Types

| Room Name | Format | Description |
|---|---|---|
| Conversation room | `conversation:{conversationId}` | All participants in a direct or group conversation |
| Server room | `server:{serverId}` | All members of a Discord-style server |
| Channel room | `channel:{channelId}` | Members viewing a specific channel |
| User room | `user:{userId}` | Single user (for personal notifications) |

### Joining Rooms

The client joins rooms after connecting:

```js
// Join a conversation
socket.emit('join-conversation', { conversationId: 'uuid-here' });

// Join a server
socket.emit('join-server', { serverId: 'uuid-here' });

// User room (auto-joined by server on authentication)
// Server-side: socket.join(`user:${socket.userId}`)
```

### Server-side Room Management

```js
io.on('connection', (socket) => {
  // Auto-join user's personal room
  socket.join(`user:${socket.userId}`);

  socket.on('join-conversation', async ({ conversationId }) => {
    // Verify user is a participant before allowing join
    const isParticipant = await ConversationService.isParticipant(
      conversationId,
      socket.userId
    );
    if (isParticipant) {
      socket.join(`conversation:${conversationId}`);
    }
  });
});
```

---

## 5. Server-Emitted Events

Events emitted by the server to connected clients.

### `new-message`

Emitted to the conversation room when a new message is sent.

```js
// Server
io.to(`conversation:${conversationId}`).emit('new-message', {
  id: 'message-uuid',
  conversationId: 'conversation-uuid',
  senderId: 'user-uuid',
  content: 'Hello!',
  contentType: 'text',
  reactions: {},
  createdAt: '2024-01-01T00:00:00.000Z',
});
```

```js
// Client handler
socket.on('new-message', (message) => {
  addMessageToConversation(message.conversationId, message);
});
```

### `typing`

Emitted to the conversation room when a user starts or stops typing.

```js
// Payload
{
  conversationId: 'uuid',
  userId: 'uuid',
  username: 'johndoe',
  isTyping: true  // true = typing, false = stopped
}
```

### `presence`

Emitted to relevant rooms when a user's online status changes.

```js
{
  userId: 'uuid',
  status: 'online' | 'offline' | 'away',
  lastSeen: '2024-01-01T00:00:00.000Z'
}
```

### `message-deleted`

Emitted to conversation room when a message is soft-deleted.

```js
{
  conversationId: 'uuid',
  messageId: 'uuid',
  deletedBy: 'uuid'
}
```

### `reaction-added`

Emitted to conversation room when a reaction is added to a message.

```js
{
  messageId: 'uuid',
  conversationId: 'uuid',
  userId: 'uuid',
  emoji: '👍',
  reactionCounts: { '👍': 3, '❤️': 1 }
}
```

### `notification`

Emitted to the user's personal room for real-time notifications.

```js
{
  id: 'notification-uuid',
  type: 'friend_request' | 'mention' | 'reaction' | 'system',
  title: 'John Doe sent you a friend request',
  data: { ... },
  createdAt: '2024-01-01T00:00:00.000Z',
  isRead: false
}
```

### `message-read`

Emitted when another participant reads messages in a conversation.

```js
{
  conversationId: 'uuid',
  userId: 'uuid',      // Who read the messages
  lastReadAt: '2024-01-01T00:00:00.000Z'
}
```

### `call-signal`

WebRTC signaling event for peer-to-peer calls.

```js
{
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-ended',
  callId: 'uuid',
  fromUserId: 'uuid',
  toUserId: 'uuid',
  signal: { ... }  // WebRTC SDP or ICE candidate
}
```

---

## 6. Client-Emitted Events

Events emitted by the client to the server.

### `join-conversation`

```js
socket.emit('join-conversation', {
  conversationId: 'uuid'
}, (response) => {
  if (response.success) {
    console.log('Joined conversation');
  }
});
```

### `send-message`

```js
socket.emit('send-message', {
  conversationId: 'uuid',
  content: 'Hello world!',
  contentType: 'text',      // 'text' | 'image' | 'file' | 'audio' | 'video'
  replyToId: null,          // Optional: reply to a specific message
}, (response) => {
  if (response.success) {
    console.log('Message sent:', response.message);
  } else {
    console.error('Send failed:', response.error);
  }
});
```

### `typing-start`

```js
socket.emit('typing-start', { conversationId: 'uuid' });
```

### `typing-stop`

```js
socket.emit('typing-stop', { conversationId: 'uuid' });
```

### `mark-read`

```js
socket.emit('mark-read', {
  conversationId: 'uuid',
  lastReadMessageId: 'message-uuid'
});
```

### `add-reaction`

```js
socket.emit('add-reaction', {
  messageId: 'uuid',
  conversationId: 'uuid',
  emoji: '👍'
});
```

### `join-server`

```js
socket.emit('join-server', { serverId: 'uuid' });
```

### `call-signal`

```js
socket.emit('call-signal', {
  type: 'offer',
  callId: 'uuid',
  toUserId: 'target-user-uuid',
  signal: rtcSessionDescription
});
```

---

## 7. Redis Pub/Sub Bridge

To support horizontal scaling (multiple `messaging-service` instances), the Socket.io server uses the `@socket.io/redis-adapter` to synchronise events across instances via Redis pub/sub.

### Setup

```js
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('ioredis');

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

### How It Works

When `messaging-service` instance A emits to a room, the Redis adapter:
1. Publishes the event to a Redis pub/sub channel
2. All other `messaging-service` instances are subscribed and re-emit locally

This ensures users connected to different instances still receive messages from the same conversation.

---

## 8. Presence System

The presence system tracks online/offline/away status for users.

### Status Values

| Status | Description |
|---|---|
| `online` | User is connected and active |
| `away` | User is connected but inactive (no activity for 5 minutes) |
| `offline` | User is not connected |

### Server-side Implementation

```js
// On connect
socket.userId = authResult.userId;
await redis.setex(`presence:${socket.userId}`, 300, 'online'); // 5-min TTL
io.emit('presence', { userId: socket.userId, status: 'online' });

// On disconnect
socket.on('disconnect', async () => {
  await redis.del(`presence:${socket.userId}`);
  io.emit('presence', {
    userId: socket.userId,
    status: 'offline',
    lastSeen: new Date().toISOString()
  });
});
```

### Querying Presence

```js
// Check if a user is online
const status = await redis.get(`presence:${userId}`) || 'offline';

// Get presence for multiple users
const pipeline = redis.pipeline();
userIds.forEach(id => pipeline.get(`presence:${id}`));
const results = await pipeline.exec();
```

---

## 9. Reconnection Handling

Socket.io client handles reconnection automatically with exponential backoff.

### Client Configuration

```js
const socket = io(serverUrl, {
  reconnection: true,
  reconnectionAttempts: 5,       // Max 5 retries
  reconnectionDelay: 1000,       // Start with 1s delay
  reconnectionDelayMax: 5000,    // Cap at 5s delay
  randomizationFactor: 0.5,      // Add randomness to prevent thundering herd
});
```

### Re-joining Rooms After Reconnect

Rooms are not automatically re-joined after reconnection. The client must re-join:

```js
socket.on('connect', () => {
  if (currentConversationId) {
    socket.emit('join-conversation', { conversationId: currentConversationId });
  }
  // Re-fetch messages missed during disconnection
  fetchMissedMessages();
});
```

### Fetching Missed Messages

On reconnect, fetch messages received while disconnected:

```js
async function fetchMissedMessages() {
  const conversations = useConversationStore.getState().conversations;
  for (const conv of conversations) {
    const lastMessageAt = conv.lastMessageAt;
    const missed = await api.get(`/messages/${conv.id}?since=${lastMessageAt}`);
    if (missed.data.length > 0) {
      addMessages(conv.id, missed.data);
    }
  }
}
```

---

## 10. Frontend Integration

### React Hook Pattern

```js
// frontend/src/hooks/useSocket.js
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

export function useSocket() {
  const socketRef = useRef(null);
  const { user, accessToken } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:8003', {
      extraHeaders: { 'x-user-id': user.id },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('new-message', (message) => {
      useMessagingStore.getState().addMessage(message);
    });

    socket.on('presence', (data) => {
      usePresenceStore.getState().updatePresence(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  const joinConversation = useCallback((conversationId) => {
    socketRef.current?.emit('join-conversation', { conversationId });
  }, []);

  const sendMessage = useCallback((payload) => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit('send-message', payload, (response) => {
        if (response.success) resolve(response.message);
        else reject(new Error(response.error));
      });
    });
  }, []);

  return { socket: socketRef.current, joinConversation, sendMessage };
}
```

---

## 11. Debugging

### Server-side Debug Logging

```bash
# Enable Socket.io debug logs
DEBUG=socket.io* node src/index.js
```

### Client-side Debug

```js
// Enable Socket.io debug in browser console
localStorage.debug = 'socket.io-client:socket';
```

### Inspecting Active Connections

```js
// In messaging-service REPL or admin endpoint
const rooms = io.sockets.adapter.rooms;
const userCount = io.engine.clientsCount;
console.log(`${userCount} connected clients`);
console.log('Rooms:', [...rooms.keys()]);
```

### Testing WebSocket Events

```bash
# Install wscat for WebSocket testing
npm install -g wscat

# Or use the Socket.io CLI
npx @socket.io/socket.io-client connect http://localhost:8003 \
  --header "x-user-id:your-user-id"
```
