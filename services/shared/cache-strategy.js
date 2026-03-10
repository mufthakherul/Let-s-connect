/**
 * Redis Cache Key Strategy and TTL Policies
 * Workstream F4: Caching and Search
 * 
 * Provides standardized cache key naming, TTL policies, and
 * cache invalidation patterns for consistent caching across services.
 * 
 * Usage:
 *   const { CacheKeyBuilder, CacheTTL, invalidatePattern } = require('../shared/cache-strategy');
 *   const key = CacheKeyBuilder.user(userId);
 *   await redis.setex(key, CacheTTL.USER_PROFILE, JSON.stringify(user));
 */

const logger = require('./logger');

/**
 * Standard TTL values (in seconds)
 */
const CacheTTL = {
  // User data
  USER_PROFILE: 300,           // 5 minutes
  USER_SESSION: 3600,          // 1 hour
  USER_PREFERENCES: 1800,      // 30 minutes
  USER_PERMISSIONS: 600,       // 10 minutes (frequently checked)
  
  // Content data
  POST: 180,                   // 3 minutes (high churn)
  POST_LIST: 60,               // 1 minute (lists change frequently)
  COMMENT: 300,                // 5 minutes
  FEED: 30,                    // 30 seconds (personalized, needs freshness)
  TRENDING: 300,               // 5 minutes (aggregated data)
  
  // Static/Semi-static data
  CATEGORIES: 3600,            // 1 hour
  TAGS: 1800,                  // 30 minutes
  SYSTEM_CONFIG: 600,          // 10 minutes
  FEATURE_FLAGS: 300,          // 5 minutes
  
  // Search results
  SEARCH_RESULTS: 300,         // 5 minutes
  AUTOCOMPLETE: 600,           // 10 minutes (suggestions don't change often)
  
  // Analytics/Aggregated data
  STATS_DAILY: 3600,           // 1 hour
  STATS_MONTHLY: 86400,        // 24 hours
  LEADERBOARD: 600,            // 10 minutes
  
  // API responses
  API_RESPONSE: 60,            // 1 minute (general API cache)
  API_LIST: 30,                // 30 seconds (lists are dynamic)
  
  // Temporary locks and flags
  RATE_LIMIT: 3600,            // 1 hour
  TEMPORARY_LOCK: 30,          // 30 seconds
  OTP_CODE: 300,               // 5 minutes
  
  // Media
  MEDIA_METADATA: 1800,        // 30 minutes
  CDN_URL: 86400,              // 24 hours (CDN URLs are stable)
  
  // Custom TTLs
  SHORT: 60,                   // 1 minute
  MEDIUM: 300,                 // 5 minutes
  LONG: 1800,                  // 30 minutes
  VERY_LONG: 3600,             // 1 hour
  DAY: 86400,                  // 24 hours
  WEEK: 604800                 // 7 days
};

/**
 * Cache key namespace prefixes
 * Format: {service}:{entity}:{identifier}:{sub-entity}
 */
const CacheNamespace = {
  USER: 'user',
  CONTENT: 'content',
  MESSAGE: 'message',
  COLLAB: 'collab',
  MEDIA: 'media',
  SHOP: 'shop',
  AI: 'ai',
  STREAM: 'stream',
  SYSTEM: 'system'
};

/**
 * Cache Key Builder
 * Generates consistent, namespaced cache keys
 */
class CacheKeyBuilder {
  /**
   * User keys
   */
  static user(userId) {
    return `${CacheNamespace.USER}:profile:${userId}`;
  }
  
  static userSession(sessionId) {
    return `${CacheNamespace.USER}:session:${sessionId}`;
  }
  
  static userPreferences(userId) {
    return `${CacheNamespace.USER}:prefs:${userId}`;
  }
  
  static userPermissions(userId) {
    return `${CacheNamespace.USER}:perms:${userId}`;
  }
  
  /**
   * Content keys
   */
  static post(postId) {
    return `${CacheNamespace.CONTENT}:post:${postId}`;
  }
  
  static postList(filters = {}) {
    const filterStr = Object.keys(filters).length > 0
      ? `:${Object.entries(filters).map(([k, v]) => `${k}:${v}`).join(':')}`
      : '';
    return `${CacheNamespace.CONTENT}:posts${filterStr}`;
  }
  
  static comment(commentId) {
    return `${CacheNamespace.CONTENT}:comment:${commentId}`;
  }
  
  static feed(userId, page = 1) {
    return `${CacheNamespace.CONTENT}:feed:${userId}:${page}`;
  }
  
  static trending(category = 'all', timeframe = '24h') {
    return `${CacheNamespace.CONTENT}:trending:${category}:${timeframe}`;
  }
  
  /**
   * Search keys
   */
  static searchResults(query, filters = {}) {
    const filterStr = Object.keys(filters).length > 0
      ? `:${JSON.stringify(filters)}`
      : '';
    return `${CacheNamespace.SYSTEM}:search:${encodeURIComponent(query)}${filterStr}`;
  }
  
  static autocomplete(prefix) {
    return `${CacheNamespace.SYSTEM}:autocomplete:${encodeURIComponent(prefix)}`;
  }
  
  /**
   * Message keys
   */
  static conversation(conversationId) {
    return `${CacheNamespace.MESSAGE}:conv:${conversationId}`;
  }
  
  static messageList(conversationId, page = 1) {
    return `${CacheNamespace.MESSAGE}:conv:${conversationId}:msgs:${page}`;
  }
  
  /**
   * Media keys
   */
  static mediaMetadata(mediaId) {
    return `${CacheNamespace.MEDIA}:meta:${mediaId}`;
  }
  
  static cdnUrl(mediaId) {
    return `${CacheNamespace.MEDIA}:cdn:${mediaId}`;
  }
  
  /**
   * Shop keys
   */
  static product(productId) {
    return `${CacheNamespace.SHOP}:product:${productId}`;
  }
  
  static cart(userId) {
    return `${CacheNamespace.SHOP}:cart:${userId}`;
  }
  
  /**
   * Rate limiting keys
   */
  static rateLimit(identifier, window = '1h') {
    return `${CacheNamespace.SYSTEM}:ratelimit:${identifier}:${window}`;
  }
  
  /**
   * Generic pattern for custom keys
   */
  static custom(namespace, entity, ...identifiers) {
    return `${namespace}:${entity}:${identifiers.join(':')}`;
  }
}

/**
 * Cache Invalidation Patterns
 */
class CacheInvalidation {
  /**
   * Invalidate all caches for a specific user
   * @param {Redis} redis - Redis client
   * @param {string} userId - User ID
   */
  static async invalidateUser(redis, userId) {
    const patterns = [
      CacheKeyBuilder.user(userId),
      CacheKeyBuilder.userPreferences(userId),
      CacheKeyBuilder.userPermissions(userId),
      // Also invalidate feeds that include this user
      `${CacheNamespace.CONTENT}:feed:${userId}:*`
    ];
    
    return await this._deletePatterns(redis, patterns);
  }
  
  /**
   * Invalidate all churn caches related to a post
   * @param {Redis} redis - Redis client
   * @param {string} postId - Post ID
   * @param {string} authorId - Post author ID
   */
  static async invalidatePost(redis, postId, authorId = null) {
    const patterns = [
      CacheKeyBuilder.post(postId),
      `${CacheNamespace.CONTENT}:posts:*`, // All post lists
      `${CacheNamespace.CONTENT}:trending:*` // Trending posts
    ];
    
    // Also invalidate author's feed
    if (authorId) {
      patterns.push(`${CacheNamespace.CONTENT}:feed:${authorId}:*`);
    }
    
    return await this._deletePatterns(redis, patterns);
  }
  
  /**
   * Invalidate search caches
   * @param {Redis} redis - Redis client
   */
  static async invalidateSearch(redis) {
    const patterns = [
      `${CacheNamespace.SYSTEM}:search:*`,
      `${CacheNamespace.SYSTEM}:autocomplete:*`
    ];
    
    return await this._deletePatterns(redis, patterns);
  }
  
  /**
   * Invalidate conversation caches
   * @param {Redis} redis - Redis client
   * @param {string} conversationId - Conversation ID
   */
  static async invalidateConversation(redis, conversationId) {
    const patterns = [
      CacheKeyBuilder.conversation(conversationId),
      `${CacheNamespace.MESSAGE}:conv:${conversationId}:*`
    ];
    
    return await this._deletePatterns(redis, patterns);
  }
  
  /**
   * Delete keys matching patterns
   * @param {Redis} redis - Redis client
   * @param {Array<string>} patterns - Redis key patterns
   * @private
   */
  static async _deletePatterns(redis, patterns) {
    let deletedCount = 0;
    
    for (const pattern of patterns) {
      try {
        if (pattern.includes('*')) {
          // Scan for wildcard patterns
          const keys = await this._scanKeys(redis, pattern);
          if (keys.length > 0) {
            deletedCount += await redis.del(...keys);
          }
        } else {
          // Direct delete for exact keys
          deletedCount += await redis.del(pattern);
        }
      } catch (error) {
        logger.error('Cache invalidation failed', {
          pattern,
          error: error.message
        });
      }
    }
    
    logger.info('Cache invalidated', {
      patterns,
      deletedKeys: deletedCount
    });
    
    return deletedCount;
  }
  
  /**
   * Scan Redis keys matching pattern
   * @param {Redis} redis - Redis client
   * @param {string} pattern - Redis key pattern
   * @returns {Array<string>} Matching keys
   * @private
   */
  static async _scanKeys(redis, pattern, count = 100) {
    const keys = [];
    let cursor = '0';
    
    do {
      const [nextCursor, matchedKeys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        count
      );
      cursor = nextCursor;
      keys.push(...matchedKeys);
    } while (cursor !== '0');
    
    return keys;
  }
}

/**
 * Cache Middleware for Express
 * Automatically caches GET responses
 */
function cacheMiddleware(redis, ttl = CacheTTL.API_RESPONSE) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const cacheKey = `${CacheNamespace.SYSTEM}:api:${req.originalUrl}`;
    
    try {
      // Try to get from cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        res.setHeader('X-Cache', 'HIT');
        return res.json(data);
      }
      
      // Cache miss - intercept res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = function(body) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.setex(cacheKey, ttl, JSON.stringify(body)).catch(err => {
            logger.error('Failed to cache response', {
              cacheKey,
              error: err.message
            });
          });
        }
        res.setHeader('X-Cache', 'MISS');
        return originalJson(body);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error', {
        cacheKey,
        error: error.message
      });
      next(); // Proceed without caching
    }
  };
}

/**
 * Cache warming strategies
 */
class CacheWarmer {
  /**
   * Warm frequently accessed caches on startup
   * @param {Redis} redis - Redis client
   * @param {Object} models - Sequelize models
   */
  static async warmCriticalCaches(redis, models) {
    logger.info('Starting cache warming');
    
    try {
      // Warm system config
      const systemConfig = await models.SystemConfig.findAll();
      await redis.setex(
        CacheKeyBuilder.custom(CacheNamespace.SYSTEM, 'config', 'all'),
        CacheTTL.SYSTEM_CONFIG,
        JSON.stringify(systemConfig)
      );
      
      // Warm trending posts
      const trending = await models.Post.findAll({
        limit: 20,
        order: [['likes', 'DESC']],
        where: {
          createdAt: {
            [models.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });
      await redis.setex(
        CacheKeyBuilder.trending('all', '24h'),
        CacheTTL.TRENDING,
        JSON.stringify(trending)
      );
      
      logger.info('Cache warming completed');
    } catch (error) {
      logger.error('Cache warming failed', { error: error.message });
    }
  }
}

/**
 * Cache statistics and monitoring
 */
async function getCacheStats(redis) {
  try {
    const info = await redis.info('stats');
    const lines = info.split('\r\n');
    const stats = {};
    
    for (const line of lines) {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    }
    
    return {
      hits: parseInt(stats.keyspace_hits) || 0,
      misses: parseInt(stats.keyspace_misses) || 0,
      hitRate: stats.keyspace_hits && stats.keyspace_misses
        ? (parseInt(stats.keyspace_hits) / (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses)) * 100).toFixed(2)
        : 0,
      evictedKeys: parseInt(stats.evicted_keys) || 0,
      expiredKeys: parseInt(stats.expired_keys) || 0
    };
  } catch (error) {
    logger.error('Failed to get cache stats', { error: error.message });
    return null;
  }
}

/**
 * Best practices documentation
 */
const bestPractices = {
  keyNaming: `
    1. Use consistent namespace prefixes (service:entity:id)
    2. Include version in keys if schema changes (:v1, :v2)
    3. Avoid special characters except : and -
    4. Keep keys short but descriptive
    5. Use CacheKeyBuilder for consistency
  `,
  
  ttlSelection: `
    1. Short TTL (30-60s) for high-churn data (feeds, lists)
    2. Medium TTL (5-30m) for user data and content
    3. Long TTL (1h-24h) for static/aggregated data
    4. Consider data freshness vs. cache efficiency tradeoff
    5. Monitor cache hit rate to optimize TTLs
  `,
  
  invalidation: `
    1. Invalidate specific keys when data changes
    2. Use pattern matching carefully (can be slow)
    3. Consider write-through caching for critical data
    4. Implement cache-aside pattern for most use cases
    5. Document invalidation triggers for each cache key
  `,
  
  avoidPatterns: [
    'Caching too many variations of the same data',
    'Setting very long TTLs on rapidly changing data',
    'Forgetting to invalidate caches on updates',
    'Caching sensitive user data (passwords, tokens)',
    'Using cache for distributed locks (use Redis locks instead)'
  ]
};

module.exports = {
  CacheTTL,
  CacheNamespace,
  CacheKeyBuilder,
  CacheInvalidation,
  cacheMiddleware,
  CacheWarmer,
  getCacheStats,
  bestPractices
};
