# GraphQL Documentation

This document describes the GraphQL API available via the Milonexa API gateway.

---

## Table of Contents

1. [Endpoint](#1-endpoint)
2. [Implementation Details](#2-implementation-details)
3. [Authentication](#3-authentication)
4. [Schema Overview](#4-schema-overview)
5. [Example Queries](#5-example-queries)
6. [Example Mutations](#6-example-mutations)
7. [GraphQL Playground](#7-graphql-playground)
8. [Rate Limiting](#8-rate-limiting)
9. [Error Format](#9-error-format)
10. [Development Tips](#10-development-tips)

---

## 1. Endpoint

| Method | URL | Description |
|---|---|---|
| `POST` | `http://localhost:8000/graphql` | Execute GraphQL operations |
| `GET` | `http://localhost:8000/graphql` | Open GraphQL IDE in browser |

**Production:**

| Method | URL |
|---|---|
| `POST` | `https://api.milonexa.com/graphql` |
| `GET` | `https://api.milonexa.com/graphql` (IDE) |

---

## 2. Implementation Details

### Library

The GraphQL server uses **`graphql-http`** (`createHandler`) — NOT the deprecated `express-graphql`. This is important because `graphql-http` follows the GraphQL-over-HTTP specification and does not expose a `/graphql` GET route with a built-in GraphiQL IDE by default (a separate IDE is served instead).

```js
// api-gateway/src/graphql/index.js
const { createHandler } = require('graphql-http/lib/use/express');
const { schema } = require('./schema');

const graphqlHandler = createHandler({
  schema,
  context: (req) => ({
    user: req.raw.user,          // Populated by JWT middleware
    headers: req.raw.headers,    // Access to all headers
  }),
});

// Mounted in Express
app.use('/graphql', graphqlHandler);
```

### Context

The GraphQL context provides:

```js
{
  user: {
    userId: 'uuid',      // From JWT payload (if authenticated)
    email: 'user@...',
    role: 'user',
  },
  headers: { ... }
}
```

Access context in resolvers:

```js
const resolvers = {
  Query: {
    me: (parent, args, context) => {
      if (!context.user) throw new GraphQLError('Unauthorized', {
        extensions: { code: 'UNAUTHORIZED' }
      });
      return UserService.findById(context.user.userId);
    },
  },
};
```

---

## 3. Authentication

GraphQL requests use the same JWT authentication as REST endpoints.

### Authenticated Request

```bash
curl -X POST http://localhost:8000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{"query": "{ me { id email username } }"}'
```

### Unauthenticated Request

Public queries (e.g. viewing public posts) work without a token:

```bash
curl -X POST http://localhost:8000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ post(id: \"uuid\") { id content author { username } } }"}'
```

### Token Format

The `Authorization` header must use the `Bearer` scheme:

```
Authorization: Bearer <accessToken>
```

The API gateway's JWT middleware validates the token and populates `req.user` before the request reaches the GraphQL handler.

---

## 4. Schema Overview

### Types

```graphql
type User {
  id: ID!
  email: String!
  username: String!
  role: String!
  profile: Profile
  posts: [Post!]!
  isEmailVerified: Boolean!
  createdAt: String!
}

type Profile {
  id: ID!
  fullName: String
  bio: String
  avatarUrl: String
  coverUrl: String
  location: String
  website: String
}

type Post {
  id: ID!
  content: String!
  author: User!
  mediaUrls: [String!]!
  visibility: String!
  reactionCounts: JSON
  commentCount: Int!
  isFlagged: Boolean!
  toxicityScore: Float
  createdAt: String!
  updatedAt: String!
}

type Comment {
  id: ID!
  content: String!
  author: User!
  post: Post!
  parentId: ID
  replies: [Comment!]!
  createdAt: String!
}

type Conversation {
  id: ID!
  type: String!
  name: String
  participants: [User!]!
  lastMessageAt: String
  messages(limit: Int, before: ID): [Message!]!
}

type Message {
  id: ID!
  content: String!
  sender: User!
  contentType: String!
  reactions: JSON
  replyTo: Message
  isDeleted: Boolean!
  createdAt: String!
}

type Product {
  id: ID!
  name: String!
  description: String!
  price: Float!
  stock: Int!
  category: String!
  images: [String!]!
  rating: Float
  reviewCount: Int!
}

scalar JSON
scalar Upload
```

### Queries

```graphql
type Query {
  # User
  me: User
  user(id: ID!): User
  users(search: String, limit: Int, offset: Int): [User!]!
  friends(userId: ID): [User!]!

  # Content
  post(id: ID!): Post
  posts(authorId: ID, groupId: ID, limit: Int, offset: Int): [Post!]!
  feed(limit: Int, offset: Int): [Post!]!
  comments(postId: ID!, parentId: ID, limit: Int): [Comment!]!

  # Messaging
  conversations(limit: Int, offset: Int): [Conversation!]!
  conversation(id: ID!): Conversation
  messages(conversationId: ID!, limit: Int, before: ID): [Message!]!

  # Shop
  products(category: String, search: String, limit: Int, offset: Int): [Product!]!
  product(id: ID!): Product

  # Health
  health: HealthStatus!
}
```

### Mutations

```graphql
type Mutation {
  # Auth
  login(email: String!, password: String!): AuthPayload!
  register(email: String!, password: String!, username: String!): AuthPayload!
  refreshToken(refreshToken: String!): AuthPayload!
  logout: Boolean!

  # User
  updateProfile(input: ProfileInput!): Profile!
  changePassword(currentPassword: String!, newPassword: String!): Boolean!

  # Content
  createPost(content: String!, visibility: String, mediaUrls: [String!]): Post!
  updatePost(id: ID!, content: String, visibility: String): Post!
  deletePost(id: ID!): Boolean!
  addReaction(postId: ID!, reactionType: String!): Post!

  # Comments
  createComment(postId: ID!, content: String!, parentId: ID): Comment!
  deleteComment(id: ID!): Boolean!

  # Messaging
  sendMessage(conversationId: ID!, content: String!, contentType: String): Message!
  createConversation(participantIds: [ID!]!): Conversation!

  # Shop
  addToCart(productId: ID!, quantity: Int!): Cart!
  createOrder(cartId: ID!): Order!
}
```

---

## 5. Example Queries

### Get current user profile

```graphql
query Me {
  me {
    id
    email
    username
    role
    profile {
      fullName
      bio
      avatarUrl
      location
    }
    isEmailVerified
    createdAt
  }
}
```

### Get home feed

```graphql
query Feed($limit: Int, $offset: Int) {
  feed(limit: $limit, offset: $offset) {
    id
    content
    mediaUrls
    visibility
    reactionCounts
    commentCount
    createdAt
    author {
      id
      username
      profile {
        avatarUrl
        fullName
      }
    }
  }
}
```

Variables:

```json
{
  "limit": 20,
  "offset": 0
}
```

### Get a conversation with messages

```graphql
query Conversation($id: ID!, $messageLimit: Int) {
  conversation(id: $id) {
    id
    type
    name
    participants {
      id
      username
      profile { avatarUrl }
    }
    messages(limit: $messageLimit) {
      id
      content
      contentType
      createdAt
      sender {
        id
        username
      }
      replyTo {
        id
        content
      }
    }
  }
}
```

### Search products

```graphql
query Products($search: String, $category: String) {
  products(search: $search, category: $category, limit: 20) {
    id
    name
    description
    price
    stock
    images
    rating
    reviewCount
  }
}
```

---

## 6. Example Mutations

### Create a post

```graphql
mutation CreatePost($content: String!, $visibility: String) {
  createPost(content: $content, visibility: $visibility) {
    id
    content
    visibility
    createdAt
    author {
      id
      username
    }
  }
}
```

Variables:

```json
{
  "content": "Hello, Milonexa! 🎉",
  "visibility": "public"
}
```

### Send a message

```graphql
mutation SendMessage($conversationId: ID!, $content: String!) {
  sendMessage(conversationId: $conversationId, content: $content) {
    id
    content
    contentType
    createdAt
    sender {
      id
      username
    }
  }
}
```

### Login

```graphql
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    accessToken
    refreshToken
    user {
      id
      email
      username
      role
    }
  }
}
```

---

## 7. GraphQL Playground

Open a browser and navigate to:

```
http://localhost:8000/graphql
```

A GET request to `/graphql` serves the **GraphiQL** IDE (or compatible GraphQL playground), allowing you to:
- Browse the schema interactively
- Write and execute queries and mutations
- View documentation for all types and fields
- Set request headers (including `Authorization: Bearer <token>`)

### Setting Authentication in the Playground

In GraphiQL, click **"Headers"** tab and add:

```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 8. Rate Limiting

The GraphQL endpoint is subject to the same rate limiting as all other API gateway routes:

- **Default:** 100 requests per minute per IP
- **Authenticated:** Same rate, keyed per user ID

Additionally, consider implementing **query complexity limiting** to prevent expensive nested queries:

```js
const { createComplexityLimitRule } = require('graphql-validation-complexity');

const validationRules = [
  createComplexityLimitRule(1000, {
    onCost: (cost) => logger.debug('Query cost', { cost }),
    formatErrorMessage: (cost) =>
      `Query complexity ${cost} exceeds maximum allowed complexity of 1000`,
  }),
];
```

---

## 9. Error Format

GraphQL errors follow the GraphQL specification:

```json
{
  "errors": [
    {
      "message": "User not found",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["user"],
      "extensions": {
        "code": "USER_NOT_FOUND",
        "status": 404
      }
    }
  ],
  "data": null
}
```

### Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | No or invalid authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Requested resource not found |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

---

## 10. Development Tips

### Introspection Query

Fetch the full schema programmatically:

```graphql
{
  __schema {
    types {
      name
      kind
      description
      fields {
        name
        type { name kind }
        description
      }
    }
  }
}
```

### Using with curl

```bash
# Simple query
curl -s -X POST http://localhost:8000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query":"{ me { id email username } }"}' | jq .

# With variables
curl -s -X POST http://localhost:8000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "query Feed($limit: Int) { feed(limit: $limit) { id content } }",
    "variables": { "limit": 5 }
  }' | jq .
```

### VS Code GraphQL Extension

Install the `GraphQL.vscode-graphql` extension and create a `graphql.config.yml`:

```yaml
schema: http://localhost:8000/graphql
documents: src/**/*.graphql
```

This enables syntax highlighting, autocompletion, and schema validation in `.graphql` files.
