# Architecture Overview

## System Architecture

Let's Connect is built on a **modular microservices architecture** designed for scalability, maintainability, and self-hosted deployment.

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│                     http://localhost:3000                    │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/WebSocket
┌───────────────────────▼─────────────────────────────────────┐
│                    API Gateway (Express)                     │
│    Authentication, Routing, Rate Limiting, Security          │
│                     http://localhost:8000                    │
└──┬──────┬────────┬────────┬────────┬────────┬────────┬──────┘
   │      │        │        │        │        │        │
   ▼      ▼        ▼        ▼        ▼        ▼        ▼
┌──────┬────────┬────────┬────────┬────────┬────────┬────────┐
│ User │Content │Message │Collab  │ Media  │ Shop   │   AI   │
│      │        │        │        │        │        │        │
│:8001 │ :8002  │ :8003  │ :8004  │ :8005  │ :8006  │ :8007  │
└──┬───┴────┬───┴────┬───┴────┬───┴────┬───┴────┬───┴────┬───┘
   │        │        │        │        │        │        │
   └────────┴────────┴────────┴────────┴────────┴────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
      ┌──────────┐    ┌─────────┐    ┌──────────┐
      │PostgreSQL│    │  Redis  │    │  MinIO   │
      │   :5432  │    │  :6379  │    │  :9000   │
      └──────────┘    └─────────┘    └──────────┘
```

## Core Components

### 1. API Gateway (Port 8000)

**Responsibilities:**
- Request routing to appropriate microservices
- JWT authentication and authorization
- Rate limiting (100 req/15min per IP)
- CORS and security headers
- WebSocket proxy for real-time features

**Technology:**
- Node.js + Express
- http-proxy-middleware
- jsonwebtoken
- helmet.js
- express-rate-limit

**Public Routes (No Auth):**
- `/api/content/public/*` - Public posts and videos
- `/api/media/public/*` - Public media files
- `/api/shop/public/*` - Product browsing
- `/api/collaboration/public/*` - Public docs and wiki
- `/api/user/register` - User registration
- `/api/user/login` - User login

### 2. User Service (Port 8001)

**Responsibilities:**
- User registration and authentication
- Profile management
- User search
- Role-based access control (user, moderator, admin)

**Database Schema:**
- Users table: id, username, email, password (hashed), firstName, lastName, bio, avatar, role
- Profiles table: userId, phoneNumber, location, website, company, skills, interests

**Technology:**
- Node.js + Express
- PostgreSQL + Sequelize ORM
- bcryptjs for password hashing
- Joi for validation

### 3. Content Service (Port 8002)

**Responsibilities:**
- Post creation and management
- Feed generation
- Video metadata management
- Comments and engagement (likes, shares)

**Database Schema:**
- Posts: id, userId, content, type, mediaUrls, likes, comments, shares, visibility
- Comments: id, postId, userId, content, parentId (for nested comments)
- Videos: id, userId, title, description, videoUrl, thumbnailUrl, duration, views, likes

**Features:**
- Public posts visible without authentication
- Private/friends-only posts with visibility control
- Comment threading support
- Engagement tracking (likes, comments, shares)

**Technology:**
- Node.js + Express
- PostgreSQL + Sequelize
- Redis for caching popular posts

### 4. Messaging Service (Port 8003)

**Responsibilities:**
- Real-time chat messaging
- Conversation management (direct, group, channel)
- Typing indicators
- Message history
- WebSocket connections

**Database Schema:**
- Conversations: id, name, type, participants, lastMessage, lastMessageAt
- Messages: id, conversationId, senderId, content, type, attachments, isRead

**Real-time Features:**
- Socket.IO for WebSocket connections
- Redis pub/sub for horizontal scaling
- Room-based message broadcasting
- Typing indicators and presence

**Technology:**
- Node.js + Express + Socket.IO
- PostgreSQL for message persistence
- Redis for pub/sub and real-time state

### 5. Collaboration Service (Port 8004)

**Responsibilities:**
- Document creation and editing
- Wiki page management
- Task/Kanban board management
- Version control for documents
- Collaborative editing support

**Database Schema:**
- Documents: id, title, content, ownerId, type, visibility, collaborators, tags, version
- Wiki: id, title, slug, content, ownerId, parentId, visibility, contributors
- Tasks: id, title, description, assigneeId, status, priority, dueDate, projectId

**Features:**
- Public wiki pages without authentication
- Private documents with collaborator management
- Version tracking
- Kanban-style task management

**Technology:**
- Node.js + Express
- PostgreSQL + Sequelize

### 6. Media Service (Port 8005)

**Responsibilities:**
- File upload and storage
- Media serving
- S3-compatible object storage
- File metadata management
- Public/private file access control

**Database Schema:**
- MediaFiles: id, userId, filename, originalName, mimeType, size, url, type, visibility

**Storage:**
- MinIO (S3-compatible) for object storage
- Supports images, videos, audio, documents
- Automatic file type detection
- Public/private access control

**Technology:**
- Node.js + Express
- Multer for file uploads
- AWS SDK (S3) compatible with MinIO
- PostgreSQL for metadata

### 7. Shop Service (Port 8006)

**Responsibilities:**
- Product listing and management
- Order processing
- Inventory management
- Public product browsing
- Payment integration ready

**Database Schema:**
- Products: id, sellerId, name, description, price, currency, images, category, stock
- Orders: id, buyerId, sellerId, productId, quantity, totalAmount, status, shippingAddress, paymentStatus

**Features:**
- Public product browsing without authentication
- Search and filter products
- Inventory tracking
- Order status management
- Multi-seller support

**Technology:**
- Node.js + Express
- PostgreSQL + Sequelize

### 8. AI Service (Port 8007)

**Responsibilities:**
- AI-powered chat assistant
- Content summarization
- Content moderation
- Search suggestions
- Smart features

**Features:**
- Gemini 2.5 Flash integration
- Response caching in Redis
- Content moderation for safety
- Context-aware suggestions

**Technology:**
- Node.js + Express
- Gemini API (Google Generative AI)
- Redis for caching responses

## Data Layer

### PostgreSQL (Port 5432)

**Multiple Databases:**
- users - User accounts and profiles
- content - Posts, comments, videos
- messages - Conversations and messages
- collaboration - Documents, wiki, tasks
- media - File metadata
- shop - Products and orders

**Features:**
- Separate databases per service
- Sequelize ORM for schema management
- Automatic migrations
- Indexed queries for performance

### Redis (Port 6379)

**Use Cases:**
- Caching frequently accessed data
- Real-time pub/sub for messaging
- Session storage
- Rate limiting counters
- AI response caching

### MinIO (Port 9000)

**Object Storage:**
- S3-compatible API
- Public and private buckets
- Image, video, and file storage
- Scalable storage solution
- Self-hosted alternative to AWS S3

## Security Architecture

### Authentication Flow

```
1. User → POST /api/user/login → User Service
2. User Service validates credentials
3. User Service generates JWT token
4. Token returned to user
5. User includes token in Authorization header
6. API Gateway validates token on each request
7. Request forwarded to appropriate service
```

### JWT Token Structure

```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "role": "user",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Security Features

1. **JWT Authentication**
   - Stateless authentication
   - 7-day token expiration
   - Secure token signing with secret key

2. **Password Security**
   - bcrypt hashing (10 rounds)
   - No plain-text password storage
   - Password strength validation

3. **Rate Limiting**
   - 100 requests per 15 minutes per IP
   - Prevents brute force attacks
   - DDoS protection

4. **CORS & Headers**
   - Helmet.js for security headers
   - Configured CORS policies
   - XSS protection

5. **Content Moderation**
   - AI-powered content checking
   - Automatic flagging of inappropriate content
   - Admin moderation tools

6. **Role-Based Access Control**
   - User roles: user, moderator, admin
   - Permission-based feature access
   - Admin-only endpoints

## Scalability Considerations

### Horizontal Scaling

Each microservice can be scaled independently:

```bash
docker-compose up --scale content-service=3 --scale messaging-service=2
```

### Load Balancing

- Nginx or HAProxy for load balancing
- Round-robin distribution
- Health check endpoints on all services

### Database Scaling

- PostgreSQL read replicas
- Database connection pooling
- Query optimization and indexing

### Caching Strategy

- Redis for frequently accessed data
- Cache invalidation on updates
- TTL-based cache expiration

### Real-time Scaling

- Redis pub/sub for cross-instance messaging
- WebSocket sticky sessions
- Horizontal messaging service scaling

## Deployment Architecture

### Docker Compose

All services containerized and orchestrated with Docker Compose:
- Single-command deployment
- Service isolation
- Easy scaling
- Volume management for data persistence

### Network Architecture

Internal Docker network:
- Services communicate via service names
- No external exposure except gateway and frontend
- Secure inter-service communication

### Data Persistence

Docker volumes:
- postgres-data: Database files
- redis-data: Redis persistence
- minio-data: Object storage files

## Monitoring & Logging

### Health Checks

All services expose `/health` endpoint:

```bash
curl http://localhost:8001/health
# {"status":"healthy","service":"user-service"}
```

### Logging

- Console logging for development
- Structured logging recommended for production
- Centralized log aggregation (ELK stack compatible)

### Monitoring

Recommended tools:
- Prometheus for metrics
- Grafana for dashboards
- Docker stats for resource monitoring

## Future Enhancements

### Phase 1 (Current Implementation)
✅ Microservices architecture
✅ User authentication
✅ Content management
✅ Real-time messaging
✅ File storage
✅ E-commerce
✅ AI integration

### Phase 2 (Planned)
- WebRTC for voice/video calls
- Mobile apps (React Native)
- Advanced analytics
- Email notifications
- Push notifications
- Admin dashboard

### Phase 3 (Future)
- Kubernetes deployment
- Service mesh (Istio)
- Advanced caching (Varnish)
- CDN integration
- Global load balancing
- Multi-region deployment

## Best Practices

1. **Service Independence**
   - Each service has its own database
   - No direct service-to-service calls
   - Communication through API Gateway

2. **Data Consistency**
   - Event-driven updates when needed
   - Eventually consistent where appropriate
   - Transactional integrity within services

3. **Error Handling**
   - Graceful degradation
   - Retry logic for transient failures
   - Circuit breakers for failing services

4. **Security**
   - Principle of least privilege
   - Regular security updates
   - Audit logging for sensitive operations

5. **Performance**
   - Database query optimization
   - Caching strategy
   - Lazy loading and pagination
   - CDN for static assets
