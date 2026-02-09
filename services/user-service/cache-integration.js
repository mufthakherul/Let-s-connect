/**
 * Cache Integration for User Service
 * Phase 4: Scale & Performance (v2.5)
 * 
 * This file shows how to integrate caching middleware into user-service endpoints
 * Wire this into server.js to enable Redis caching
 */

const { CacheManager, CachingStrategies, InvalidationPatterns } = require('../shared/caching');

// Initialize cache manager
const cache = new CacheManager();

/**
 * Cache middleware for GET /users/:id endpoint
 * Caches user profile data for 10 minutes
 */
const cacheUserProfile = cache.middleware('user:profile', {
    ttl: CachingStrategies.USER_PROFILE.ttl,
    keyGenerator: (req) => req.params.id
});

/**
 * Cache middleware for GET /users/:id/skills endpoint
 * Caches user skills for 10 minutes
 */
const cacheUserSkills = cache.middleware('user:skills', {
    ttl: CachingStrategies.USER_SKILLS.ttl,
    keyGenerator: (req) => req.params.id
});

/**
 * Cache middleware for GET /users search endpoint
 * Caches search results for 5 minutes
 */
const cacheUserSearch = cache.middleware('user:search', {
    ttl: CachingStrategies.SEARCH_RESULTS.ttl,
    keyGenerator: (req) => {
        const { q, role, isActive, limit, offset } = req.query;
        return `${q || 'all'}-${role || 'all'}-${isActive || 'all'}-${limit || 20}-${offset || 0}`;
    }
});

/**
 * Invalidation middleware for POST, PUT, DELETE operations on users
 * Clears user cache when profile is updated
 */
const invalidateUserCache = cache.invalidateMiddleware([
    InvalidationPatterns.USER.profile,
    InvalidationPatterns.USER.skills,
    InvalidationPatterns.USER.posts
]);

/**
 * Invalidation middleware for POST, PUT, DELETE operations on skills
 * Clears only skills cache
 */
const invalidateSkillsCache = cache.invalidateMiddleware([
    InvalidationPatterns.USER.skills
]);

/**
 * Manual cache invalidation function
 * Call this after direct database updates
 */
async function invalidateUserCaches(userId) {
    try {
        await cache.del('user:profile', userId);
        await cache.del('user:skills', userId);
        await cache.delPattern(`user:search:*`);
        console.log(`[Cache] Invalidated caches for user ${userId}`);
    } catch (error) {
        console.error('[Cache] Error invalidating user caches:', error);
    }
}

/**
 * HOW TO INTEGRATE INTO server.js:
 * 
 * 1. Add to package.json:
 *    npm install ioredis
 * 
 * 2. Import at top of server.js:
 *    const { 
 *      cacheUserProfile, 
 *      cacheUserSkills, 
 *      cacheUserSearch,
 *      invalidateUserCache,
 *      invalidateSkillsCache,
 *      invalidateUserCaches
 *    } = require('./cache-integration');
 * 
 * 3. Add to GET routes (add middleware BEFORE route handler):
 *    app.get('/users/:id', cacheUserProfile, authMiddleware, async (req, res) => { ... });
 *    app.get('/users/:id/skills', cacheUserSkills, authMiddleware, async (req, res) => { ... });
 *    app.get('/users', cacheUserSearch, authMiddleware, async (req, res) => { ... });
 * 
 * 4. Add to POST/PUT/DELETE routes (add middleware AFTER route handler):
 *    app.put('/users/:id', authMiddleware, async (req, res) => { ... }, invalidateUserCache);
 *    app.delete('/users/:id', authMiddleware, async (req, res) => { ... }, invalidateUserCache);
 *    app.post('/users/:id/skills', authMiddleware, async (req, res) => { ... }, invalidateSkillsCache);
 * 
 * 5. For direct database updates, call:
 *    await invalidateUserCaches(userId);
 * 
 * EXAMPLE WIRED ROUTE:
 * 
 * // GET user profile with caching
 * app.get('/users/:id', cacheUserProfile, authMiddleware, async (req, res) => {
 *   try {
 *     const user = await User.findByPk(req.params.id, {
 *       include: [Profile, Skills],
 *       attributes: { exclude: ['password', 'twoFactorSecret', 'backupCodes'] }
 *     });
 *     
 *     if (!user) {
 *       return res.status(404).json({ error: 'User not found' });
 *     }
 *     
 *     res.json(user);
 *   } catch (error) {
 *     console.error('Error fetching user:', error);
 *     res.status(500).json({ error: 'Internal server error' });
 *   }
 * });
 * 
 * // UPDATE user profile with cache invalidation
 * app.put('/users/:id', authMiddleware, async (req, res) => {
 *   try {
 *     const user = await User.findByPk(req.params.id);
 *     
 *     if (!user) {
 *       return res.status(404).json({ error: 'User not found' });
 *     }
 *     
 *     await user.update(req.body);
 *     
 *     // Invalidate cache after successful update
 *     await invalidateUserCaches(req.params.id);
 *     
 *     res.json(user);
 *   } catch (error) {
 *     console.error('Error updating user:', error);
 *     res.status(500).json({ error: 'Internal server error' });
 *   }
 * }, invalidateUserCache);
 */

module.exports = {
    cacheUserProfile,
    cacheUserSkills,
    cacheUserSearch,
    invalidateUserCache,
    invalidateSkillsCache,
    invalidateUserCaches
};
