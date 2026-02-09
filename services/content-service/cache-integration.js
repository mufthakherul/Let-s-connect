/**
 * Cache Integration for Content Service
 * Phase 4: Scale & Performance (v2.5)
 * 
 * This file shows how to integrate caching middleware into content-service endpoints
 * Wire this into server.js to enable Redis caching for posts, comments, pages, and wiki
 */

const { CacheManager, CachingStrategies, InvalidationPatterns } = require('../shared/caching');

// Initialize cache manager
const cache = new CacheManager();

/**
 * Cache middleware for GET /feed/:userId endpoint
 * Caches post feed for 2 minutes
 */
const cachePostFeed = cache.middleware('post:feed', {
    ttl: CachingStrategies.POST_FEED.ttl,
    keyGenerator: (req) => {
        const { page = 1, limit = 20 } = req.query;
        return `${req.params.userId || 'all'}-${page}-${limit}`;
    }
});

/**
 * Cache middleware for GET /posts/:id endpoint
 * Caches individual post for 5 minutes
 */
const cachePost = cache.middleware('post:detail', {
    ttl: CachingStrategies.POST_DETAILS.ttl,
    keyGenerator: (req) => req.params.id
});

/**
 * Cache middleware for GET /posts/:postId/comments endpoint
 * Caches post comments for 3 minutes
 */
const cacheComments = cache.middleware('post:comments', {
    ttl: CachingStrategies.COMMENTS.ttl,
    keyGenerator: (req) => req.params.postId
});

/**
 * Cache middleware for GET /pages endpoint
 * Caches wiki pages list for 30 minutes
 */
const cacheWikiPages = cache.middleware('wiki:pages', {
    ttl: CachingStrategies.WIKI_PAGES.ttl,
    keyGenerator: (req) => {
        const { category, tags, search } = req.query;
        return `${category || 'all'}-${tags || 'all'}-${search || 'all'}`;
    }
});

/**
 * Cache middleware for GET /pages/:slug endpoint
 * Caches individual wiki page for 30 minutes
 */
const cacheWikiPage = cache.middleware('wiki:page', {
    ttl: CachingStrategies.WIKI_PAGE_DETAILS.ttl,
    keyGenerator: (req) => req.params.slug
});

/**
 * Cache middleware for GET /videos endpoint
 * Caches video list for 10 minutes
 */
const cacheVideos = cache.middleware('video:list', {
    ttl: CachingStrategies.VIDEO_LIST.ttl,
    keyGenerator: (req) => {
        const { category, limit, offset } = req.query;
        return `${category || 'all'}-${limit || 20}-${offset || 0}`;
    }
});

/**
 * Invalidation middleware for POST, PUT, DELETE operations on posts
 * Clears post-related caches
 */
const invalidatePostCache = cache.invalidateMiddleware([
    InvalidationPatterns.POST.feed,
    InvalidationPatterns.POST.details,
    InvalidationPatterns.POST.comments,
    InvalidationPatterns.SEARCH.results
]);

/**
 * Invalidation middleware for POST, PUT, DELETE operations on comments
 * Clears comment caches
 */
const invalidateCommentCache = cache.invalidateMiddleware([
    InvalidationPatterns.POST.comments
]);

/**
 * Invalidation middleware for POST, PUT, DELETE operations on wiki pages
 * Clears wiki caches
 */
const invalidateWikiCache = cache.invalidateMiddleware([
    InvalidationPatterns.POST.feed, // Wiki pages appear in feed
    InvalidationPatterns.SEARCH.results
]);

/**
 * Manual cache invalidation functions
 */
async function invalidatePostCaches(postId) {
    try {
        await cache.del('post:detail', postId);
        await cache.del('post:comments', postId);
        await cache.delPattern('post:feed:*');
        await cache.delPattern('search:*');
        console.log(`[Cache] Invalidated caches for post ${postId}`);
    } catch (error) {
        console.error('[Cache] Error invalidating post caches:', error);
    }
}

async function invalidateWikiPageCaches(slug) {
    try {
        await cache.del('wiki:page', slug);
        await cache.delPattern('wiki:pages:*');
        await cache.delPattern('search:*');
        console.log(`[Cache] Invalidated caches for wiki page ${slug}`);
    } catch (error) {
        console.error('[Cache] Error invalidating wiki caches:', error);
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
 *      cachePostFeed, 
 *      cachePost, 
 *      cacheComments,
 *      cacheWikiPages,
 *      cacheWikiPage,
 *      cacheVideos,
 *      invalidatePostCache,
 *      invalidateCommentCache,
 *      invalidateWikiCache,
 *      invalidatePostCaches,
 *      invalidateWikiPageCaches
 *    } = require('./cache-integration');
 * 
 * 3. Add to GET routes:
 *    app.get('/posts', cachePostFeed, authMiddleware, async (req, res) => { ... });
 *    app.get('/posts/:id', cachePost, authMiddleware, async (req, res) => { ... });
 *    app.get('/posts/:id/comments', cacheComments, authMiddleware, async (req, res) => { ... });
 *    app.get('/pages', cacheWikiPages, async (req, res) => { ... });
 *    app.get('/pages/:slug', cacheWikiPage, async (req, res) => { ... });
 *    app.get('/videos', cacheVideos, async (req, res) => { ... });
 * 
 * 4. Add to POST/PUT/DELETE routes:
 *    app.post('/posts', authMiddleware, async (req, res) => { ... }, invalidatePostCache);
 *    app.put('/posts/:id', authMiddleware, async (req, res) => { ... }, invalidatePostCache);
 *    app.delete('/posts/:id', authMiddleware, async (req, res) => { ... }, invalidatePostCache);
 *    app.post('/posts/:id/comments', authMiddleware, async (req, res) => { ... }, invalidateCommentCache);
 *    app.put('/pages/:id', authMiddleware, async (req, res) => { ... }, invalidateWikiCache);
 * 
 * EXAMPLE WIRED ROUTES:
 * 
 * // GET post feed with caching
 * app.get('/posts', cachePostFeed, authMiddleware, async (req, res) => {
 *   try {
 *     const { userId, visibility = 'public', limit = 20, offset = 0 } = req.query;
 *     
 *     const where = { visibility };
 *     if (userId) where.authorId = userId;
 *     
 *     const posts = await Post.findAll({
 *       where,
 *       include: [{ model: User, as: 'author', attributes: ['id', 'username', 'avatar'] }],
 *       order: [['createdAt', 'DESC']],
 *       limit: parseInt(limit),
 *       offset: parseInt(offset)
 *     });
 *     
 *     res.json({ posts, total: posts.length });
 *   } catch (error) {
 *     console.error('Error fetching posts:', error);
 *     res.status(500).json({ error: 'Internal server error' });
 *   }
 * });
 * 
 * // CREATE post with cache invalidation
 * app.post('/posts', authMiddleware, async (req, res) => {
 *   try {
 *     const post = await Post.create({
 *       ...req.body,
 *       authorId: req.user.id
 *     });
 *     
 *     // Invalidate feed caches
 *     await invalidatePostCaches(post.id);
 *     
 *     res.status(201).json(post);
 *   } catch (error) {
 *     console.error('Error creating post:', error);
 *     res.status(500).json({ error: 'Internal server error' });
 *   }
 * }, invalidatePostCache);
 */

module.exports = {
    cachePostFeed,
    cachePost,
    cacheComments,
    cacheWikiPages,
    cacheWikiPage,
    cacheVideos,
    invalidatePostCache,
    invalidateCommentCache,
    invalidateWikiCache,
    invalidatePostCaches,
    invalidateWikiPageCaches
};
