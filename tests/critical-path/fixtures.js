/**
 * Test Fixtures for Workstream G Critical-Path Testing
 * 
 * These fixtures provide deterministic, seeded test data for integration tests.
 * Use these fixtures instead of random generation when testing specific scenarios.
 */

// User fixtures
const userFixtures = {
  standard: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    username: 'fixture_standard',
    email: 'fixture.standard@example.com',
    password: 'SecurePass123!',
    firstName: 'Standard',
    lastName: 'User',
    bio: 'A standard test user',
    avatar: 'https://example.com/avatar-standard.jpg'
  },
  premium: {
    id: '550e8400-e29b-41d4-a716-446655440002',
    username: 'fixture_premium',
    email: 'fixture.premium@example.com',
    password: 'Premium123!',
    firstName: 'Premium',
    lastName: 'User',
    bio: 'A premium test user',
    avatar: 'https://example.com/avatar-premium.jpg'
  },
  admin: {
    id: '550e8400-e29b-41d4-a716-446655440003',
    username: 'fixture_admin',
    email: 'fixture.admin@example.com',
    password: 'AdminPass123!',
    firstName: 'Admin',
    lastName: 'User',
    bio: 'An admin test user',
    role: 'admin'
  },
  blocked: {
    id: '550e8400-e29b-41d4-a716-446655440004',
    username: 'fixture_blocked',
    email: 'fixture.blocked@example.com',
    password: 'BlockedPass123!',
    firstName: 'Blocked',
    lastName: 'User',
    bio: 'A blocked test user',
    status: 'blocked'
  }
};

// Post/Feed fixtures
const postFixtures = {
  textPost: {
    id: '650e8400-e29b-41d4-a716-446655440001',
    authorId: userFixtures.standard.id,
    content: 'This is a test post with text content for critical-path testing.',
    type: 'text',
    visibility: 'public',
    timestamp: new Date().toISOString(),
    likeCount: 5,
    commentCount: 2,
    shareCount: 1
  },
  imagePost: {
    id: '650e8400-e29b-41d4-a716-446655440002',
    authorId: userFixtures.standard.id,
    content: 'Check out this amazing image!',
    type: 'image',
    visibility: 'public',
    mediaUrls: ['https://example.com/image-test-001.jpg'],
    timestamp: new Date().toISOString(),
    likeCount: 15,
    commentCount: 5,
    shareCount: 3
  },
  privatePost: {
    id: '650e8400-e29b-41d4-a716-446655440003',
    authorId: userFixtures.premium.id,
    content: 'This is a private post for friends only.',
    type: 'text',
    visibility: 'private',
    timestamp: new Date().toISOString(),
    likeCount: 2,
    commentCount: 1,
    shareCount: 0
  },
  videoPost: {
    id: '650e8400-e29b-41d4-a716-446655440004',
    authorId: userFixtures.premium.id,
    content: 'Check out this video content!',
    type: 'video',
    visibility: 'public',
    mediaUrls: ['https://example.com/video-test-001.mp4'],
    duration: 120,
    timestamp: new Date().toISOString(),
    likeCount: 25,
    commentCount: 8,
    shareCount: 5
  }
};

// Product fixtures
const productFixtures = {
  laptop: {
    id: '750e8400-e29b-41d4-a716-446655440001',
    sellerId: userFixtures.premium.id,
    name: 'Test Laptop Pro',
    description: 'A powerful test laptop for critical-path testing',
    price: 1299.99,
    currency: 'USD',
    category: 'Electronics',
    subcategory: 'Computers',
    stock: 10,
    sku: 'LAPTOP-TEST-001',
    images: ['https://example.com/laptop-001.jpg'],
    rating: 4.5,
    reviewCount: 12,
    isPublic: true,
    isActive: true
  },
  book: {
    id: '750e8400-e29b-41d4-a716-446655440002',
    sellerId: userFixtures.standard.id,
    name: 'Test Book: The Critical Path',
    description: 'An informative test book for testing purposes',
    price: 29.99,
    currency: 'USD',
    category: 'Books',
    subcategory: 'Technology',
    stock: 50,
    sku: 'BOOK-TEST-001',
    images: ['https://example.com/book-001.jpg'],
    rating: 4.2,
    reviewCount: 8,
    isPublic: true,
    isActive: true
  },
  microphone: {
    id: '750e8400-e29b-41d4-a716-446655440003',
    sellerId: userFixtures.premium.id,
    name: 'Test Microphone USB',
    description: 'A high-quality USB test microphone',
    price: 79.99,
    currency: 'USD',
    category: 'Electronics',
    subcategory: 'Audio',
    stock: 25,
    sku: 'MIC-TEST-001',
    images: ['https://example.com/mic-001.jpg'],
    rating: 4.7,
    reviewCount: 23,
    isPublic: true,
    isActive: true
  },
  out_of_stock: {
    id: '750e8400-e29b-41d4-a716-446655440004',
    sellerId: userFixtures.standard.id,
    name: 'Out of Stock Test Item',
    description: 'This item is out of stock',
    price: 49.99,
    currency: 'USD',
    category: 'Testing',
    stock: 0,
    sku: 'OOS-TEST-001',
    images: ['https://example.com/oos-001.jpg'],
    isPublic: true,
    isActive: false
  }
};

// Conversation/Message fixtures
const conversationFixtures = {
  directConversation: {
    id: '850e8400-e29b-41d4-a716-446655440001',
    type: 'direct',
    participants: [userFixtures.standard.id, userFixtures.premium.id],
    name: 'Test Conversation',
    createdAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
    messageCount: 5
  },
  groupConversation: {
    id: '850e8400-e29b-41d4-a716-446655440002',
    type: 'group',
    participants: [
      userFixtures.standard.id,
      userFixtures.premium.id,
      userFixtures.admin.id
    ],
    name: 'Test Group Chat',
    createdAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
    messageCount: 12
  }
};

const messageFixtures = {
  textMessage: {
    id: '950e8400-e29b-41d4-a716-446655440001',
    conversationId: conversationFixtures.directConversation.id,
    senderId: userFixtures.standard.id,
    content: 'Hello, this is a test message!',
    type: 'text',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    isRead: true
  },
  imageMessage: {
    id: '950e8400-e29b-41d4-a716-446655440002',
    conversationId: conversationFixtures.directConversation.id,
    senderId: userFixtures.premium.id,
    content: 'Check out this image',
    type: 'image',
    mediaUrl: 'https://example.com/message-image-001.jpg',
    timestamp: new Date(Date.now() - 30000).toISOString(),
    isRead: true
  },
  unreadMessage: {
    id: '950e8400-e29b-41d4-a716-446655440003',
    conversationId: conversationFixtures.directConversation.id,
    senderId: userFixtures.premium.id,
    content: 'This message hasnt been read yet',
    type: 'text',
    timestamp: new Date().toISOString(),
    isRead: false
  }
};

// Order fixtures
const orderFixtures = {
  completedOrder: {
    id: 'ORD-2026-001',
    buyerId: userFixtures.standard.id,
    items: [
      {
        productId: productFixtures.book.id,
        quantity: 1,
        price: productFixtures.book.price
      }
    ],
    totalPrice: productFixtures.book.price,
    currency: 'USD',
    status: 'completed',
    shippingAddress: {
      line1: '123 Test Street',
      city: 'Test City',
      state: 'TC',
      country: 'Testland',
      zipCode: '12345'
    },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 3600000).toISOString()
  },
  pendingOrder: {
    id: 'ORD-2026-002',
    buyerId: userFixtures.premium.id,
    items: [
      {
        productId: productFixtures.laptop.id,
        quantity: 1,
        price: productFixtures.laptop.price
      },
      {
        productId: productFixtures.microphone.id,
        quantity: 2,
        price: productFixtures.microphone.price
      }
    ],
    totalPrice: productFixtures.laptop.price + productFixtures.microphone.price * 2,
    currency: 'USD',
    status: 'pending',
    shippingAddress: {
      line1: '456 Premium Lane',
      city: 'Premium City',
      state: 'PM',
      country: 'Testland',
      zipCode: '54321'
    },
    createdAt: new Date().toISOString()
  }
};

// Cart fixtures
const cartFixtures = {
  standardCart: {
    userId: userFixtures.standard.id,
    items: [
      {
        productId: productFixtures.book.id,
        quantity: 1,
        addedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        productId: productFixtures.microphone.id,
        quantity: 1,
        addedAt: new Date().toISOString()
      }
    ],
    totalItems: 2,
    totalPrice: productFixtures.book.price + productFixtures.microphone.price
  },
  premiumCart: {
    userId: userFixtures.premium.id,
    items: [
      {
        productId: productFixtures.laptop.id,
        quantity: 1,
        addedAt: new Date().toISOString()
      }
    ],
    totalItems: 1,
    totalPrice: productFixtures.laptop.price
  }
};

// Media/File fixtures
const mediaFixtures = {
  testImage: {
    id: 'MEDIA-IMG-001',
    userId: userFixtures.standard.id,
    filename: 'test-image-001.jpg',
    mimeType: 'image/jpeg',
    size: 102400, // 100KB
    visibility: 'public',
    uploadedAt: new Date().toISOString(),
    url: 'https://example.com/media/test-image-001.jpg'
  },
  testVideo: {
    id: 'MEDIA-VID-001',
    userId: userFixtures.premium.id,
    filename: 'test-video-001.mp4',
    mimeType: 'video/mp4',
    size: 5242880, // 5MB
    visibility: 'private',
    uploadedAt: new Date().toISOString(),
    url: 'https://example.com/media/test-video-001.mp4',
    duration: 300 // 5 minutes
  },
  testDocument: {
    id: 'MEDIA-DOC-001',
    userId: userFixtures.standard.id,
    filename: 'test-document-001.pdf',
    mimeType: 'application/pdf',
    size: 204800, // 200KB
    visibility: 'private',
    uploadedAt: new Date().toISOString(),
    url: 'https://example.com/media/test-document-001.pdf'
  }
};

// Reaction/Engagement fixtures
const reactionFixtures = {
  likes: {
    postId: postFixtures.textPost.id,
    userId: userFixtures.premium.id,
    type: 'like',
    timestamp: new Date().toISOString()
  },
  loves: {
    postId: postFixtures.imagePost.id,
    userId: userFixtures.standard.id,
    type: 'love',
    timestamp: new Date().toISOString()
  },
  wows: {
    postId: postFixtures.videoPost.id,
    userId: userFixtures.premium.id,
    type: 'wow',
    timestamp: new Date().toISOString()
  }
};

module.exports = {
  userFixtures,
  postFixtures,
  productFixtures,
  conversationFixtures,
  messageFixtures,
  orderFixtures,
  cartFixtures,
  mediaFixtures,
  reactionFixtures,
  
  // Helper function to get all fixtures
  getAllFixtures: () => ({
    users: userFixtures,
    posts: postFixtures,
    products: productFixtures,
    conversations: conversationFixtures,
    messages: messageFixtures,
    orders: orderFixtures,
    carts: cartFixtures,
    media: mediaFixtures,
    reactions: reactionFixtures
  })
};
