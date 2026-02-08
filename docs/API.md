# API Documentation

## Base URL

- Development: `http://localhost:8000`
- Production: `https://your-domain.com`

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## User Service API

### Register

Create a new user account.

**Endpoint:** `POST /api/user/register`

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** 201 Created
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Login

Authenticate and get JWT token.

**Endpoint:** `POST /api/user/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:** 200 OK
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

### Get Profile

Get user profile information.

**Endpoint:** `GET /api/user/profile/:userId`

**Headers:** Authorization required

**Response:** 200 OK
```json
{
  "id": "uuid-here",
  "username": "johndoe",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Software developer",
  "avatar": "https://...",
  "role": "user",
  "Profile": {
    "phoneNumber": "+1234567890",
    "location": "New York"
  }
}
```

### Update Profile

Update user profile.

**Endpoint:** `PUT /api/user/profile/:userId`

**Headers:** Authorization required

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "bio": "Full-stack developer",
  "avatar": "https://...",
  "profile": {
    "phoneNumber": "+1234567890",
    "location": "San Francisco"
  }
}
```

### Search Users

Search for users by username or name.

**Endpoint:** `GET /api/user/search?q=john`

**Headers:** Authorization required

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe"
  }
]
```

## Content Service API

### Get Public Posts

Get public posts without authentication.

**Endpoint:** `GET /api/content/public/posts?page=1&limit=20`

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "userId": "user-uuid",
    "content": "Hello world!",
    "type": "text",
    "likes": 5,
    "comments": 2,
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Get Public Videos

Get public videos without authentication.

**Endpoint:** `GET /api/content/public/videos?page=1&limit=20`

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "userId": "user-uuid",
    "title": "My Video",
    "description": "Description here",
    "videoUrl": "https://...",
    "thumbnailUrl": "https://...",
    "views": 100,
    "likes": 10,
    "visibility": "public"
  }
]
```

### Get Single Video

Get video details and increment view count.

**Endpoint:** `GET /api/content/public/videos/:id`

**Response:** 200 OK

### Create Post

Create a new post.

**Endpoint:** `POST /api/content/posts`

**Headers:** Authorization required

**Request Body:**
```json
{
  "userId": "user-uuid",
  "content": "My new post",
  "type": "text",
  "mediaUrls": [],
  "visibility": "public"
}
```

**Response:** 201 Created

### Get User Feed

Get personalized feed for user.

**Endpoint:** `GET /api/content/feed/:userId?page=1&limit=20`

**Headers:** Authorization required

### Create Video

Upload video metadata.

**Endpoint:** `POST /api/content/videos`

**Headers:** Authorization required

**Request Body:**
```json
{
  "userId": "user-uuid",
  "title": "My Video",
  "description": "Video description",
  "videoUrl": "https://...",
  "thumbnailUrl": "https://...",
  "duration": 180,
  "visibility": "public"
}
```

### Add Comment

Add comment to post.

**Endpoint:** `POST /api/content/posts/:postId/comments`

**Headers:** Authorization required

**Request Body:**
```json
{
  "userId": "user-uuid",
  "content": "Great post!",
  "parentId": null
}
```

### Get Comments

Get comments for a post.

**Endpoint:** `GET /api/content/posts/:postId/comments`

**Headers:** Authorization required

## Messaging Service API

### Get Conversations

Get user's conversations.

**Endpoint:** `GET /api/messaging/conversations/:userId`

**Headers:** Authorization required

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "name": "Group Chat",
    "type": "group",
    "participants": ["uuid1", "uuid2"],
    "lastMessage": "Hello!",
    "lastMessageAt": "2024-01-01T00:00:00Z"
  }
]
```

### Create Conversation

Create new conversation.

**Endpoint:** `POST /api/messaging/conversations`

**Headers:** Authorization required

**Request Body:**
```json
{
  "name": "Team Chat",
  "type": "group",
  "participants": ["uuid1", "uuid2", "uuid3"]
}
```

### Get Messages

Get messages in conversation.

**Endpoint:** `GET /api/messaging/conversations/:conversationId/messages?page=1&limit=50`

**Headers:** Authorization required

### WebSocket Events

**Connect:** `ws://localhost:8003`

**Events:**
- `join-conversation` - Join conversation room
  ```json
  { "conversationId": "uuid" }
  ```

- `send-message` - Send message
  ```json
  {
    "conversationId": "uuid",
    "senderId": "uuid",
    "content": "Hello!",
    "type": "text",
    "attachments": []
  }
  ```

- `new-message` - Receive message
- `typing` - Typing indicator

## Collaboration Service API

### Get Public Documents

Get public documents without authentication.

**Endpoint:** `GET /api/collaboration/public/docs`

**Response:** 200 OK

### Get Public Wiki Pages

Get public wiki pages without authentication.

**Endpoint:** `GET /api/collaboration/public/wiki`

**Response:** 200 OK

### Get Wiki Page by Slug

Get specific wiki page.

**Endpoint:** `GET /api/collaboration/public/wiki/:slug`

**Response:** 200 OK

### Create Document

Create new document.

**Endpoint:** `POST /api/collaboration/documents`

**Headers:** Authorization required

**Request Body:**
```json
{
  "title": "My Document",
  "content": "Document content...",
  "ownerId": "user-uuid",
  "type": "doc",
  "visibility": "private",
  "collaborators": [],
  "tags": ["work", "project"]
}
```

### Get User Documents

Get documents for user.

**Endpoint:** `GET /api/collaboration/documents/:userId`

**Headers:** Authorization required

### Update Document

Update existing document.

**Endpoint:** `PUT /api/collaboration/documents/:id`

**Headers:** Authorization required

### Create Wiki Page

Create wiki page.

**Endpoint:** `POST /api/collaboration/wiki`

**Headers:** Authorization required

**Request Body:**
```json
{
  "title": "Getting Started",
  "slug": "getting-started",
  "content": "Wiki content...",
  "ownerId": "user-uuid",
  "visibility": "public"
}
```

### Create Task

Create task.

**Endpoint:** `POST /api/collaboration/tasks`

**Headers:** Authorization required

**Request Body:**
```json
{
  "title": "Complete feature",
  "description": "Task description",
  "assigneeId": "user-uuid",
  "status": "todo",
  "priority": "high",
  "dueDate": "2024-12-31",
  "projectId": "project-uuid"
}
```

### Get Tasks

Get filtered tasks.

**Endpoint:** `GET /api/collaboration/tasks?projectId=uuid&assigneeId=uuid&status=todo`

**Headers:** Authorization required

## Media Service API

### Get Public Files

Get public media files.

**Endpoint:** `GET /api/media/public/files`

**Response:** 200 OK

### Upload File

Upload file to storage.

**Endpoint:** `POST /api/media/upload`

**Headers:** Authorization required, Content-Type: multipart/form-data

**Form Data:**
- `file`: File to upload
- `userId`: User UUID
- `visibility`: "public" or "private"

**Response:** 201 Created
```json
{
  "id": "uuid",
  "filename": "1234567890-file.jpg",
  "originalName": "file.jpg",
  "mimeType": "image/jpeg",
  "size": 123456,
  "url": "https://...",
  "type": "image",
  "visibility": "public"
}
```

### Get User Files

Get files uploaded by user.

**Endpoint:** `GET /api/media/files/:userId`

**Headers:** Authorization required

### Get File by ID

Get file details.

**Endpoint:** `GET /api/media/files/id/:fileId`

**Headers:** Authorization required

### Delete File

Delete file from storage.

**Endpoint:** `DELETE /api/media/files/:fileId`

**Headers:** Authorization required

## Shop Service API

### Browse Products

Browse products without authentication.

**Endpoint:** `GET /api/shop/public/products?category=electronics&search=laptop&page=1&limit=20`

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "sellerId": "user-uuid",
    "name": "Laptop",
    "description": "High-performance laptop",
    "price": "999.99",
    "currency": "USD",
    "images": ["https://..."],
    "category": "electronics",
    "stock": 10
  }
]
```

### Get Product Details

Get single product details.

**Endpoint:** `GET /api/shop/public/products/:id`

**Response:** 200 OK

### Create Product

Create product listing.

**Endpoint:** `POST /api/shop/products`

**Headers:** Authorization required

**Request Body:**
```json
{
  "sellerId": "user-uuid",
  "name": "Product Name",
  "description": "Description",
  "price": "29.99",
  "currency": "USD",
  "images": [],
  "category": "electronics",
  "stock": 100
}
```

### Get Seller Products

Get products by seller.

**Endpoint:** `GET /api/shop/products/seller/:sellerId`

**Headers:** Authorization required

### Update Product

Update product details.

**Endpoint:** `PUT /api/shop/products/:id`

**Headers:** Authorization required

### Create Order

Place an order.

**Endpoint:** `POST /api/shop/orders`

**Headers:** Authorization required

**Request Body:**
```json
{
  "buyerId": "user-uuid",
  "productId": "product-uuid",
  "quantity": 2,
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "USA"
  },
  "paymentMethod": "credit_card"
}
```

### Get Buyer Orders

Get orders placed by user.

**Endpoint:** `GET /api/shop/orders/buyer/:buyerId`

**Headers:** Authorization required

### Get Seller Orders

Get orders for seller's products.

**Endpoint:** `GET /api/shop/orders/seller/:sellerId`

**Headers:** Authorization required

### Update Order Status

Update order status.

**Endpoint:** `PUT /api/shop/orders/:id/status`

**Headers:** Authorization required

**Request Body:**
```json
{
  "status": "shipped"
}
```

## AI Service API

### Chat Completion

Chat with AI assistant.

**Endpoint:** `POST /api/ai/chat`

**Headers:** Authorization required

**Request Body:**
```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "userId": "user-uuid"
}
```

**Response:** 200 OK
```json
{
  "response": "Hello! How can I help you today?",
  "cached": false
}
```

### Summarize Text

Summarize long text.

**Endpoint:** `POST /api/ai/summarize`

**Headers:** Authorization required

**Request Body:**
```json
{
  "text": "Long text to summarize..."
}
```

**Response:** 200 OK
```json
{
  "summary": "Summary of the text..."
}
```

### Content Moderation

Check content for inappropriate content.

**Endpoint:** `POST /api/ai/moderate`

**Headers:** Authorization required

**Request Body:**
```json
{
  "text": "Text to moderate"
}
```

**Response:** 200 OK
```json
{
  "flagged": false,
  "categories": {
    "hate": false,
    "violence": false
  },
  "scores": {
    "hate": 0.001,
    "violence": 0.002
  }
}
```

### Search Suggestions

Get AI-powered search suggestions.

**Endpoint:** `POST /api/ai/suggest`

**Headers:** Authorization required

**Request Body:**
```json
{
  "query": "how to",
  "context": "programming"
}
```

**Response:** 200 OK
```json
{
  "suggestions": [
    "how to learn programming",
    "how to debug code",
    "how to write clean code"
  ]
}
```

## Error Responses

All endpoints may return error responses:

**400 Bad Request:**
```json
{
  "error": "Invalid input"
}
```

**401 Unauthorized:**
```json
{
  "error": "No token provided"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Something went wrong"
}
```

## Rate Limiting

- 100 requests per 15 minutes per IP
- Returns 429 Too Many Requests when exceeded

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response includes total count in some endpoints**
