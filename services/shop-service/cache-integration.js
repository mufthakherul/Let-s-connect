/**
 * Cache Integration for Shop Service
 * Phase 4: Scale & Performance (v2.5)
 * 
 * This file shows how to integrate caching middleware into shop-service endpoints
 * Wire this into server.js to enable Redis caching for products, orders, and reviews
 */

const { CacheManager } = require('../shared/caching');
const { CacheTTL } = require('../shared/cache-strategy');

// Initialize cache manager
const cache = new CacheManager();

/**
 * Cache middleware for GET /products endpoint
 * Caches product list for 10 minutes
 */
const cacheProducts = cache.middleware('product:list', {
    ttl: CacheTTL.MEDIUM,
    keyGenerator: (req) => {
        const { category, minPrice, maxPrice, search, limit, offset } = req.query;
        return `${category || 'all'}-${minPrice || 0}-${maxPrice || 'max'}-${search || 'all'}-${limit || 20}-${offset || 0}`;
    }
});

/**
 * Cache middleware for GET /products/:id endpoint
 * Caches individual product for 15 minutes
 */
const cacheProduct = cache.middleware('product:detail', {
    ttl: CacheTTL.LONG,
    keyGenerator: (req) => req.params.id
});

/**
 * Cache middleware for GET /products/:id/reviews endpoint
 * Caches product reviews for 5 minutes
 */
const cacheProductReviews = cache.middleware('product:reviews', {
    ttl: CacheTTL.MEDIUM,
    keyGenerator: (req) => req.params.id
});

/**
 * Cache middleware for GET /orders/:id endpoint
 * Caches individual order for 5 minutes
 */
const cacheOrder = cache.middleware('order:detail', {
    ttl: CacheTTL.MEDIUM,
    keyGenerator: (req) => req.params.id
});

/**
 * Cache middleware for GET /categories endpoint
 * Caches product categories for 1 hour
 */
const cacheCategories = cache.middleware('product:categories', {
    ttl: CacheTTL.VERY_LONG,
    keyGenerator: () => 'all'
});

/**
 * Invalidation middleware for POST, PUT, DELETE operations on products
 * Clears product-related caches
 */
const invalidateProductCache = cache.invalidateMiddleware([
    'shop:products:*',
    'shop:product:*',
    'shop:reviews:*',
    'search:*'
]);

/**
 * Invalidation middleware for POST, PUT, DELETE operations on reviews
 * Clears review caches
 */
const invalidateReviewCache = cache.invalidateMiddleware([
    'shop:reviews:*',
    'shop:product:*' // Reviews affect product rating
]);

/**
 * Invalidation middleware for POST, PUT, DELETE operations on orders
 * Clears order caches
 */
const invalidateOrderCache = cache.invalidateMiddleware([
    'shop:products:*', // Orders affect stock levels
    'shop:order:*'
]);

/**
 * Manual cache invalidation functions
 */
async function invalidateProductCaches(productId) {
    try {
        await cache.del('shop:product', productId);
        await cache.del('shop:reviews', productId);
        await cache.delPattern('shop:products:*');
        await cache.delPattern('shop:product:*');
        await cache.delPattern('shop:reviews:*');
        await cache.delPattern('search:*');
        console.log(`[Cache] Invalidated caches for product ${productId}`);
    } catch (error) {
        console.error('[Cache] Error invalidating product caches:', error);
    }
}

async function invalidateOrderCaches(orderId) {
    try {
        await cache.del('shop:order', orderId);
        await cache.delPattern('shop:products:*');
        console.log(`[Cache] Invalidated caches for order ${orderId}`);
    } catch (error) {
        console.error('[Cache] Error invalidating order caches:', error);
    }
}

async function invalidateCategoryCaches() {
    try {
        await cache.delPattern('shop:categories:*');
        console.log('[Cache] Invalidated category caches');
    } catch (error) {
        console.error('[Cache] Error invalidating category caches:', error);
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
 *      cacheProducts, 
 *      cacheProduct, 
 *      cacheProductReviews,
 *      cacheOrder,
 *      cacheCategories,
 *      invalidateProductCache,
 *      invalidateReviewCache,
 *      invalidateOrderCache,
 *      invalidateProductCaches,
 *      invalidateOrderCaches,
 *      invalidateCategoryCaches
 *    } = require('./cache-integration');
 * 
 * 3. Add to GET routes:
 *    app.get('/products', cacheProducts, async (req, res) => { ... });
 *    app.get('/products/:id', cacheProduct, async (req, res) => { ... });
 *    app.get('/products/:id/reviews', cacheProductReviews, async (req, res) => { ... });
 *    app.get('/orders/:id', cacheOrder, authMiddleware, async (req, res) => { ... });
 *    app.get('/categories', cacheCategories, async (req, res) => { ... });
 * 
 * 4. Add to POST/PUT/DELETE routes:
 *    app.post('/products', authMiddleware, async (req, res) => { ... }, invalidateProductCache);
 *    app.put('/products/:id', authMiddleware, async (req, res) => { ... }, invalidateProductCache);
 *    app.delete('/products/:id', authMiddleware, async (req, res) => { ... }, invalidateProductCache);
 *    app.post('/products/:id/reviews', authMiddleware, async (req, res) => { ... }, invalidateReviewCache);
 *    app.post('/orders', authMiddleware, async (req, res) => { ... }, invalidateOrderCache);
 * 
 * EXAMPLE WIRED ROUTES:
 * 
 * // GET products with caching
 * app.get('/products', cacheProducts, async (req, res) => {
 *   try {
 *     const { category, minPrice, maxPrice, search, limit = 20, offset = 0 } = req.query;
 *     
 *     const where = {};
 *     if (category) where.category = category;
 *     if (minPrice) where.price = { ...where.price, [Op.gte]: parseFloat(minPrice) };
 *     if (maxPrice) where.price = { ...where.price, [Op.lte]: parseFloat(maxPrice) };
 *     if (search) where.name = { [Op.iLike]: `%${search}%` };
 *     
 *     const products = await Product.findAndCountAll({
 *       where,
 *       limit: parseInt(limit),
 *       offset: parseInt(offset),
 *       order: [['createdAt', 'DESC']]
 *     });
 *     
 *     res.json({ products: products.rows, total: products.count });
 *   } catch (error) {
 *     console.error('Error fetching products:', error);
 *     res.status(500).json({ error: 'Internal server error' });
 *   }
 * });
 * 
 * // CREATE product with cache invalidation
 * app.post('/products', authMiddleware, async (req, res) => {
 *   try {
 *     // Only admins can create products
 *     if (req.user.role !== 'admin') {
 *       return res.status(403).json({ error: 'Forbidden' });
 *     }
 *     
 *     const product = await Product.create(req.body);
 *     
 *     // Invalidate product caches
 *     await invalidateProductCaches(product.id);
 *     
 *     res.status(201).json(product);
 *   } catch (error) {
 *     console.error('Error creating product:', error);
 *     res.status(500).json({ error: 'Internal server error' });
 *   }
 * }, invalidateProductCache);
 * 
 * // GET product details with caching
 * app.get('/products/:id', cacheProduct, async (req, res) => {
 *   try {
 *     const product = await Product.findByPk(req.params.id, {
 *       include: [
 *         { model: Review, as: 'reviews', limit: 10, order: [['createdAt', 'DESC']] }
 *       ]
 *     });
 *     
 *     if (!product) {
 *       return res.status(404).json({ error: 'Product not found' });
 *     }
 *     
 *     res.json(product);
 *   } catch (error) {
 *     console.error('Error fetching product:', error);
 *     res.status(500).json({ error: 'Internal server error' });
 *   }
 * });
 * 
 * // CREATE review with cache invalidation
 * app.post('/products/:id/reviews', authMiddleware, async (req, res) => {
 *   try {
 *     const product = await Product.findByPk(req.params.id);
 *     
 *     if (!product) {
 *       return res.status(404).json({ error: 'Product not found' });
 *     }
 *     
 *     const review = await Review.create({
 *       ...req.body,
 *       productId: req.params.id,
 *       userId: req.user.id
 *     });
 *     
 *     // Update product rating
 *     const reviews = await Review.findAll({ where: { productId: req.params.id } });
 *     const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
 *     await product.update({ rating: avgRating, reviewCount: reviews.length });
 *     
 *     // Invalidate caches
 *     await invalidateProductCaches(req.params.id);
 *     
 *     res.status(201).json(review);
 *   } catch (error) {
 *     console.error('Error creating review:', error);
 *     res.status(500).json({ error: 'Internal server error' });
 *   }
 * }, invalidateReviewCache);
 */

module.exports = {
    cacheProducts,
    cacheProduct,
    cacheProductReviews,
    cacheOrder,
    cacheCategories,
    invalidateProductCache,
    invalidateReviewCache,
    invalidateOrderCache,
    invalidateProductCaches,
    invalidateOrderCaches,
    invalidateCategoryCaches
};
