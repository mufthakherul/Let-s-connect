const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8006;

app.use(express.json());

// Database
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/shop', {
  dialect: 'postgres',
  logging: false
});

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
  invalidateProductCaches = async () => {};
  invalidateOrderCaches = async () => {};
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

sequelize.sync();

// Routes

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'shop-service' });
});

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

app.listen(PORT, () => {
  console.log(`Shop service running on port ${PORT}`);
});
