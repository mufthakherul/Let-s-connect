# Caching Documentation

This document describes the caching strategy and implementation across the Milonexa platform.

---

## Table of Contents

1. [Overview](#1-overview)
2. [CacheManager Class](#2-cachemanager-class)
3. [Cache Key Format](#3-cache-key-format)
4. [TTL Strategy](#4-ttl-strategy)
5. [Usage Examples](#5-usage-examples)
6. [Cache Invalidation Patterns](#6-cache-invalidation-patterns)
7. [Graceful Degradation](#7-graceful-degradation)
8. [Rate Limiting](#8-rate-limiting)
9. [Session Storage](#9-session-storage)
10. [Redis Key Namespaces](#10-redis-key-namespaces)

---

## 1. Overview

Milonexa uses **Redis 7** as its caching layer, session store, and rate limiting backend. The `CacheManager` class in `services/shared/caching.js` provides a consistent interface for all services.

**What is cached:**
- User profiles (high read frequency, low write frequency)
- Post feeds (expensive to compute, acceptable to be slightly stale)
- Product listings (shop catalog)
- Discovery/recommendation results
- Conversation metadata

**What is NOT cached:**
- Individual messages (real-time consistency required)
- Payment state (Stripe is source of truth)
- Active WebSocket connections (managed by Socket.io adapter)

---

## 2. CacheManager Class

The `CacheManager` class wraps `ioredis` with:
- Automatic key namespacing
- JSON serialisation/deserialisation
- Graceful degradation on Redis errors
- TTL management

### Initialisation

```js
const { CacheManager } = require('../shared/caching');

// Create a cache manager instance (typically once per service, singleton)
const cache = new CacheManager({
  redisUrl: process.env.REDIS_URL,  // e.g. redis://localhost:6379
  defaultTtl: 300,                   // Default TTL in seconds (5 minutes)
  keyPrefix: 'cache',               // Prefix for all keys
});
```

### Methods

```js
// Set a value (TTL in seconds)
await cache.set(namespace, identifier, value, ttl);

// Get a value (returns null if not found or expired)
const value = await cache.get(namespace, identifier);

// Invalidate (delete) a cached value
await cache.invalidate(namespace, identifier);

// Invalidate all keys in a namespace (pattern delete)
await cache.invalidateNamespace(namespace);

// Check if a key exists
const exists = await cache.has(namespace, identifier);

// Get or set (fetch from cache; if miss, call fetcher and cache result)
const value = await cache.getOrSet(namespace, identifier, async () => {
  return await database.findUser(identifier);
}, ttl);
```

---

## 3. Cache Key Format

All cache keys follow the pattern:

```
cache:{namespace}:{identifier}
```

Examples:

| Namespace | Identifier | Full Key | Description |
|---|---|---|---|
| `user_profile` | `userId` | `cache:user_profile:550e8400-e29b-...` | Single user's profile |
| `post_feed` | `userId` | `cache:post_feed:550e8400-e29b-...` | User's home feed |
| `products` | `all` | `cache:products:all` | All products listing |
| `products` | `electronics` | `cache:products:electronics` | Products by category |
| `discovery` | `userId` | `cache:discovery:550e8400-e29b-...` | Friend suggestions |
| `conversation` | `conversationId` | `cache:conversation:uuid` | Conversation metadata |

Keys are automatically constructed by `CacheManager.set()` and `CacheManager.get()`.

---

## 4. TTL Strategy

| Namespace | TTL | Rationale |
|---|---|---|
| `user_profile` | 900s (15 min) | Profiles change infrequently; 15 min stale is acceptable |
| `post_feed` | 120s (2 min) | Feed freshness is important for engagement |
| `products` | 300s (5 min) | Product catalog changes moderately |
| `discovery` | 600s (10 min) | Recommendations are expensive to compute |
| `conversation` | 300s (5 min) | Conversation metadata changes occasionally |
| `user_settings` | 1800s (30 min) | Settings are rarely changed |
| `stream_catalog` | 600s (10 min) | Radio/TV catalog changes rarely |
| `search_results` | 60s (1 min) | Search results should be fairly fresh |

### Choosing a TTL

Ask these questions:
1. **How often does this data change?** Rarely → higher TTL; Frequently → lower TTL
2. **How bad is stale data?** Minor UI issue → higher TTL; Financial/security data → no cache
3. **How expensive is re-fetching?** Expensive query → higher TTL with explicit invalidation on write

---

## 5. Usage Examples

### Caching a User Profile

```js
const { CacheManager } = require('../shared/caching');
const cache = new CacheManager({ redisUrl: process.env.REDIS_URL });

// GET /profile/:userId
async function getUserProfile(userId) {
  // Try cache first
  const cached = await cache.get('user_profile', userId);
  if (cached) {
    return cached;
  }

  // Cache miss — fetch from database
  const user = await User.findByPk(userId, {
    include: [{ model: Profile, as: 'profile' }],
    attributes: { exclude: ['passwordHash', 'twoFactorSecret'] },
  });

  if (!user) return null;

  // Store in cache for 15 minutes
  await cache.set('user_profile', userId, user.toJSON(), 900);

  return user.toJSON();
}

// Invalidate on profile update
async function updateProfile(userId, updates) {
  await Profile.update(updates, { where: { userId } });
  await cache.invalidate('user_profile', userId);
}
```

### Using getOrSet (cache-aside pattern)

```js
const products = await cache.getOrSet(
  'products',
  category || 'all',
  async () => {
    return await Product.findAll({
      where: category ? { category } : {},
      order: [['createdAt', 'DESC']],
    });
  },
  300 // 5 minutes
);
```

### Caching a Post Feed

```js
async function getHomeFeed(userId, page = 1) {
  const cacheKey = `${userId}:page:${page}`;

  const cached = await cache.get('post_feed', cacheKey);
  if (cached) return cached;

  const feed = await computeFeed(userId, page);
  await cache.set('post_feed', cacheKey, feed, 120); // 2 minutes

  return feed;
}

// Invalidate feed when a friend creates a post
async function onFriendPosted(authorId) {
  const friends = await getFriendsOf(authorId);
  const pipeline = redis.pipeline();
  friends.forEach(({ id }) => {
    pipeline.del(`cache:post_feed:${id}:page:1`); // Invalidate page 1 of feed
  });
  await pipeline.exec();
}
```

---

## 6. Cache Invalidation Patterns

### Strategy 1: Invalidate on Write (recommended)

Explicitly delete the cache entry when the underlying data changes:

```js
// After updating a user
await User.update({ username }, { where: { id: userId } });
await cache.invalidate('user_profile', userId);
```

### Strategy 2: TTL Expiry Only

For data where slight staleness is acceptable, let the TTL expire naturally without explicit invalidation:

```js
// Product catalog — let the 5-minute TTL handle freshness
await Product.update(updates, { where: { id: productId } });
// No explicit cache invalidation — next request after TTL will fetch fresh data
```

### Strategy 3: Namespace Wipe

When a batch operation changes many cached items, wipe the entire namespace:

```js
// After a bulk product import
await cache.invalidateNamespace('products');
```

### Strategy 4: Version Tags

For complex cache hierarchies, use a version key:

```js
// Increment version to invalidate all user-related caches
await redis.incr(`cache_version:user:${userId}`);

// Include version in cache key
const version = await redis.get(`cache_version:user:${userId}`) || '0';
const cacheKey = `v${version}:${userId}`;
```

---

## 7. Graceful Degradation

The `CacheManager` is designed to never crash the application if Redis is unavailable.

### Behaviour on Redis Error

- `get()` — Returns `null` (cache miss, application fetches from DB)
- `set()` — Logs warning, returns silently
- `invalidate()` — Logs warning, returns silently

```js
// CacheManager internal error handling (simplified)
async get(namespace, identifier) {
  try {
    const key = this.buildKey(namespace, identifier);
    const raw = await this.redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    this.logger.warn('Cache get failed', { namespace, identifier, error: err.message });
    return null; // Graceful degradation — treat as cache miss
  }
}
```

### Detecting Cache Availability

```js
// Check if cache is available (optional — for metrics)
async function isCacheAvailable() {
  try {
    await cache.redis.ping();
    return true;
  } catch {
    return false;
  }
}
```

---

## 8. Rate Limiting

Rate limiting uses Redis with the `express-rate-limit` package and `rate-limit-redis` store.

### Configuration

```js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { createClient } = require('ioredis');

const rateLimitRedis = createClient({ url: process.env.REDIS_URL });

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),  // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),               // 100 requests
  standardHeaders: true,   // Return rate limit info in headers
  legacyHeaders: false,
  store: new RedisStore({
    client: rateLimitRedis,
    prefix: 'rl:',
  }),
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: res.getHeader('Retry-After'),
      },
    });
  },
});
```

### Rate Limit Redis Key Pattern

```
rl:{windowKey}:{ip}
```

Example: `rl:1704067200:192.168.1.1`

The `windowKey` is the current window's start timestamp, computed as `Math.floor(Date.now() / windowMs)`.

### Tighter Limits for Auth Endpoints

```js
const authLimiter = rateLimit({
  windowMs: 60000,
  max: 10,  // Only 10 login attempts per minute
  store: new RedisStore({ client: rateLimitRedis, prefix: 'rl:auth:' }),
});

router.post('/login', authLimiter, loginHandler);
router.post('/register', authLimiter, registerHandler);
```

---

## 9. Session Storage

JWT refresh tokens are stored in Redis for server-side session management and revocation.

### Key Pattern

```
session:refresh:{userId}:{jti}
```

### Value

```json
{
  "userId": "user-uuid",
  "jti": "token-jti-uuid",
  "issuedAt": 1704067200000,
  "expiresAt": 1704672000000,
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "ip": "192.168.1.1"
  }
}
```

### TTL

Set to `JWT_REFRESH_EXPIRY` (default: 7 days = 604800 seconds).

### Session Operations

```js
// Store refresh token on login
await redis.setex(
  `session:refresh:${userId}:${jti}`,
  7 * 24 * 3600,  // 7 days in seconds
  JSON.stringify({ userId, jti, issuedAt: Date.now(), deviceInfo })
);

// Validate on refresh
const session = await redis.get(`session:refresh:${userId}:${jti}`);
if (!session) throw new Error('Session invalid or expired');

// Rotate: delete old, create new
const pipeline = redis.pipeline();
pipeline.del(`session:refresh:${userId}:${oldJti}`);
pipeline.setex(`session:refresh:${userId}:${newJti}`, 7 * 24 * 3600, JSON.stringify(newSession));
await pipeline.exec();

// Logout: delete session
await redis.del(`session:refresh:${userId}:${jti}`);

// Logout all devices: delete all sessions for user
const keys = await redis.keys(`session:refresh:${userId}:*`);
if (keys.length > 0) await redis.del(...keys);
```

---

## 10. Redis Key Namespaces

Summary of all Redis key patterns used across the platform:

| Pattern | Purpose | TTL |
|---|---|---|
| `cache:{namespace}:{id}` | Application data cache | Varies (see TTL table) |
| `rl:{window}:{ip}` | API rate limiting | Auto (window-based) |
| `rl:auth:{window}:{ip}` | Auth endpoint rate limiting | Auto |
| `session:refresh:{userId}:{jti}` | JWT refresh token storage | 7 days |
| `email_verify:{userId}` | Email verification OTP | 10 minutes |
| `reset_otp:{email}` | Password reset OTP | 15 minutes |
| `presence:{userId}` | User online presence | 5 minutes (heartbeat-renewed) |
| `2fa_temp:{tempToken}` | 2FA login temp token | 5 minutes |
| `events:{eventType}` | Event bus pub/sub channels | N/A (pub/sub, no TTL) |
| `socket.io:*` | Socket.io adapter state | Managed by socket.io adapter |
