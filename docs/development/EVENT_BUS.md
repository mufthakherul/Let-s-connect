# Event Bus Documentation

This document describes the asynchronous event bus used for decoupled inter-service communication across the Milonexa platform.

---

## Table of Contents

1. [Overview](#1-overview)
2. [EventBus Class Usage](#2-eventbus-class-usage)
3. [Event Envelope Format](#3-event-envelope-format)
4. [Channel Naming](#4-channel-naming)
5. [Graceful Degradation](#5-graceful-degradation)
6. [Platform Events Reference](#6-platform-events-reference)
7. [Error Handling in Subscribers](#7-error-handling-in-subscribers)
8. [Design Notes](#8-design-notes)
9. [Testing with the Event Bus](#9-testing-with-the-event-bus)

---

## 1. Overview

The Milonexa event bus is a lightweight **Redis pub/sub** messaging layer implemented in `services/shared/event-bus.js`. It enables services to communicate asynchronously without direct dependencies on each other.

**Key characteristics:**
- **Fire-and-forget:** Publishers do not wait for acknowledgment
- **No guaranteed delivery:** If a subscriber is offline when an event is published, it misses the event
- **No persistence:** Events are not stored in Redis (pure pub/sub, not streams)
- **Decoupled:** Services only need to know event names, not each other's endpoints
- **Graceful degradation:** If Redis is unavailable, publish calls fail silently (logged but not thrown)

**Use the event bus for:**
- Post-registration side effects (welcome email, default content creation)
- Cross-service cache invalidation
- Notification fan-out
- Audit trail triggers
- Search index updates

**Use direct HTTP for:**
- Synchronous operations that require a response (e.g. "get user profile")
- Operations requiring guaranteed delivery or rollback
- Time-sensitive data retrieval

---

## 2. EventBus Class Usage

### Setup

Each service that uses the event bus creates two separate Redis clients — one for publishing, one for subscribing (required by Redis pub/sub protocol):

```js
const Redis = require('ioredis');
const { EventBus } = require('../shared/event-bus');

const publishClient = new Redis(process.env.REDIS_URL);
const subscribeClient = new Redis(process.env.REDIS_URL);

// Handle Redis connection errors gracefully
publishClient.on('error', (err) => logger.warn('Redis publish client error', { error: err.message }));
subscribeClient.on('error', (err) => logger.warn('Redis subscribe client error', { error: err.message }));

const bus = new EventBus(publishClient, subscribeClient);

module.exports = bus;
```

### Publishing Events

```js
const bus = require('./event-bus');

// Publish an event (fire-and-forget, returns a Promise)
await bus.publish('user.registered', {
  userId: 'uuid',
  email: 'user@milonexa.com',
  username: 'johndoe',
});

// Publishing is safe to call without await in most cases
bus.publish('content.post.created', { postId, authorId }).catch(logger.warn);
```

### Subscribing to Events

```js
const bus = require('./event-bus');

// Subscribe to a single event
bus.subscribe('user.registered', async (payload) => {
  const { userId, email } = payload;
  await sendWelcomeEmail(email);
  await createDefaultContent(userId);
});

// Subscribe to multiple events
bus.subscribe('content.post.created', async (payload) => {
  await updateSearchIndex('post', payload.postId);
});

bus.subscribe('user.profile.updated', async (payload) => {
  await cache.invalidate('user_profile', payload.userId);
});
```

### Unsubscribing

```js
// Remove a specific handler
bus.unsubscribe('user.registered', myHandler);

// Remove all handlers for an event
bus.unsubscribeAll('user.registered');
```

---

## 3. Event Envelope Format

All events are wrapped in a standard envelope before being published to Redis. The `EventBus.publish()` method constructs this automatically.

### Envelope Structure

```json
{
  "v": "1",
  "type": "user.registered",
  "payload": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@milonexa.com",
    "username": "johndoe"
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "publishedAt": 1704067200000,
    "source": "user-service"
  }
}
```

| Field | Description |
|---|---|
| `v` | Envelope version. Currently `"1"`. |
| `type` | Event type (dot-separated namespace) |
| `payload` | Event-specific data (arbitrary JSON) |
| `meta.timestamp` | ISO 8601 timestamp of event creation |
| `meta.publishedAt` | Unix millisecond timestamp |
| `meta.source` | Service that published the event (from `SERVICE_NAME` env var) |

Subscribers receive only the `payload` object (the envelope is unwrapped by `EventBus.subscribe()`).

---

## 4. Channel Naming

Redis pub/sub channels follow the pattern:

```
events:{event.type}
```

Examples:

| Event Type | Redis Channel |
|---|---|
| `user.registered` | `events:user.registered` |
| `content.post.created` | `events:content.post.created` |
| `messaging.message.sent` | `events:messaging.message.sent` |
| `shop.order.completed` | `events:shop.order.completed` |

The `EventBus` class handles channel name construction internally. You never need to reference Redis channel names directly in service code.

---

## 5. Graceful Degradation

The `EventBus` is designed to fail silently when Redis is unavailable, to prevent a Redis outage from cascading into full service failure.

### Publish degradation

```js
// If Redis is unavailable, publish() logs a warning and resolves (does not throw)
try {
  await redis.publish(channel, message);
} catch (err) {
  logger.warn('EventBus: publish failed (Redis unavailable)', {
    event: type,
    error: err.message,
  });
  // Does not rethrow — calling code continues normally
}
```

### Subscribe degradation

If the subscribe Redis client is disconnected, event handlers simply won't fire until the connection is restored. The bus will automatically re-subscribe when Redis reconnects (ioredis handles reconnection).

### Monitoring

Log these Redis connection events in your service startup:

```js
subscribeClient.on('ready', () => logger.info('EventBus subscribe client ready'));
subscribeClient.on('reconnecting', () => logger.warn('EventBus subscribe client reconnecting'));
subscribeClient.on('error', (err) => logger.warn('EventBus subscribe client error', { error: err.message }));
```

---

## 6. Platform Events Reference

### User Service Events

| Event | Publisher | Subscribers | Payload |
|---|---|---|---|
| `user.registered` | user-service | content-service, ai-service | `{ userId, email, username }` |
| `user.profile.updated` | user-service | content-service | `{ userId, changedFields }` |
| `user.deleted` | user-service | All services | `{ userId }` |
| `user.email.verified` | user-service | — | `{ userId, email }` |
| `user.password.changed` | user-service | security-service | `{ userId, timestamp }` |
| `user.role.changed` | user-service | security-service | `{ userId, oldRole, newRole, changedBy }` |

### Content Service Events

| Event | Publisher | Subscribers | Payload |
|---|---|---|---|
| `content.post.created` | content-service | ai-service, security-service | `{ postId, authorId, content, groupId }` |
| `content.post.deleted` | content-service | media-service | `{ postId, authorId, mediaUrls }` |
| `content.post.flagged` | content-service | security-service | `{ postId, authorId, flagReason, toxicityScore }` |
| `content.comment.created` | content-service | user-service (notification) | `{ commentId, postId, authorId, parentId }` |
| `content.reaction.added` | content-service | user-service (notification) | `{ postId, userId, reactionType }` |

### Messaging Service Events

| Event | Publisher | Subscribers | Payload |
|---|---|---|---|
| `messaging.message.sent` | messaging-service | security-service (audit) | `{ messageId, conversationId, senderId }` |
| `messaging.conversation.created` | messaging-service | — | `{ conversationId, participantIds }` |

### Shop Service Events

| Event | Publisher | Subscribers | Payload |
|---|---|---|---|
| `shop.order.completed` | shop-service | user-service (notification) | `{ orderId, userId, totalAmount }` |
| `shop.order.shipped` | shop-service | user-service (notification) | `{ orderId, userId, trackingUrl }` |

### Media Service Events

| Event | Publisher | Subscribers | Payload |
|---|---|---|---|
| `media.file.uploaded` | media-service | content-service | `{ fileId, uploaderId, mimeType, storageKey }` |
| `media.file.deleted` | media-service | — | `{ fileId, storageKey }` |

### Security Service Events

| Event | Publisher | Subscribers | Payload |
|---|---|---|---|
| `security.user.banned` | security-service | All services | `{ userId, reason, bannedBy }` |
| `security.audit.action` | security-service | — | `{ action, adminId, targetId, details }` |

---

## 7. Error Handling in Subscribers

Subscriber handlers should **never throw unhandled errors** — doing so can crash the subscription listener for all events.

### Pattern: Wrap handlers in try/catch

```js
bus.subscribe('user.registered', async (payload) => {
  try {
    await sendWelcomeEmail(payload.email);
  } catch (err) {
    // Log the error but do NOT rethrow
    logger.error('Failed to send welcome email', {
      userId: payload.userId,
      error: err.message,
    });
    // Consider: write to a dead-letter store for retry
  }
});
```

### Pattern: Dead-letter queue for critical events

For events where the side effect is important (e.g. sending a payment confirmation email), consider a dead-letter queue:

```js
bus.subscribe('shop.order.completed', async (payload) => {
  try {
    await sendOrderConfirmationEmail(payload);
  } catch (err) {
    logger.error('Order email failed', { orderId: payload.orderId, error: err.message });
    // Write failed event to a Redis list for later retry
    await redis.lpush('dlq:order.completed', JSON.stringify(payload));
  }
});
```

---

## 8. Design Notes

### Why not Redis Streams?

Redis Streams (`XADD`/`XREAD`) would provide persistence and consumer groups with at-least-once delivery. The current pub/sub approach was chosen for simplicity — if a service misses an event (restart during high load), it simply misses it. For Milonexa's current use cases (cache invalidation, notifications, welcome emails), missed events are acceptable.

If stronger delivery guarantees are needed in the future, migrating to Redis Streams or a message broker like RabbitMQ/Kafka would be the next step.

### Why not REST callbacks?

Direct HTTP callbacks between services would create tight coupling — each service would need to know the network addresses of all others. The event bus allows services to be completely unaware of who is subscribed to their events.

### Fire-and-forget vs Request-Reply

| Use Case | Pattern |
|---|---|
| "User registered, notify other services" | Event bus (fire-and-forget) |
| "Get the user's profile" | Direct HTTP (request-reply) |
| "Invalidate cache in content-service" | Event bus (fire-and-forget) |
| "Check if user has permission before creating post" | Direct HTTP (synchronous) |

---

## 9. Testing with the Event Bus

### Unit testing with mocks

```js
// Mock the event bus in tests
jest.mock('../shared/event-bus', () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn(),
}));

const bus = require('../shared/event-bus');

test('publishes user.registered event', async () => {
  await registerUser({ email: 'test@example.com', password: 'password123' });
  expect(bus.publish).toHaveBeenCalledWith('user.registered', expect.objectContaining({
    email: 'test@example.com',
  }));
});
```

### Integration testing with real Redis

```js
const Redis = require('ioredis');
const { EventBus } = require('../shared/event-bus');

let bus;
beforeAll(async () => {
  const pub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  const sub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  bus = new EventBus(pub, sub);
});

test('subscriber receives published event', async () => {
  const received = [];
  bus.subscribe('test.event', (payload) => received.push(payload));

  await bus.publish('test.event', { data: 'hello' });
  await new Promise(resolve => setTimeout(resolve, 50)); // Wait for propagation

  expect(received).toHaveLength(1);
  expect(received[0]).toEqual({ data: 'hello' });
});
```
