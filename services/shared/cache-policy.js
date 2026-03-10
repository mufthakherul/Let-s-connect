/**
 * Cache Policy Harmonization for Milonexa
 * Phase 3 - Data & Scale
 * 
 * Unified caching strategy across all microservices
 * - Consistent TTL policies
 * - Key naming conventions
 * - Invalidation patterns
 * - Cache warming strategies
 */

const Redis = require('ioredis');

// ===================================================================
// CACHE CONFIGURATION
// ===================================================================

const CACHE_CONFIG = {
  // Connection settings
  connection: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: 0,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3
  },

  // TTL policies (in seconds)
  ttl: {
    // User data
    userProfile: 300,           // 5 minutes
    userSettings: 600,          // 10 minutes
    userPermissions: 900,       // 15 minutes
    userSession: 86400,         // 24 hours
    
    // Content data
    postDetail: 180,            // 3 minutes
    postList: 60,               // 1 minute
    commentList: 120,           // 2 minutes
    reactionCount: 30,          // 30 seconds
    
    // Social data
    friendsList: 300,           // 5 minutes
    followerCount: 180,         // 3 minutes
    groupMembers: 600,          // 10 minutes
    
    // Media data
    mediaMetadata: 1800,        // 30 minutes
    mediaUrl: 3600,             // 1 hour
    
    // Search and discovery
    searchResults: 300,         // 5 minutes
    trendingPosts: 120,         // 2 minutes
    recommendations: 900,       // 15 minutes
    
    // Static/reference data
    systemConfig: 1800,         // 30 minutes
    categoryList: 3600,         // 1 hour
    
    // Temporary/ephemeral
    rateLimitCounter: 60,       // 1 minute
    otpCode: 300,               // 5 minutes
    emailVerificationToken: 3600, // 1 hour
  },

  // Key prefixes for namespacing
  prefixes: {
    user: 'user:',
    post: 'post:',
    comment: 'comment:',
    message: 'msg:',
    media: 'media:',
    session: 'session:',
    ratelimit: 'rl:',
    lock: 'lock:',
    queue: 'queue:',
    temp: 'temp:'
  }
};

// ===================================================================
// CACHE CLIENT
// ===================================================================

class CacheClient {
  constructor() {
    this.redis = new Redis(CACHE_CONFIG.connection);
    
    this.redis.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
    
    this.redis.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  /**
   * Build cache key with proper namespacing
   */
  buildKey(prefix, ...parts) {
    return prefix + parts.join(':');
  }

  /**
   * Get value from cache
   */
  async get(key, options = {}) {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      
      return options.raw ? value : JSON.parse(value);
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttl, options = {}) {
    try {
      const serialized = options.raw ? value : JSON.stringify(value);
      
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete one or more keys
   */
  async del(...keys) {
    try {
      return await this.redis.del(...keys);
    } catch (error) {
      console.error(`Cache delete error:`, error);
      return 0;
    }
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        return await this.redis.del(...keys);
      }
      return 0;
    } catch (error) {
      console.error(`Cache delete pattern error:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      return await this.redis.exists(key) === 1;
    } catch (error) {
      console.error(`Cache exists error:`, error);
      return false;
    }
  }

  /**
   * Increment counter
   */
  async incr(key, ttl) {
    try {
      const value = await this.redis.incr(key);
      if (ttl && value === 1) {
        await this.redis.expire(key, ttl);
      }
      return value;
    } catch (error) {
      console.error(`Cache incr error:`, error);
      return 0;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget(keys) {
    try {
      const values = await this.redis.mget(...keys);
      return values.map(v => v ? JSON.parse(v) : null);
    } catch (error) {
      console.error(`Cache mget error:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys at once
   */
  async mset(keyValuePairs, ttl) {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serialized = JSON.stringify(value);
        if (ttl) {
          pipeline.setex(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error(`Cache mset error:`, error);
      return false;
    }
  }

  /**
   * Distributed lock
   */
  async acquireLock(resource, ttl = 30) {
    const lockKey = CACHE_CONFIG.prefixes.lock + resource;
    const token = Math.random().toString(36).substring(2);
    
    try {
      const result = await this.redis.set(lockKey, token, 'EX', ttl, 'NX');
      return result === 'OK' ? token : null;
    } catch (error) {
      console.error(`Lock acquisition error:`, error);
      return null;
    }
  }

  /**
   * Release distributed lock
   */
  async releaseLock(resource, token) {
    const lockKey = CACHE_CONFIG.prefixes.lock + resource;
    
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    try {
      return await this.redis.eval(script, 1, lockKey, token);
    } catch (error) {
      console.error(`Lock release error:`, error);
      return 0;
    }
  }

  /**
   * Close connection
   */
  async close() {
    await this.redis.quit();
  }
}

// ===================================================================
// HIGH-LEVEL CACHE OPERATIONS
// ===================================================================

class CacheService {
  constructor() {
    this.client = new CacheClient();
    this.config = CACHE_CONFIG;
  }

  // User caching
  async cacheUser(userId, userData) {
    const key = this.client.buildKey(this.config.prefixes.user, userId);
    return this.client.set(key, userData, this.config.ttl.userProfile);
  }

  async getUser(userId) {
    const key = this.client.buildKey(this.config.prefixes.user, userId);
    return this.client.get(key);
  }

  async invalidateUser(userId) {
    const key = this.client.buildKey(this.config.prefixes.user, userId);
    return this.client.del(key);
  }

  // Post caching
  async cachePost(postId, postData) {
    const key = this.client.buildKey(this.config.prefixes.post, postId);
    return this.client.set(key, postData, this.config.ttl.postDetail);
  }

  async getPost(postId) {
    const key = this.client.buildKey(this.config.prefixes.post, postId);
    return this.client.get(key);
  }

  async invalidatePost(postId) {
    const key = this.client.buildKey(this.config.prefixes.post, postId);
    return this.client.del(key);
  }

  // Feed caching (list-based)
  async cacheFeed(userId, feedData, page = 1) {
    const key = this.client.buildKey(this.config.prefixes.user, userId, 'feed', page);
    return this.client.set(key, feedData, this.config.ttl.postList);
  }

  async getFeed(userId, page = 1) {
    const key = this.client.buildKey(this.config.prefixes.user, userId, 'feed', page);
    return this.client.get(key);
  }

  async invalidateFeed(userId) {
    const pattern = this.client.buildKey(this.config.prefixes.user, userId, 'feed', '*');
    return this.client.delPattern(pattern);
  }

  // Session management
  async cacheSession(sessionId, sessionData) {
    const key = this.client.buildKey(this.config.prefixes.session, sessionId);
    return this.client.set(key, sessionData, this.config.ttl.userSession);
  }

  async getSession(sessionId) {
    const key = this.client.buildKey(this.config.prefixes.session, sessionId);
    return this.client.get(key);
  }

  async invalidateSession(sessionId) {
    const key = this.client.buildKey(this.config.prefixes.session, sessionId);
    return this.client.del(key);
  }

  // Rate limiting
  async checkRateLimit(identifier, limit, window) {
    const key = this.client.buildKey(this.config.prefixes.ratelimit, identifier);
    const count = await this.client.incr(key, window);
    return count <= limit;
  }

  // Cache-aside pattern with automatic invalidation
  async getOrFetch(key, fetchFn, ttl) {
    // Try to get from cache
    let data = await this.client.get(key);
    
    if (data !== null) {
      return data;
    }
    
    // Fetch from source
    data = await fetchFn();
    
    if (data !== null && data !== undefined) {
      await this.client.set(key, data, ttl);
    }
    
    return data;
  }

  // Batch invalidation for related entities
  async invalidateRelated(entity, id) {
    const patterns = {
      user: [
        `${this.config.prefixes.user}${id}`,
        `${this.config.prefixes.user}${id}:*`,
        `${this.config.prefixes.post}*:user:${id}`
      ],
      post: [
        `${this.config.prefixes.post}${id}`,
        `${this.config.prefixes.comment}post:${id}:*`,
        `${this.config.prefixes.user}*:feed:*`
      ]
    };

    const toInvalidate = patterns[entity] || [];
    
    for (const pattern of toInvalidate) {
      if (pattern.includes('*')) {
        await this.client.delPattern(pattern);
      } else {
        await this.client.del(pattern);
      }
    }
  }
}

// ===================================================================
// CACHE WARMING STRATEGIES
// ===================================================================

class CacheWarmer {
  constructor(cacheService) {
    this.cache = cacheService;
  }

  /**
   * Warm popular user profiles
   */
  async warmPopularUsers(userIds) {
    // Fetch users from database
    const users = await fetchUsersFromDB(userIds);
    
    // Cache each user
    for (const user of users) {
      await this.cache.cacheUser(user.id, user);
    }
    
    console.log(`Warmed ${users.length} user profiles`);
  }

  /**
   * Warm trending posts
   */
  async warmTrendingPosts(postIds) {
    const posts = await fetchPostsFromDB(postIds);
    
    for (const post of posts) {
      await this.cache.cachePost(post.id, post);
    }
    
    console.log(`Warmed ${posts.length} trending posts`);
  }

  /**
   * Schedule periodic cache warming
   */
  scheduleWarming(intervalMinutes = 15) {
    setInterval(async () => {
      try {
        // Warm popular data
        const popularUserIds = await getPopularUserIds();
        await this.warmPopularUsers(popularUserIds);
        
        const trendingPostIds = await getTrendingPostIds();
        await this.warmTrendingPosts(trendingPostIds);
        
        console.log('Cache warming completed');
      } catch (error) {
        console.error('Cache warming error:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }
}

// ===================================================================
// EXPORTS
// ===================================================================

module.exports = {
  CACHE_CONFIG,
  CacheClient,
  CacheService,
  CacheWarmer
};

// Placeholder functions (implement based on your ORM/database layer)
async function fetchUsersFromDB(userIds) {
  // TODO: Implement database fetch
  return [];
}

async function fetchPostsFromDB(postIds) {
  // TODO: Implement database fetch
  return [];
}

async function getPopularUserIds() {
  // TODO: Implement logic to get popular user IDs
  return [];
}

async function getTrendingPostIds() {
  // TODO: Implement logic to get trending post IDs
  return [];
}
