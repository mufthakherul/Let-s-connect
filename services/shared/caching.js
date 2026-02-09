/**
 * Redis Caching Middleware for Let's Connect Platform
 * Phase 4: Scale & Performance (v2.5)
 * 
 * Provides caching strategies for frequently accessed data across all services
 */

const Redis = require('ioredis');

class CacheManager {
    constructor(config = {}) {
        this.redis = new Redis(config.redisUrl || process.env.REDIS_URL || 'redis://redis:6379');
        this.defaultTTL = config.defaultTTL || 300; // 5 minutes default
        this.enabled = config.enabled !== false;

        this.redis.on('error', (err) => {
            console.error('Redis connection error:', err);
            this.enabled = false; // Graceful degradation
        });

        this.redis.on('connect', () => {
            console.log('✅ Redis cache connected successfully');
            this.enabled = true;
        });
    }

    /**
     * Generate cache key with namespace
     */
    generateKey(namespace, identifier) {
        return `cache:${namespace}:${identifier}`;
    }

    /**
     * Get cached data
     */
    async get(namespace, identifier) {
        if (!this.enabled) return null;

        try {
            const key = this.generateKey(namespace, identifier);
            const data = await this.redis.get(key);

            if (data) {
                console.log(`✅ Cache HIT: ${key}`);
                return JSON.parse(data);
            }

            console.log(`❌ Cache MISS: ${key}`);
            return null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Set cached data with TTL
     */
    async set(namespace, identifier, data, ttl = this.defaultTTL) {
        if (!this.enabled) return false;

        try {
            const key = this.generateKey(namespace, identifier);
            await this.redis.setex(key, ttl, JSON.stringify(data));
            console.log(`✅ Cache SET: ${key} (TTL: ${ttl}s)`);
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    /**
     * Delete cached data
     */
    async del(namespace, identifier) {
        if (!this.enabled) return false;

        try {
            const key = this.generateKey(namespace, identifier);
            await this.redis.del(key);
            console.log(`✅ Cache DELETED: ${key}`);
            return true;
        } catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    }

    /**
     * Delete all cache keys matching pattern
     */
    async delPattern(pattern) {
        if (!this.enabled) return false;

        try {
            const keys = await this.redis.keys(`cache:${pattern}`);
            if (keys.length > 0) {
                await this.redis.del(...keys);
                console.log(`✅ Cache DELETED ${keys.length} keys matching: ${pattern}`);
            }
            return true;
        } catch (error) {
            console.error('Cache delete pattern error:', error);
            return false;
        }
    }

    /**
     * Cache-aside pattern middleware for Express
     */
    middleware(namespace, options = {}) {
        return async (req, res, next) => {
            if (!this.enabled) return next();

            const {
                keyGenerator = () => req.originalUrl,
                ttl = this.defaultTTL,
                condition = () => req.method === 'GET'
            } = options;

            // Only cache GET requests by default
            if (!condition(req)) return next();

            const cacheKey = keyGenerator(req);
            const cachedData = await this.get(namespace, cacheKey);

            if (cachedData) {
                return res.json(cachedData);
            }

            // Override res.json to cache the response
            const originalJson = res.json.bind(res);
            res.json = (data) => {
                // Cache the response
                this.set(namespace, cacheKey, data, ttl).catch(err => {
                    console.error('Failed to cache response:', err);
                });
                return originalJson(data);
            };

            next();
        };
    }

    /**
     * Invalidate cache on mutations
     */
    invalidateMiddleware(patterns) {
        return async (req, res, next) => {
            // Execute the route handler first
            const originalJson = res.json.bind(res);
            res.json = async (data) => {
                // Invalidate cache patterns after successful mutation
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const patternsToInvalidate = typeof patterns === 'function'
                        ? patterns(req, res, data)
                        : patterns;

                    for (const pattern of patternsToInvalidate) {
                        await this.delPattern(pattern);
                    }
                }
                return originalJson(data);
            };
            next();
        };
    }
}

/**
 * Predefined caching strategies for common use cases
 */
const CachingStrategies = {
    // User profile cache (10 minutes)
    USER_PROFILE: { namespace: 'user:profile', ttl: 600 },

    // Post feed cache (2 minutes)
    POST_FEED: { namespace: 'post:feed', ttl: 120 },

    // User posts cache (5 minutes)
    USER_POSTS: { namespace: 'post:user', ttl: 300 },

    // Comments cache (3 minutes)
    COMMENTS: { namespace: 'comments', ttl: 180 },

    // Product listings cache (10 minutes)
    PRODUCTS: { namespace: 'shop:products', ttl: 600 },

    // Product details cache (15 minutes)
    PRODUCT_DETAILS: { namespace: 'shop:product', ttl: 900 },

    // Video listings cache (5 minutes)
    VIDEOS: { namespace: 'videos', ttl: 300 },

    // Wiki pages cache (30 minutes - less frequently changed)
    WIKI_PAGES: { namespace: 'wiki:page', ttl: 1800 },

    // Document listings cache (5 minutes)
    DOCUMENTS: { namespace: 'documents', ttl: 300 },

    // Project listings cache (5 minutes)
    PROJECTS: { namespace: 'projects', ttl: 300 },

    // Search results cache (5 minutes)
    SEARCH_RESULTS: { namespace: 'search', ttl: 300 },

    // Trending content cache (10 minutes)
    TRENDING: { namespace: 'trending', ttl: 600 },

    // Notifications cache (1 minute - frequently updated)
    NOTIFICATIONS: { namespace: 'notifications', ttl: 60 },

    // Skills cache (30 minutes)
    SKILLS: { namespace: 'skills', ttl: 1800 },

    // Pages cache (10 minutes)
    PAGES: { namespace: 'pages', ttl: 600 }
};

/**
 * Cache invalidation patterns
 */
const InvalidationPatterns = {
    // Invalidate user-related caches
    USER: (userId) => [
        `user:profile:${userId}*`,
        `post:user:${userId}*`,
        `skills:${userId}*`
    ],

    // Invalidate post-related caches
    POST: (postId) => [
        `post:feed:*`,
        `post:*:${postId}*`,
        `comments:${postId}*`
    ],

    // Invalidate product-related caches
    PRODUCT: (productId) => [
        `shop:products:*`,
        `shop:product:${productId}*`
    ],

    // Invalidate search caches
    SEARCH: () => [
        `search:*`,
        `trending:*`
    ]
};

module.exports = {
    CacheManager,
    CachingStrategies,
    InvalidationPatterns
};
