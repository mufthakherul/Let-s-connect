# New Platform Features API Documentation

This document describes the new API endpoints for platform-specific features.

## Table of Contents

1. [Facebook-Inspired Features](#facebook-inspired-features)
2. [Twitter/X-Inspired Features](#twitterx-inspired-features)
3. [YouTube-Inspired Features](#youtube-inspired-features)
4. [Reddit-Inspired Features](#reddit-inspired-features)
5. [Discord-Inspired Features](#discord-inspired-features)
6. [LinkedIn-Inspired Features](#linkedin-inspired-features)
7. [GitHub-Inspired Features](#github-inspired-features)
8. [E-commerce Enhanced Features](#e-commerce-enhanced-features)

---

## Facebook-Inspired Features

### Reactions

#### Add or Update Reaction

Add a reaction to a post or change existing reaction.

**Endpoint:** `POST /api/content/posts/:postId/reactions`

**Headers:** Authorization required

**Request Body:**
```json
{
  "userId": "user-uuid",
  "type": "love"
}
```

**Reaction Types:** `like`, `love`, `haha`, `wow`, `sad`, `angry`

**Response:** 201 Created
```json
{
  "id": "reaction-uuid",
  "postId": "post-uuid",
  "userId": "user-uuid",
  "type": "love",
  "createdAt": "2026-02-08T10:00:00.000Z"
}
```

#### Get Post Reactions

Get all reactions for a post with summary.

**Endpoint:** `GET /api/content/posts/:postId/reactions`

**Response:** 200 OK
```json
{
  "reactions": [
    {
      "id": "reaction-uuid",
      "postId": "post-uuid",
      "userId": "user-uuid",
      "type": "love",
      "createdAt": "2026-02-08T10:00:00.000Z"
    }
  ],
  "summary": {
    "like": 10,
    "love": 5,
    "haha": 2,
    "wow": 1
  },
  "total": 18
}
```

### Pages

#### Create Page

Create a business or brand page.

**Endpoint:** `POST /api/user/pages`

**Headers:** Authorization required

**Request Body:**
```json
{
  "userId": "user-uuid",
  "name": "My Business Page",
  "description": "Official page for my business",
  "category": "Business",
  "avatarUrl": "https://...",
  "coverUrl": "https://..."
}
```

**Response:** 201 Created
```json
{
  "id": "page-uuid",
  "userId": "user-uuid",
  "name": "My Business Page",
  "description": "Official page for my business",
  "category": "Business",
  "avatarUrl": "https://...",
  "coverUrl": "https://...",
  "followers": 0,
  "isVerified": false,
  "createdAt": "2026-02-08T10:00:00.000Z"
}
```

#### Get Page

**Endpoint:** `GET /api/user/pages/:id`

**Response:** 200 OK

#### Follow Page

**Endpoint:** `POST /api/user/pages/:id/follow`

**Headers:** Authorization required

**Response:** 200 OK
```json
{
  "message": "Page followed successfully"
}
```

#### Get User's Pages

**Endpoint:** `GET /api/user/users/:userId/pages`

**Response:** 200 OK - Array of pages

---

## Twitter/X-Inspired Features

### Hashtags

#### Get Posts by Hashtag

Get all posts with a specific hashtag.

**Endpoint:** `GET /api/content/hashtags/:tag/posts`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response:** 200 OK
```json
{
  "tag": "javascript",
  "posts": [
    {
      "id": "post-uuid",
      "userId": "user-uuid",
      "content": "Learning #javascript today!",
      "createdAt": "2026-02-08T10:00:00.000Z"
    }
  ],
  "total": 42
}
```

#### Get Trending Hashtags

**Endpoint:** `GET /api/content/hashtags/trending`

**Query Parameters:**
- `limit` (default: 10)

**Response:** 200 OK
```json
[
  {
    "id": "hashtag-uuid",
    "tag": "javascript",
    "postCount": 150,
    "updatedAt": "2026-02-08T10:00:00.000Z"
  },
  {
    "id": "hashtag-uuid-2",
    "tag": "nodejs",
    "postCount": 120,
    "updatedAt": "2026-02-08T09:30:00.000Z"
  }
]
```

**Note:** Posts automatically extract hashtags. Just include hashtags in your post content like `"Check out #nodejs"`

---

## YouTube-Inspired Features

### Channels

#### Create Channel

Create a video channel.

**Endpoint:** `POST /api/content/channels`

**Headers:** Authorization required

**Request Body:**
```json
{
  "userId": "user-uuid",
  "name": "My Tech Channel",
  "description": "Technology tutorials and reviews",
  "avatarUrl": "https://...",
  "bannerUrl": "https://..."
}
```

**Response:** 201 Created
```json
{
  "id": "channel-uuid",
  "userId": "user-uuid",
  "name": "My Tech Channel",
  "description": "Technology tutorials and reviews",
  "avatarUrl": "https://...",
  "bannerUrl": "https://...",
  "subscribers": 0,
  "createdAt": "2026-02-08T10:00:00.000Z"
}
```

#### Get Channel

**Endpoint:** `GET /api/content/channels/:id`

**Response:** 200 OK - Channel with videos

#### Subscribe to Channel

**Endpoint:** `POST /api/content/channels/:id/subscribe`

**Headers:** Authorization required

**Request Body:**
```json
{
  "userId": "user-uuid"
}
```

**Response:** 201 Created

#### Unsubscribe from Channel

**Endpoint:** `DELETE /api/content/channels/:id/subscribe`

**Headers:** Authorization required

**Request Body:**
```json
{
  "userId": "user-uuid"
}
```

**Response:** 200 OK

---

## Reddit-Inspired Features

### Communities

#### Create Community

Create a Reddit-style community.

**Endpoint:** `POST /api/content/communities`

**Headers:** Authorization required

**Request Body:**
```json
{
  "name": "javascript",
  "description": "A community for JavaScript developers",
  "rules": [
    "Be respectful",
    "No spam",
    "Share quality content"
  ],
  "createdBy": "user-uuid",
  "visibility": "public"
}
```

**Response:** 201 Created
```json
{
  "id": "community-uuid",
  "name": "javascript",
  "description": "A community for JavaScript developers",
  "rules": ["Be respectful", "No spam", "Share quality content"],
  "createdBy": "user-uuid",
  "members": 1,
  "visibility": "public",
  "createdAt": "2026-02-08T10:00:00.000Z"
}
```

#### Get Communities

**Endpoint:** `GET /api/content/communities`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response:** 200 OK - Array of public communities

#### Get Community

**Endpoint:** `GET /api/content/communities/:name`

**Response:** 200 OK

#### Join Community

**Endpoint:** `POST /api/content/communities/:name/join`

**Headers:** Authorization required

**Request Body:**
```json
{
  "userId": "user-uuid"
}
```

**Response:** 201 Created

### Voting

#### Vote on Post

Upvote or downvote a post.

**Endpoint:** `POST /api/content/posts/:postId/vote`

**Headers:** Authorization required

**Request Body:**
```json
{
  "userId": "user-uuid",
  "value": 1
}
```

**Values:** `1` for upvote, `-1` for downvote

**Response:** 201 Created
```json
{
  "id": "vote-uuid",
  "postId": "post-uuid",
  "userId": "user-uuid",
  "value": 1,
  "createdAt": "2026-02-08T10:00:00.000Z"
}
```

#### Get Vote Score

**Endpoint:** `GET /api/content/posts/:postId/votes`

**Response:** 200 OK
```json
{
  "score": 42,
  "upvotes": 50,
  "downvotes": 8,
  "total": 58
}
```

---

## Discord-Inspired Features

### Servers

#### Create Server

Create a Discord-style server.

**Endpoint:** `POST /api/messaging/servers`

**Headers:** Authorization required

**Request Body:**
```json
{
  "name": "My Gaming Server",
  "description": "A server for gamers",
  "ownerId": "user-uuid",
  "icon": "https://..."
}
```

**Response:** 201 Created
```json
{
  "id": "server-uuid",
  "name": "My Gaming Server",
  "description": "A server for gamers",
  "ownerId": "user-uuid",
  "icon": "https://...",
  "members": 1,
  "inviteCode": "abc123",
  "createdAt": "2026-02-08T10:00:00.000Z"
}
```

#### Get Server

**Endpoint:** `GET /api/messaging/servers/:id`

**Headers:** Authorization required

**Response:** 200 OK - Server with channels and roles

#### Get User's Servers

**Endpoint:** `GET /api/messaging/users/:userId/servers`

**Headers:** Authorization required

**Response:** 200 OK - Array of servers

#### Join Server

Join server using invite code.

**Endpoint:** `POST /api/messaging/servers/join`

**Headers:** Authorization required

**Request Body:**
```json
{
  "userId": "user-uuid",
  "inviteCode": "abc123"
}
```

**Response:** 200 OK

#### Create Channel

Create a channel in a server.

**Endpoint:** `POST /api/messaging/servers/:serverId/channels`

**Headers:** Authorization required

**Request Body:**
```json
{
  "name": "general",
  "type": "channel"
}
```

**Response:** 201 Created

### Roles

#### Create Role

**Endpoint:** `POST /api/messaging/servers/:serverId/roles`

**Headers:** Authorization required

**Request Body:**
```json
{
  "name": "Moderator",
  "permissions": ["read_messages", "send_messages", "delete_messages"],
  "color": "#FF5733",
  "position": 1
}
```

**Response:** 201 Created

#### Assign Role to Member

**Endpoint:** `POST /api/messaging/servers/:serverId/members/:userId/roles`

**Headers:** Authorization required

**Request Body:**
```json
{
  "roleId": "role-uuid"
}
```

**Response:** 200 OK

---

## LinkedIn-Inspired Features

### Skills

#### Add Skill

Add a skill to user profile.

**Endpoint:** `POST /api/user/users/:userId/skills`

**Headers:** Authorization required

**Request Body:**
```json
{
  "name": "JavaScript",
  "level": "expert"
}
```

**Levels:** `beginner`, `intermediate`, `advanced`, `expert`

**Response:** 201 Created
```json
{
  "id": "skill-uuid",
  "userId": "user-uuid",
  "name": "JavaScript",
  "level": "expert",
  "endorsements": 0,
  "createdAt": "2026-02-08T10:00:00.000Z"
}
```

#### Get User Skills

**Endpoint:** `GET /api/user/users/:userId/skills`

**Response:** 200 OK - Array of skills ordered by endorsements

#### Delete Skill

**Endpoint:** `DELETE /api/user/skills/:id`

**Headers:** Authorization required

**Response:** 200 OK

### Endorsements

#### Endorse Skill

**Endpoint:** `POST /api/user/skills/:skillId/endorse`

**Headers:** Authorization required

**Request Body:**
```json
{
  "endorserId": "user-uuid"
}
```

**Response:** 201 Created

#### Get Skill Endorsements

**Endpoint:** `GET /api/user/skills/:skillId/endorsements`

**Response:** 200 OK - Array of endorsements

---

## GitHub-Inspired Features

### Issues

#### Create Issue

**Endpoint:** `POST /api/collaboration/issues`

**Headers:** Authorization required

**Request Body:**
```json
{
  "projectId": "project-uuid",
  "title": "Bug: Login button not working",
  "description": "The login button doesn't respond to clicks",
  "creatorId": "user-uuid",
  "assigneeId": "user-uuid",
  "labels": ["bug", "high-priority"],
  "milestone": "v1.0"
}
```

**Response:** 201 Created
```json
{
  "id": "issue-uuid",
  "projectId": "project-uuid",
  "title": "Bug: Login button not working",
  "description": "The login button doesn't respond to clicks",
  "creatorId": "user-uuid",
  "assigneeId": "user-uuid",
  "status": "open",
  "labels": ["bug", "high-priority"],
  "milestone": "v1.0",
  "comments": 0,
  "createdAt": "2026-02-08T10:00:00.000Z"
}
```

#### Get Issues

**Endpoint:** `GET /api/collaboration/issues`

**Query Parameters:**
- `projectId` - Filter by project
- `status` - Filter by status (open, in_progress, closed)
- `assigneeId` - Filter by assignee
- `label` - Filter by label

**Response:** 200 OK - Array of issues

#### Get Single Issue

**Endpoint:** `GET /api/collaboration/issues/:id`

**Response:** 200 OK - Issue with comments

#### Update Issue

**Endpoint:** `PUT /api/collaboration/issues/:id`

**Headers:** Authorization required

**Request Body:**
```json
{
  "status": "in_progress",
  "assigneeId": "user-uuid"
}
```

**Response:** 200 OK

#### Close Issue

**Endpoint:** `POST /api/collaboration/issues/:id/close`

**Headers:** Authorization required

**Response:** 200 OK

#### Add Comment to Issue

**Endpoint:** `POST /api/collaboration/issues/:issueId/comments`

**Headers:** Authorization required

**Request Body:**
```json
{
  "userId": "user-uuid",
  "content": "I'm working on this issue now."
}
```

**Response:** 201 Created

### Projects

#### Create Project

**Endpoint:** `POST /api/collaboration/projects`

**Headers:** Authorization required

**Request Body:**
```json
{
  "name": "Website Redesign",
  "description": "Redesign the company website",
  "ownerId": "user-uuid",
  "visibility": "private",
  "members": ["user-uuid-1", "user-uuid-2"]
}
```

**Response:** 201 Created

#### Get Projects

**Endpoint:** `GET /api/collaboration/projects`

**Query Parameters:**
- `ownerId` - Filter by owner
- `visibility` - Filter by visibility

**Response:** 200 OK - Array of projects

#### Get Single Project

Get project with all issues and tasks.

**Endpoint:** `GET /api/collaboration/projects/:id`

**Response:** 200 OK - Project with issues and tasks

#### Update Project

**Endpoint:** `PUT /api/collaboration/projects/:id`

**Headers:** Authorization required

**Response:** 200 OK

---

## E-commerce Enhanced Features

### Shopping Cart

#### Add to Cart

**Endpoint:** `POST /api/shop/cart`

**Headers:** Authorization required

**Request Body:**
```json
{
  "userId": "user-uuid",
  "productId": "product-uuid",
  "quantity": 2
}
```

**Response:** 201 Created
```json
{
  "id": "cart-item-uuid",
  "userId": "user-uuid",
  "productId": "product-uuid",
  "quantity": 2,
  "Product": {
    "id": "product-uuid",
    "name": "Laptop",
    "price": "999.99"
  },
  "createdAt": "2026-02-08T10:00:00.000Z"
}
```

#### Get Cart

**Endpoint:** `GET /api/shop/cart/:userId`

**Headers:** Authorization required

**Response:** 200 OK
```json
{
  "items": [
    {
      "id": "cart-item-uuid",
      "userId": "user-uuid",
      "productId": "product-uuid",
      "quantity": 2,
      "Product": {
        "id": "product-uuid",
        "name": "Laptop",
        "price": "999.99"
      }
    }
  ],
  "total": 1999.98,
  "count": 1
}
```

#### Update Cart Item

**Endpoint:** `PUT /api/shop/cart/:id`

**Headers:** Authorization required

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response:** 200 OK

#### Remove from Cart

**Endpoint:** `DELETE /api/shop/cart/:id`

**Headers:** Authorization required

**Response:** 200 OK

#### Clear Cart

**Endpoint:** `DELETE /api/shop/cart/user/:userId`

**Headers:** Authorization required

**Response:** 200 OK

### Product Reviews

#### Add Review

**Endpoint:** `POST /api/shop/products/:productId/reviews`

**Headers:** Authorization required

**Request Body:**
```json
{
  "userId": "user-uuid",
  "rating": 5,
  "title": "Excellent product!",
  "reviewText": "This laptop exceeded my expectations...",
  "verifiedPurchase": true
}
```

**Rating:** Integer from 1 to 5

**Response:** 201 Created
```json
{
  "id": "review-uuid",
  "productId": "product-uuid",
  "userId": "user-uuid",
  "rating": 5,
  "title": "Excellent product!",
  "reviewText": "This laptop exceeded my expectations...",
  "helpfulCount": 0,
  "verifiedPurchase": true,
  "createdAt": "2026-02-08T10:00:00.000Z"
}
```

#### Get Product Reviews

**Endpoint:** `GET /api/shop/products/:productId/reviews`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `sort` - Sort by: `recent`, `helpful`, `rating`

**Response:** 200 OK
```json
{
  "reviews": [
    {
      "id": "review-uuid",
      "productId": "product-uuid",
      "userId": "user-uuid",
      "rating": 5,
      "title": "Excellent product!",
      "reviewText": "This laptop exceeded my expectations...",
      "helpfulCount": 10,
      "verifiedPurchase": true,
      "createdAt": "2026-02-08T10:00:00.000Z"
    }
  ],
  "stats": {
    "averageRating": "4.5",
    "totalReviews": 42
  }
}
```

#### Mark Review as Helpful

**Endpoint:** `POST /api/shop/reviews/:id/helpful`

**Headers:** Authorization required

**Response:** 200 OK

### Wishlist

#### Add to Wishlist

**Endpoint:** `POST /api/shop/wishlist`

**Headers:** Authorization required

**Request Body:**
```json
{
  "userId": "user-uuid",
  "productId": "product-uuid"
}
```

**Response:** 201 Created

#### Get Wishlist

**Endpoint:** `GET /api/shop/wishlist/:userId`

**Headers:** Authorization required

**Response:** 200 OK - Array of wishlist items with products

#### Remove from Wishlist

**Endpoint:** `DELETE /api/shop/wishlist/:id`

**Headers:** Authorization required

**Response:** 200 OK

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "error": "Invalid input data"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Permission denied"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Notes

- All timestamps are in ISO 8601 format
- All UUIDs follow the UUID v4 format
- Pagination uses `page` and `limit` query parameters
- Authorization header format: `Bearer <token>`
- All POST/PUT requests require `Content-Type: application/json`

---

## Testing Examples

### Using cURL

**Add a reaction:**
```bash
curl -X POST http://localhost:8000/api/content/posts/POST_ID/reactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","type":"love"}'
```

**Search by hashtag:**
```bash
curl http://localhost:8000/api/content/hashtags/javascript/posts?page=1&limit=20
```

**Add to cart:**
```bash
curl -X POST http://localhost:8000/api/shop/cart \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","productId":"PRODUCT_ID","quantity":1}'
```

**Create server:**
```bash
curl -X POST http://localhost:8000/api/messaging/servers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Server","description":"A cool server","ownerId":"USER_ID"}'
```

---

**Document Version:** 1.0  
**Last Updated:** February 8, 2026  
**Status:** Complete

For the base API documentation, see [API.md](./API.md)
