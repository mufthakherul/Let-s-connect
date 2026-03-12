const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const { createForwardedIdentityGuard } = require('../shared/security-utils');
const { HealthChecker, checkDatabase } = require('../shared/monitoring');
const { syncWithPolicy } = require('../shared/db-sync-policy');
const { setupQueryMonitoring, queryStatsMiddleware } = require('../shared/query-monitor');
const { getPoolConfig, monitorPoolHealth } = require('../shared/pool-config');
require('dotenv').config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 8006;
const dbPoolProfile = process.env.DB_POOL_PROFILE || 'standard';
const healthChecker = new HealthChecker('shop-service');

app.use(express.json({ limit: '10mb' }));
app.use(createForwardedIdentityGuard());
app.use(healthChecker.metricsMiddleware());

// Database
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/shop', {
  dialect: 'postgres',
  logging: false,
  ...getPoolConfig(dbPoolProfile)
});

healthChecker.registerCheck('database', () => checkDatabase(sequelize));

// Phase 4: Caching integration
let cacheEnabled = false;
let cacheProducts, cacheProduct, cacheProductReviews, cacheOrder, cacheCategories;
let invalidateProductCaches, invalidateOrderCaches;

try {
  const cacheIntegration = require('./cache-integration');
  cacheProducts = cacheIntegration.cacheProducts;
  cacheProduct = cacheIntegration.cacheProduct;
  cacheProductReviews = cacheIntegration.cacheProductReviews;
  cacheOrder = cacheIntegration.cacheOrder;
  cacheCategories = cacheIntegration.cacheCategories;
  invalidateProductCaches = cacheIntegration.invalidateProductCaches;
  invalidateOrderCaches = cacheIntegration.invalidateOrderCaches;
  cacheEnabled = true;
  console.log('[Cache] Redis caching enabled for shop-service');
} catch (error) {
  console.log('[Cache] Redis caching disabled (ioredis not available or Redis not running)');
  // Create no-op middleware for when caching is disabled
  cacheProducts = (req, res, next) => next();
  cacheProduct = (req, res, next) => next();
  cacheProductReviews = (req, res, next) => next();
  cacheOrder = (req, res, next) => next();
  cacheCategories = (req, res, next) => next();
  invalidateProductCaches = async () => { };
  invalidateOrderCaches = async () => { };
}

// Models
const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sellerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'USD'
  },
  images: DataTypes.ARRAY(DataTypes.STRING),
  category: DataTypes.STRING,
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  sellerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'),
    defaultValue: 'pending'
  },
  shippingAddress: DataTypes.JSONB,
  paymentMethod: DataTypes.STRING,
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending'
  }
});

// NEW: Amazon/AliExpress-inspired Shopping Cart
const CartItem = sequelize.define('CartItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
});

// NEW: Amazon/AliExpress-inspired Product Reviews
const ProductReview = sequelize.define('ProductReview', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 }
  },
  title: DataTypes.STRING,
  reviewText: DataTypes.TEXT,
  helpfulCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  verifiedPurchase: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// NEW: Wishlist
const WishlistItem = sequelize.define('WishlistItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false
  }
});

// Relationships
Product.hasMany(Order, { foreignKey: 'productId' });
Order.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(CartItem, { foreignKey: 'productId' });
CartItem.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(ProductReview, { foreignKey: 'productId' });
ProductReview.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(WishlistItem, { foreignKey: 'productId' });
WishlistItem.belongsTo(Product, { foreignKey: 'productId' });

// Routes

app.get('/health', (req, res) => {
  res.json(healthChecker.getBasicHealth());
});

app.get('/health/ready', async (req, res) => {
  try {
    const health = await healthChecker.runChecks();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(healthChecker.getPrometheusMetrics());
});

if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_QUERY_DEBUG_ENDPOINT === 'true') {
  app.get('/debug/query-stats', queryStatsMiddleware);
}

// Public: Browse products
app.get('/public/products', cacheProducts, async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = { isPublic: true, isActive: true };

    if (category) {
      where.category = category;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const products = await Product.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Public: Get single product
app.get('/public/products/:id', cacheProduct, async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, isPublic: true, isActive: true }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product
app.post('/products', async (req, res) => {
  try {
    const product = await Product.create(req.body);

    // Invalidate cache after successful creation
    if (cacheEnabled) {
      await invalidateProductCaches(product.id);
    }

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Get seller products
app.get('/products/seller/:sellerId', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { sellerId: req.params.sellerId },
      order: [['createdAt', 'DESC']]
    });

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Update product
app.put('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await product.update(req.body);
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Create order (requires auth)
app.post('/orders', async (req, res) => {
  try {
    const { buyerId, productId, quantity, shippingAddress, paymentMethod } = req.body;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    const totalAmount = product.price * quantity;

    const order = await Order.create({
      buyerId,
      sellerId: product.sellerId,
      productId,
      quantity,
      totalAmount,
      shippingAddress,
      paymentMethod
    });

    // Update stock
    await product.decrement('stock', { by: quantity });

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get user orders
app.get('/orders/buyer/:buyerId', async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { buyerId: req.params.buyerId },
      include: [Product],
      order: [['createdAt', 'DESC']]
    });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get seller orders
app.get('/orders/seller/:sellerId', async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { sellerId: req.params.sellerId },
      include: [Product],
      order: [['createdAt', 'DESC']]
    });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status
app.put('/orders/:id/status', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await order.update({ status: req.body.status });
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// ========== AMAZON/ALIEXPRESS-INSPIRED: SHOPPING CART ==========

// Add item to cart
app.post('/cart', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Get authenticated user ID from header set by gateway
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }

    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if already in cart
    let cartItem = await CartItem.findOne({ where: { userId, productId } });

    if (cartItem) {
      // Update quantity
      cartItem.quantity += quantity;
      await cartItem.save();
    } else {
      // Create new cart item
      cartItem = await CartItem.create({ userId, productId, quantity });
    }

    // Include product details
    const itemWithProduct = await CartItem.findByPk(cartItem.id, {
      include: [Product]
    });

    res.status(201).json(itemWithProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// Get user's cart
app.get('/cart/:userId', async (req, res) => {
  try {
    // Get authenticated user ID from header set by gateway
    const authUserId = req.header('x-user-id');
    if (!authUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Ensure user can only access their own cart
    if (authUserId !== req.params.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const cartItems = await CartItem.findAll({
      where: { userId: req.params.userId },
      include: [Product]
    });

    // Calculate total
    const total = cartItems.reduce((sum, item) => {
      return sum + (parseFloat(item.Product.price) * item.quantity);
    }, 0);

    res.json({ items: cartItems, total, count: cartItems.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Update cart item quantity
app.put('/cart/:id', async (req, res) => {
  try {
    const { quantity } = req.body;
    const cartItem = await CartItem.findByPk(req.params.id);

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (quantity <= 0) {
      await cartItem.destroy();
      return res.json({ message: 'Item removed from cart' });
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    res.json(cartItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// Remove item from cart
app.delete('/cart/:id', async (req, res) => {
  try {
    const cartItem = await CartItem.findByPk(req.params.id);

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    await cartItem.destroy();
    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

// Clear cart
app.delete('/cart/user/:userId', async (req, res) => {
  try {
    await CartItem.destroy({ where: { userId: req.params.userId } });
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

// ========== AMAZON/ALIEXPRESS-INSPIRED: PRODUCT REVIEWS ==========

// Add product review
app.post('/products/:productId/reviews', async (req, res) => {
  try {
    const { userId, rating, title, reviewText, verifiedPurchase } = req.body;
    const { productId } = req.params;

    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if user already reviewed
    const existing = await ProductReview.findOne({ where: { productId, userId } });
    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }

    const review = await ProductReview.create({
      productId,
      userId,
      rating,
      title,
      reviewText,
      verifiedPurchase
    });

    res.status(201).json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// Get product reviews
app.get('/products/:productId/reviews', async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = 'recent' } = req.query;
    const offset = (page - 1) * limit;

    let order;
    if (sort === 'helpful') {
      order = [['helpfulCount', 'DESC']];
    } else if (sort === 'rating') {
      order = [['rating', 'DESC']];
    } else {
      order = [['createdAt', 'DESC']];
    }

    const reviews = await ProductReview.findAll({
      where: { productId: req.params.productId },
      order,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate average rating
    const allReviews = await ProductReview.findAll({
      where: { productId: req.params.productId },
      attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews']]
    });

    const stats = allReviews[0] ? {
      averageRating: parseFloat(allReviews[0].dataValues.avgRating || 0).toFixed(1),
      totalReviews: parseInt(allReviews[0].dataValues.totalReviews || 0)
    } : { averageRating: 0, totalReviews: 0 };

    res.json({ reviews, stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Mark review as helpful
app.post('/reviews/:id/helpful', async (req, res) => {
  try {
    const review = await ProductReview.findByPk(req.params.id);

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    await review.increment('helpfulCount');
    res.json({ message: 'Review marked as helpful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark review as helpful' });
  }
});

// ========== AMAZON/ALIEXPRESS-INSPIRED: WISHLIST ==========

// Add to wishlist
app.post('/wishlist', async (req, res) => {
  try {
    const { userId, productId } = req.body;

    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if already in wishlist
    const existing = await WishlistItem.findOne({ where: { userId, productId } });
    if (existing) {
      return res.status(400).json({ error: 'Product already in wishlist' });
    }

    const item = await WishlistItem.create({ userId, productId });

    // Include product details
    const itemWithProduct = await WishlistItem.findByPk(item.id, {
      include: [Product]
    });

    res.status(201).json(itemWithProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// Get user's wishlist
app.get('/wishlist/:userId', async (req, res) => {
  try {
    const items = await WishlistItem.findAll({
      where: { userId: req.params.userId },
      include: [Product],
      order: [['createdAt', 'DESC']]
    });

    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// Remove from wishlist
app.delete('/wishlist/:id', async (req, res) => {
  try {
    const item = await WishlistItem.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    await item.destroy();
    res.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

// Friendly root endpoint (avoid default "Cannot GET /")
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'shop-service',
    message: 'Shop service is running.',
    health: '/health'
  });
});

// ─── Stripe Webhook ──────────────────────────────────────────────────────────
// Uses express.raw() as route-level middleware to capture the raw body needed
// for Stripe signature verification. Route-level middleware runs before the
// global express.json(), so req.body will be a Buffer here.
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecret) {
    return res.status(200).json({ received: true, warning: 'STRIPE_WEBHOOK_SECRET not configured' });
  }

  let event;
  try {
    // Lazy-load stripe to avoid startup failure when key not set
    const Stripe = require('stripe');
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, stripeSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: err.message });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;
        if (orderId) {
          await Order.update(
            { paymentStatus: 'paid', status: 'confirmed' },
            { where: { id: orderId } }
          );
          console.log(`[Stripe] Order ${orderId} payment confirmed`);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;
        if (orderId) {
          await Order.update(
            { paymentStatus: 'failed', status: 'cancelled' },
            { where: { id: orderId } }
          );
          // Restore product stock
          const order = await Order.findByPk(orderId);
          if (order) {
            await Product.increment('stock', { by: order.quantity, where: { id: order.productId } });
          }
          console.log(`[Stripe] Order ${orderId} payment failed`);
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        const orderId = charge.metadata?.orderId;
        if (orderId) {
          await Order.update({ paymentStatus: 'refunded', status: 'refunded' }, { where: { id: orderId } });
        }
        break;
      }
      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook] Processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Standard route fallback
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint '${req.originalUrl}' does not exist.`
    }
  });
});

async function ensureSchemaBootstrapIfMissing() {
  const qi = sequelize.getQueryInterface();
  const rawTables = await qi.showAllTables();
  const tableNames = new Set(
    rawTables.map((entry) => (typeof entry === 'string' ? entry : entry.tableName || entry)).filter(Boolean)
  );

  if (!tableNames.has('Products')) {
    console.warn('[Shop Service] Core schema tables missing; bootstrapping with sequelize.sync() for recovery.');
    await sequelize.sync();
  }
}

async function startServer() {
  try {
    const maxDbAttempts = parseInt(process.env.DB_CONNECT_MAX_RETRIES || '20', 10);
    const retryDelayMs = parseInt(process.env.DB_CONNECT_RETRY_DELAY_MS || '3000', 10);

    let dbReady = false;
    let lastError = null;

    for (let attempt = 1; attempt <= maxDbAttempts; attempt++) {
      try {
        await sequelize.authenticate();
        dbReady = true;
        break;
      } catch (error) {
        lastError = error;
        console.warn(`[DB] Connection attempt ${attempt}/${maxDbAttempts} failed: ${error.message}`);
        if (attempt < maxDbAttempts) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    if (!dbReady) {
      throw lastError || new Error('Database connection failed after retries');
    }

    setupQueryMonitoring(sequelize, {
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '100', 10),
      n1Threshold: parseInt(process.env.N1_QUERY_THRESHOLD || '5', 10),
      enableStackTrace: process.env.NODE_ENV !== 'production'
    });
    monitorPoolHealth(sequelize, getPoolConfig(dbPoolProfile));

    await ensureSchemaBootstrapIfMissing();
    await syncWithPolicy(sequelize, 'shop-service');
    app.listen(PORT, () => {
      console.log(`Shop service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

startServer();
