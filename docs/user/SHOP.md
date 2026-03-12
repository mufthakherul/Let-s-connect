# Shop & Marketplace Guide

Welcome to the Milonexa Shop! This comprehensive guide covers everything you need to know about browsing products, shopping, and managing orders on the Milonexa marketplace.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Browsing Products](#browsing-products)
3. [Product Listings](#product-listings)
4. [Product Categories](#product-categories)
5. [Filtering & Search](#filtering--search)
6. [Product Details](#product-details)
7. [Cart Management](#cart-management)
8. [Wishlist](#wishlist)
9. [Checkout Process](#checkout-process)
10. [Payment Methods](#payment-methods)
11. [Order Tracking](#order-tracking)
12. [Seller Features](#seller-features)
13. [Product Reviews](#product-reviews)
14. [Returns & Refunds](#returns--refunds)

---

## Getting Started

### Accessing the Shop

The Milonexa Shop is accessible at `/shop` and requires **no authentication** for browsing. You can:

- Browse all available products
- View product details
- Filter by category and price
- Read reviews from other shoppers

To make purchases, you'll need to:

1. Create a Milonexa account
2. Add a payment method
3. Proceed to checkout

### Shop Overview

The Shop homepage displays:

- **Featured Products**: New and popular items
- **Product Categories**: Browse by type
- **Deals & Promotions**: Current offers
- **Seller Spotlights**: Featured sellers
- **Search Bar**: Find products quickly
- **Shopping Cart**: Quick access to your items

---

## Browsing Products

### Shop Layout

The main shop interface consists of:

```
┌─ Search & Filter Bar ─────────────────────────────────────┐
│ Search: [Find products...]  Category: [All ▼]  Price: [$] │
├─ Left Sidebar ─────────────────┬─ Product Grid ────────────┤
│ Categories                      │ ┌─────────┬──────┬──────┐ │
│ ✓ Electronics                   │ │Product  │Price │Stars │ │
│  - Computers                    │ │1        │$X    │★★★★★│ │
│  - Phones                       │ ├─────────┼──────┼──────┤ │
│  - Accessories                  │ │Product  │Price │Stars │ │
│ ✓ Clothing                      │ │2        │$Y    │★★★★☆│ │
│  - Men                          │ ├─────────┼──────┼──────┤ │
│  - Women                        │ │Product  │Price │Stars │ │
│  - Shoes                        │ │3        │$Z    │★★★☆☆│ │
│ ✓ Books                         │ └─────────┴──────┴──────┘ │
│                                 │        [Load More...]       │
└─────────────────────────────────┴──────────────────────────┘
```

### Product Listings

Each product in the shop displays:

- **Product Image**: High-quality thumbnail
- **Product Name**: Title of the item
- **Price**: Current selling price
- **Seller Name**: Who's selling it
- **Rating**: Average customer rating (1-5 stars)
- **Stock Indicator**: In stock / Low stock / Out of stock
- **Quick Add Button**: Add to cart directly

#### API: Get Product Listings

```bash
GET /api/shop/products
Content-Type: application/json
```

**Query Parameters:**
- `category`: Filter by category (electronics, clothing, books, home, sports, beauty, food, services, digital, other)
- `minPrice`: Minimum price in cents (e.g., 1000 for $10.00)
- `maxPrice`: Maximum price in cents
- `search`: Full-text search in product name and description
- `sort`: Sort order (newest, price-low, price-high, rating, popular)
- `limit`: Number of results (default: 20, max: 100)
- `offset`: Pagination offset

**Response:**
```json
{
  "products": [
    {
      "id": "product-123",
      "name": "Wireless Headphones",
      "description": "Premium noise-canceling headphones",
      "price": 9999,
      "currency": "USD",
      "category": "electronics",
      "images": [
        "https://cdn.milonexa.app/products/headphones-1.jpg",
        "https://cdn.milonexa.app/products/headphones-2.jpg"
      ],
      "seller": {
        "id": "seller-456",
        "name": "ElectroShop",
        "rating": 4.8,
        "reviews": 2341
      },
      "rating": 4.7,
      "reviewCount": 156,
      "inStock": true,
      "stockQuantity": 42,
      "tags": ["electronics", "audio", "headphones"],
      "createdAt": "2023-12-01T10:00:00Z",
      "updatedAt": "2024-01-15T14:30:00Z"
    }
  ],
  "total": 2543,
  "limit": 20,
  "offset": 0,
  "hasMore": true
}
```

---

## Product Categories

The shop is organized into the following categories:

### 1. Electronics

High-tech devices and gadgets:
- Computers (laptops, desktops, tablets)
- Phones & mobile devices
- Audio equipment
- Cameras & photography
- Smart home devices
- Gaming equipment
- Wearables

### 2. Clothing

Apparel and fashion items:
- Men's clothing
- Women's clothing
- Unisex clothing
- Shoes & footwear
- Accessories (belts, scarves, hats)
- Activewear
- Formal wear

### 3. Books

Physical and digital books:
- Fiction
- Non-fiction
- Self-help
- Technical books
- Educational materials
- Children's books

### 4. Home

Furniture and home goods:
- Furniture
- Kitchen appliances
- Bedding & linens
- Home decor
- Lighting
- Tools & hardware
- Storage solutions

### 5. Sports

Sports equipment and gear:
- Exercise equipment
- Sports balls & gear
- Outdoor equipment
- Fitness accessories
- Bikes & skating
- Team sports equipment

### 6. Beauty

Personal care and cosmetics:
- Skincare
- Makeup
- Hair care
- Fragrances
- Bath & body
- Men's grooming
- Health supplements

### 7. Food

Groceries and food items:
- Fresh produce (when available)
- Pantry staples
- Beverages
- Snacks
- Specialty foods
- Organic products

### 8. Services

Intangible services:
- Consulting
- Design services
- Writing & translation
- Tutoring
- Coaching
- Digital services

### 9. Digital

Digital products & downloads:
- Software licenses
- eBooks
- Digital art
- Templates
- Stock photos
- Fonts & graphics
- Video tutorials

### 10. Other

Miscellaneous items:
- Collectibles
- Gifts
- Novelty items
- Used items
- Custom orders

---

## Filtering & Search

### Search Bar

Type keywords to search products by:
- Product name
- Description
- Seller name
- Category
- Tags

**Search Tips:**
- Use multiple keywords for more specific results: "wireless noise-canceling headphones"
- Search is case-insensitive
- Results are sorted by relevance by default

### Filter Options

#### By Category

Click category name in the left sidebar to filter:

```
✓ Electronics (selected)
  ✓ Computers
  ✓ Phones
  ✓ Accessories
○ Clothing
○ Books
```

Select multiple categories to show products from all selected categories.

#### By Price Range

Use the price filter slider or input boxes:

```
Price Range:
[$10.00] ────●─────────────────● [$500.00]
```

Enter exact values or drag the slider to set price limits.

#### By Rating

Filter products by minimum rating:

```
Minimum Rating:
○ All ratings
○ ★★★★★ (5 stars only)
○ ★★★★☆ (4 stars & up)
○ ★★★☆☆ (3 stars & up)
○ ★★☆☆☆ (2 stars & up)
```

#### By Availability

Show only items that are:
- In stock
- Low stock (less than 5 units)
- Pre-order available
- All items

#### By Sort Order

Sort results by:
- **Newest**: Recently added products
- **Price: Low to High**: Cheapest first
- **Price: High to Low**: Most expensive first
- **Rating**: Highest rated first
- **Popular**: Most purchases or views
- **Best Match**: Most relevant to search

### Advanced Filters

Click **"Show More Filters"** to access:

- **Seller**: Filter by specific seller
- **Brands**: Filter by manufacturer
- **Color**: If product has color variants
- **Size**: If product has size variants
- **Price per Unit**: For bulk items
- **Condition**: New, Like New, Used, Refurbished
- **Shipping Speed**: Same-day, Next-day, Standard
- **Seller Rating**: Minimum seller rating

---

## Product Details

### Product Page Layout

Click any product to view detailed information:

```
┌─ Product Images ────┬─ Product Info ────────────────────┐
│ [Main Image]        │ Product Name                      │
│ ┌─────────────────┐ │ Rating: ★★★★☆ (156 reviews)      │
│ │                 │ │ Price: $99.99                     │
│ │                 │ │ Stock: 42 in stock                │
│ │                 │ │                                   │
│ ├─ Thumbnails ────┤ │ [Add to Cart] [Add to Wishlist]  │
│ [▪] [▪] [▪] [▪]   │ │                                   │
└─────────────────────┼─ Description ──────────────────────┤
  Seller: ElectroShop │ Premium noise-canceling          │
  Reviews: 2,341      │ headphones with 30-hour battery  │
  Rating: 4.8★       │ life. Bluetooth 5.0 connectivity │
                      │ and touch controls.              │
                      │                                   │
                      │ Specifications:                   │
                      │ • Color: Black, White, Silver    │
                      │ • Weight: 250g                   │
                      │ • Battery: 30 hours              │
                      │ • Warranty: 2 years              │
                      │                                   │
                      │ [Reviews] [Q&A] [Shipping Info]  │
└─────────────────────┴───────────────────────────────────┘
```

### Image Gallery

- **Main image**: Large display view
- **Thumbnails**: Click to view different product images
- **Zoom**: Hover to zoom into product details
- **360° view**: Rotate product view (if available)
- **Video**: Play product demo (if available)

### Product Information

#### Basic Details

- **Name**: Product title
- **SKU**: Stock keeping unit (if applicable)
- **Price**: Current selling price
- **Original Price**: Crossed out if on sale
- **Discount**: Percentage off (if applicable)

#### Seller Information

- **Seller Name**: Who's selling the product
- **Seller Rating**: Average rating (1-5 stars)
- **Review Count**: Number of seller reviews
- **Response Time**: How quickly seller responds
- **Seller Badge**: Verified, Trusted, Top Seller (if applicable)

#### Stock Information

- **Stock Status**: In stock / Low stock / Out of stock
- **Quantity Available**: Number of units in stock
- **Ships From**: Location
- **Delivery Estimate**: Expected arrival date
- **Return Policy**: Refund eligibility

### Specifications

Detailed product specifications vary by category:

**Electronics:**
- Brand, model, color
- Technical specs (RAM, storage, etc.)
- Dimensions, weight
- Warranty information

**Clothing:**
- Material composition
- Available sizes
- Available colors
- Care instructions
- Fit information

**Books:**
- ISBN
- Author
- Publication date
- Number of pages
- Language
- Format (hardcover, paperback, ebook)

### Product Description

Rich text description including:
- Product overview and features
- Use cases and benefits
- What's included in the package
- Compatible products
- Important notes or disclaimers

### Seller Profile

Click seller name to view:

- Seller's store front
- Other products from this seller
- Seller ratings and reviews
- Seller response time
- Seller policies (returns, shipping, etc.)
- Contact information

---

## Cart Management

### Adding to Cart

#### Quick Add

Click the **"Add to Cart"** button on product listings to add the default quantity (1) directly.

#### From Product Detail

1. On the product page, enter desired **quantity**
2. Select any **variants** (size, color, etc.)
3. Click **"Add to Cart"**

#### API: Add to Cart

```bash
POST /api/shop/cart
Content-Type: application/json

{
  "productId": "product-123",
  "quantity": 1,
  "variants": {
    "color": "black",
    "size": "medium"
  }
}
```

**Response:**
```json
{
  "cartId": "cart-789",
  "items": [
    {
      "id": "cart-item-001",
      "productId": "product-123",
      "quantity": 1,
      "price": 9999,
      "variants": {
        "color": "black",
        "size": "medium"
      },
      "subtotal": 9999
    }
  ],
  "subtotal": 9999,
  "tax": 800,
  "shipping": 0,
  "total": 10799
}
```

### Viewing Cart

Click the **shopping cart icon** in the top navigation to view your cart:

```
┌─ Shopping Cart ────────────────────────────────────┐
│                                                     │
│ Item 1: Wireless Headphones              $99.99    │
│ Quantity: [1] [+] [-]                             │
│ Color: Black                                       │
│ ✕ Remove                                           │
│                                                     │
│ Item 2: USB-C Cable                      $14.99    │
│ Quantity: [2] [+] [-]                             │
│ ✕ Remove                                           │
│                                                     │
├────────────────────────────────────────────────────┤
│ Subtotal:                           $129.97        │
│ Shipping:                            FREE          │
│ Tax:                                  $10.40       │
│ ────────────────────────────────                   │
│ Total:                              $140.37        │
│                                                     │
│ [Continue Shopping]  [Proceed to Checkout]        │
└────────────────────────────────────────────────────┘
```

### Updating Cart

#### Change Quantity

- Click the **+** or **-** buttons next to the quantity
- Or directly edit the quantity field
- Cart updates in real-time

#### Remove Items

Click the **✕** button next to an item to remove it from the cart.

#### Save for Later

Click **"Save for Later"** to move an item to your wishlist without removing from cart.

#### Apply Coupon

If you have a coupon code:

1. Scroll to **"Coupon Code"** field
2. Enter code
3. Click **"Apply"**
4. Discount applies to total

### Cart Features

- **Free shipping** on orders over $50 (varies by location)
- **Cross-seller ordering**: Buy from multiple sellers in one order
- **Persistent cart**: Cart saved even after closing browser
- **Share cart**: Generate shareable link (useful for gift registries)
- **Save as list**: Save cart items as a wishlist for later

---

## Wishlist

### Adding to Wishlist

From any product detail page:

1. Click **"Add to Wishlist"** button (heart icon)
2. Item is added to your wishlist
3. Heart icon becomes filled to indicate saved status

#### API: Add to Wishlist

```bash
POST /api/shop/wishlist
Content-Type: application/json

{
  "productId": "product-123"
}
```

**Response:**
```json
{
  "id": "wishlist-001",
  "userId": "user-123",
  "productId": "product-123",
  "addedAt": "2024-01-15T15:00:00Z"
}
```

### Viewing Wishlist

1. Click your **Profile** in top-right
2. Select **"Wishlist"**
3. View all saved items

### Wishlist Features

- **Price Alerts**: Get notified when wishlisted items go on sale
- **Share Wishlist**: Generate link to share with friends
- **Move to Cart**: Add wishlisted item to cart from wishlist
- **Remove Item**: Remove from wishlist with one click
- **Organize**: Group wishlist items by category (if you have multiple lists)

---

## Checkout Process

### Step 1: Review Cart

Before checkout:

1. Verify all items are correct
2. Check quantities
3. Apply coupon codes (if applicable)
4. Note delivery estimate

```
Review Cart
✓ Item 1: Wireless Headphones × 1    $99.99
✓ Item 2: USB-C Cable × 2             $29.98
                      Subtotal:      $129.97
```

Click **"Proceed to Checkout"** when ready.

### Step 2: Shipping Address

Enter or select shipping address:

**Form Fields:**
- Full name (required)
- Street address (required)
- City (required)
- State/Province (required)
- ZIP/Postal code (required)
- Country (required)
- Phone number (required)
- Delivery instructions (optional)

**Saved Addresses:**
- Select from previously used addresses
- Mark as default address
- Edit or delete saved addresses

**Shipping Options:**
- Standard (5-7 business days): Free
- Expedited (2-3 business days): +$9.99
- Next Day: +$24.99
- Same Day (where available): +$49.99

### Step 3: Payment Method

#### Adding a Payment Method

**Credit/Debit Cards Accepted:**
- Visa
- Mastercard
- American Express
- Discover

Enter card details:
- Cardholder name
- Card number
- Expiration date (MM/YY)
- CVV (3-4 digit security code)
- Billing address (same as shipping or different)

**Other Payment Methods:**
- PayPal
- Apple Pay
- Google Pay
- Bank transfer (varies by region)

**Save Card for Future Use:**
Check this option to save your card for faster checkout next time.

### Step 4: Order Review

Final review before completing purchase:

```
Order Summary
─────────────────────────────────────────
Items (from 1 seller):
✓ Wireless Headphones × 1    $99.99
✓ USB-C Cable × 2             $29.98

Shipping Address:
John Doe
123 Main Street
Springfield, IL 62701, USA

Shipping Method:
Standard (5-7 business days) - FREE

─────────────────────────────────────────
Subtotal:                    $129.97
Shipping:                    $0.00
Tax:                         $10.40
─────────────────────────────────────────
Total:                       $140.37

Payment Method: Visa ending in 4242

[Cancel]  [Back]  [Complete Purchase]
```

Click **"Complete Purchase"** to finalize the order.

### Order Confirmation

After successful payment:

```
✓ Order Confirmed!

Order Number: #ORD-20240115-001234
Order Date: January 15, 2024, 3:45 PM UTC
Estimated Delivery: January 18, 2024

Your order has been confirmed. A confirmation email has been sent to john@example.com.

Track your order: [View Order Details]
```

---

## Payment Methods

### Stripe Payment Integration

Milonexa uses **Stripe** for secure payment processing.

#### Test Cards (Development)

When in test mode, use these card numbers:

```
Card Number    | Brand        | CVC  | Date      | Result
──────────────────────────────────────────────────────────
4242424242424242 | Visa         | Any  | Future    | Success
5555555555554444 | Mastercard   | Any  | Future    | Success
378282246310005  | Amex         | Any  | Future    | Success
6011111111111117 | Discover     | Any  | Future    | Success
4000002500003155 | Visa (debit) | Any  | Future    | Success
```

#### Live Stripe Integration

In production:

- All payment data is tokenized by Stripe
- Milonexa never stores full card numbers
- PCI DSS compliant
- 3D Secure (3DS) verification available
- Fraud protection enabled

### Payment Security

- **SSL/TLS Encryption**: All data encrypted in transit
- **Tokenization**: Card data converted to secure tokens
- **PCI Compliance**: Meets Payment Card Industry standards
- **Fraud Detection**: Stripe's machine learning detects suspicious transactions
- **Refund Protection**: Buyer and seller protection policies

---

## Order Tracking

### Accessing Your Orders

1. Click **Profile** in top-right
2. Select **"My Orders"**
3. View all your orders

#### API: Get Buyer's Orders

```bash
GET /api/shop/orders
```

**Query Parameters:**
- `status`: Filter by status (pending, processing, shipped, delivered, cancelled)
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset
- `search`: Search by order number or product name

**Response:**
```json
{
  "orders": [
    {
      "id": "order-001",
      "orderNumber": "#ORD-20240115-001234",
      "status": "shipped",
      "createdAt": "2024-01-15T15:45:00Z",
      "items": [
        {
          "productId": "product-123",
          "name": "Wireless Headphones",
          "quantity": 1,
          "price": 9999
        }
      ],
      "total": 10799,
      "shippingAddress": {
        "name": "John Doe",
        "street": "123 Main Street",
        "city": "Springfield",
        "state": "IL",
        "zip": "62701",
        "country": "US"
      },
      "trackingNumber": "1Z999AA10123456784",
      "carrier": "UPS",
      "estimatedDelivery": "2024-01-18T23:59:59Z"
    }
  ],
  "total": 1
}
```

### Order Status

Track order progress through these stages:

1. **Pending** (🔵 Blue)
   - Payment received
   - Order awaiting processing by seller

2. **Processing** (🟡 Yellow)
   - Seller is picking and packing items
   - Typical duration: 1-2 business days

3. **Shipped** (🟢 Green)
   - Package is in transit
   - Tracking information available

4. **Delivered** (✅ Green)
   - Package arrived at your address
   - Delivery confirmed

5. **Cancelled** (🔴 Red)
   - Order was cancelled by buyer or seller
   - Refund processed

### Tracking Information

Once order is shipped, view:

- **Tracking Number**: UPS, FedEx, USPS, etc.
- **Carrier**: Which shipping company
- **Tracking URL**: Link to carrier's tracking page
- **Estimated Delivery**: Expected arrival date
- **Delivery Updates**: Real-time status updates from carrier

```
Order #ORD-20240115-001234
Status: Shipped ✓
─────────────────────────────
Tracking: 1Z999AA10123456784 (UPS)
Estimated Delivery: Thursday, Jan 18

Timeline:
Jan 15 - 3:45 PM  Order placed
Jan 16 - 9:20 AM  Order processed
Jan 16 - 2:30 PM  Shipped from warehouse
Jan 17 - 5:15 AM  In transit (Chicago, IL)
Jan 17 - 8:45 PM  Out for delivery (Your area)
```

### Order Actions

From your order detail page:

- **View Tracking**: Jump to carrier's tracking page
- **View Receipt**: Download order receipt as PDF
- **Contact Seller**: Send message to seller
- **Request Return**: Start return process
- **Leave Review**: Rate product and seller
- **Report Issue**: Report problem with order

---

## Seller Features

### Listing Products

If you're a seller, click **"Seller Dashboard"** in your profile.

#### Creating a Product Listing

1. Click **"New Product"**
2. Fill in product details:
   - Product name (required)
   - Category (required)
   - Description (required)
   - Price (required)
   - Currency
   - SKU (optional)

3. Upload images:
   - At least one image required
   - Up to 10 images per product
   - Images should be high-quality (min 500×500px)

4. Set product specifications:
   - Size options (if applicable)
   - Color options (if applicable)
   - Material, weight, dimensions
   - Product tags

5. Configure inventory:
   - Starting quantity
   - Low stock alert threshold
   - Reorder information

6. Set shipping:
   - Shipping weight
   - Dimensions for shipping calc
   - Shipping restrictions (if any)

7. Add warranty information:
   - Warranty period
   - Warranty coverage details
   - Service contact

8. Configure return policy:
   - Return window (30, 60, 90 days)
   - Return condition
   - Refund timeframe

#### API: Create Product Listing

```bash
POST /api/shop/products
Content-Type: application/json
Authorization: Bearer {seller-token}

{
  "name": "Wireless Headphones",
  "category": "electronics",
  "description": "Premium noise-canceling headphones...",
  "price": 9999,
  "currency": "USD",
  "images": [
    "https://cdn.milonexa.app/seller/image1.jpg"
  ],
  "specifications": {
    "brand": "AudioPro",
    "color": ["black", "white", "silver"],
    "weight": "250g",
    "warranty": "2 years"
  },
  "inventory": {
    "quantity": 100,
    "lowStockThreshold": 10
  }
}
```

### Managing Inventory

Update stock levels:

- **Adjust quantity**: Manually update inventory
- **Bulk import**: Upload CSV file with stock levels
- **Low stock alerts**: Notification when inventory is low
- **Reorder reminders**: Get notified to restock popular items

### Viewing Orders

From seller dashboard, view orders for your products:

```
Recent Orders
─────────────────────────────────────
Order #   | Product        | Qty | Status    | Date
─────────────────────────────────────
001234    | Headphones     | 1   | Delivered | Jan 15
001235    | USB Cable      | 2   | Shipped   | Jan 14
001236    | Phone Case     | 1   | Processing| Jan 14
```

### Updating Order Status

For each order, you can update status:

1. **Confirmed**: Acknowledge the order
2. **Processing**: Begin packing
3. **Ready to Ship**: Package is ready
4. **Shipped**: Add tracking number
5. **Delivered**: Confirm delivery
6. **Cancelled**: Cancel order (if necessary)

When you update status, the buyer is automatically notified.

#### API: Update Order Status

```bash
PATCH /api/shop/orders/:orderId
Content-Type: application/json
Authorization: Bearer {seller-token}

{
  "status": "shipped",
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS"
}
```

### Seller Analytics

Dashboard metrics:

- **Sales**: Revenue, order count, average order value
- **Products**: Top-selling products, views, conversion rate
- **Customers**: Repeat customers, geographic distribution
- **Reviews**: Average rating, review trends

### Seller Ratings

Customers rate sellers on:

- **Shipping Speed**: How quickly items ship
- **Accuracy**: Product matches description
- **Communication**: Responsiveness to questions
- **Overall Rating**: 1-5 stars

Maintain high ratings to:
- Increase visibility in search
- Earn "Top Seller" badge
- Build customer trust
- Increase sales

---

## Product Reviews

### Writing a Review

After receiving an order, you can leave a review:

1. Go to **My Orders**
2. Find the order with the product
3. Click **"Leave Review"**

#### Review Form

```
Rate this product: ★★★★☆ (click to rate)

Review Title: [Excellent quality headphones, great value]

Review Content:
[These headphones exceeded my expectations. The noise-
canceling is fantastic, and the battery lasts longer than
advertised. Shipping was quick and packaging was excellent.
Highly recommend!]

[✓ I recommend this product]
[✓ Verified Purchase]

[Cancel]  [Submit Review]
```

#### API: Submit Product Review

```bash
POST /api/shop/products/:productId/reviews
Content-Type: application/json
Authorization: Bearer {buyer-token}

{
  "rating": 5,
  "title": "Excellent quality headphones",
  "content": "These headphones exceeded my expectations...",
  "recommend": true,
  "orderId": "order-001"
}
```

**Response:**
```json
{
  "id": "review-001",
  "productId": "product-123",
  "authorId": "user-123",
  "authorName": "John Doe",
  "rating": 5,
  "title": "Excellent quality headphones",
  "content": "These headphones exceeded my expectations...",
  "helpful": 0,
  "unhelpful": 0,
  "createdAt": "2024-01-18T10:30:00Z",
  "verified": true
}
```

### Review Visibility

- Reviews appear on product page
- Verified purchase badge shown
- Helpful/unhelpful voting
- Reviews are moderated for abuse

### Review Guidelines

Helpful reviews include:

- ✓ Honest opinion about product quality
- ✓ Specific details about features
- ✓ How you use the product
- ✓ Comparison to similar products
- ✓ Honest assessment of value

Avoid:

- ✗ Mentioning price (covered separately)
- ✗ Discussions about shipping (separate feedback)
- ✗ Personal attacks on seller
- ✗ All caps or excessive punctuation
- ✗ Links or promotional content

### Review Helpful Voting

After reading reviews, mark as helpful:

1. Click **thumbs up** if review was helpful
2. Click **thumbs down** if review wasn't helpful
3. Helpful reviews rank higher
4. Vote helps other shoppers find useful reviews

#### API: Vote Review Helpful

```bash
POST /api/shop/reviews/:reviewId/helpful
Content-Type: application/json
Authorization: Bearer {user-token}

{
  "helpful": true
}
```

### Seller Response to Reviews

Sellers can respond to reviews:

```
★★★★★ "Excellent quality headphones"
John Doe - Verified Purchase

These headphones exceeded my expectations...

─ Seller Response (ElectroShop):
Thank you for taking the time to review! We're delighted
you're happy with your purchase. Please don't hesitate to
reach out if you need anything else!
```

---

## Returns & Refunds

### Initiating a Return

If you're not satisfied with a product:

1. Go to **My Orders**
2. Find the product to return
3. Click **"Request Return"**

#### Return Reason

Select reason for return:

```
Why are you returning this?
○ Product defective or damaged
○ Product different from description
○ Changed mind / don't want
○ Found better price elsewhere
○ Arrived too late
○ Other (please specify)
```

#### Return Shipping

- **Seller pays**: Seller provides prepaid label
- **Customer pays**: You pay return shipping
- **Original packaging**: Try to return in original packaging
- **Condition**: Item must be unused/resalable

### Return Status

Track return progress:

```
Return Status: In Transit
─────────────────────────────────────────
Jan 18 - Return authorized
Jan 19 - Return label sent
Jan 19 - Package picked up
Jan 22 - Return received by seller
Jan 23 - Refund processed ($140.37)
```

### Refund Processing

- **Inspection**: Seller inspects returned item
- **Approval**: Seller approves return
- **Refund**: Refund issued to original payment method
- **Timeline**: 5-10 business days after approval

### Exceptions

Some items cannot be returned:

- Gift cards
- Customized/personalized items (after acceptance)
- Items without original packaging
- Items damaged by buyer

---

## Shop Policies

### Privacy

Your shopping information is private:

- Payment details never shared with sellers
- Purchase history kept confidential
- Browsing history not sold to third parties
- See our [Privacy Policy](/policies/privacy) for details

### Buyer Protection

Milonexa protects all purchases:

- Money-back guarantee if item not received
- Refund if item significantly different from description
- Dispute resolution through Milonexa (not directly with seller)
- Protection up to cart total

### Dispute Resolution

If there's a problem with your order:

1. Contact the seller to resolve
2. If unresolved, file a dispute with Milonexa
3. Milonexa reviews evidence from both parties
4. Milonexa makes final decision
5. Refund or replacement issued

### Shop Safety

- All sellers are verified
- Fraud detection and prevention
- Secure checkout with SSL encryption
- Buyer and seller dispute protection

---

## Seller Policies

### For Sellers

If you're selling products:

- **Commission**: Milonexa takes X% of each sale (varies by category)
- **Payout**: Payments made every 14 days
- **Minimum payout**: $100 minimum to trigger payout
- **Holds**: New sellers may have 30-day payment hold
- **Chargeback policy**: Chargebacks count against seller record

### Seller Restrictions

Sellers cannot:

- Offer products outside category
- Misrepresent product condition
- Engage in fraud or scams
- Violate seller conduct policy
- Request buyers pay outside platform
- Collect personal information improperly

Violation results in account suspension or termination.

---

## Tips for Smart Shopping

### Save Money

1. **Use filters**: Filter by price to find deals
2. **Compare prices**: Check multiple sellers
3. **Wishlist items**: Save for sales
4. **Subscribe**: Some sellers offer discounts on subscriptions
5. **Bundle deals**: Buy related items together
6. **Seasonal sales**: Watch for holiday promotions

### Stay Safe

1. **Verify seller**: Check ratings and reviews
2. **Read descriptions**: Ensure product meets your needs
3. **Check return policy**: Know what you can return
4. **Save receipts**: Keep order confirmations
5. **Report suspicious**: Report scams or fake products
6. **Use strong passwords**: Protect your account

### Best Practices

1. **Read reviews**: Learn from other buyers
2. **Ask questions**: Contact seller before buying
3. **Check specs**: Ensure product matches needs
4. **Compare ratings**: Check seller and product ratings
5. **Start with small purchases**: Build trust with new sellers

---

## Need Help?

- **Shop FAQ**: `/hubs/helpcenter#shop`
- **Contact Support**: `/hubs/helpcenter#support`
- **Community Forum**: `/hubs/forum`
- **Report Problem**: Contact seller or file dispute

Last updated: 2024-01-15
