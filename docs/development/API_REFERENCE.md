# API Reference

Complete REST and GraphQL API documentation for all Milonexa services.

## Base URL
```
Development: http://localhost:8000
Production: https://api.milonexa.com
```

## Authentication
```bash
Authorization: Bearer <jwt_token>
```

## User Service API

### Authentication
- `POST /api/user/auth/register` - Create account
- `POST /api/user/auth/login` - Login
- `POST /api/user/auth/refresh` - Refresh token
- `GET /api/user/auth/me` - Current user
- `POST /api/user/auth/logout` - Logout

### Profile
- `GET /api/user/profile/:userId` - Get user profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/settings` - Get settings
- `PUT /api/user/settings` - Update settings

### Social
- `GET /api/user/friends` - List friends
- `POST /api/user/friends/request/:userId` - Send friend request
- `PUT /api/user/friends/:friendId/accept` - Accept request
- `DELETE /api/user/friends/:friendId` - Remove friend

### Notifications
- `GET /api/user/notifications` - List notifications
- `PUT /api/user/notifications/mark-all-read` - Mark all read

## Content Service API

### Posts
- `GET /api/content/feed` - Get feed
- `GET /api/content/posts` - List posts
- `POST /api/content/posts` - Create post
- `GET /api/content/posts/:id` - Get post
- `PUT /api/content/posts/:id` - Update post
- `DELETE /api/content/posts/:id` - Delete post
- `POST /api/content/posts/:id/react` - React to post

### Comments
- `GET /api/content/posts/:id/comments` - List comments
- `POST /api/content/posts/:id/comments` - Create comment

### Groups
- `GET /api/content/groups` - List groups
- `POST /api/content/groups` - Create group
- `POST /api/content/groups/:id/join` - Join group

## Messaging Service API

### Conversations
- `GET /api/messaging/conversations` - List conversations
- `POST /api/messaging/conversations` - Create conversation
- `GET /api/messaging/conversations/:id/messages` - Get messages
- `POST /api/messaging/conversations/:id/messages` - Send message

### Servers
- `GET /api/messaging/servers` - List servers
- `GET /api/messaging/servers/:id/channels` - List channels
- `GET /api/messaging/channels/:id/messages` - Get channel messages

## Admin API (Port 8888)

### Users
- `GET /api/admin/users` - List users
- `GET /api/admin/users/:id` - Get user
- `PUT /api/admin/users/:id` - Update user
- `POST /api/admin/users/:id/ban` - Ban user
- `POST /api/admin/users/:id/unban` - Unban user

### Content
- `GET /api/admin/content` - Moderation queue
- `DELETE /api/admin/content/:id` - Delete content
- `POST /api/admin/content/:id/flag` - Flag content

### Alerts
- `GET /api/admin/alerts` - List alerts
- `PUT /api/admin/alerts/:id/acknowledge` - Acknowledge alert

### Feature Flags
- `GET /api/admin/features` - List flags
- `PUT /api/admin/features/:name` - Update flag

## GraphQL API

Endpoint: `POST /graphql` or `GET /graphql` (UI)

### Example Query
```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    username
    email
    displayName
    followers {
      totalCount
    }
    posts {
      totalCount
      edges {
        node {
          id
          title
          createdAt
        }
      }
    }
  }
}
```

## Error Handling

All APIs return consistent error format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "email": "Invalid email format"
    }
  }
}
```

Common status codes:
- 200: Success
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 429: Rate limited
- 500: Server error

## Rate Limiting

Default limits:
- 100 requests per 15 minutes per IP
- Adjust in RATE_LIMIT_* env vars

Response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702667400
```

## Documentation

- Swagger UI: http://localhost:8000/api-docs
- GraphQL Playground: http://localhost:8000/graphql
- Postman Collection: Available in repo

---
Last Updated: 2024
