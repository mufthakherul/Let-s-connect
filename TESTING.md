# Testing Guide

Quick guide to test all features of Let's Connect platform.

## Prerequisites

Platform must be running:
```bash
docker-compose up -d
```

## Test Plan

### 1. Health Checks

Verify all services are running:

```bash
# API Gateway
curl http://localhost:8000/health
# Expected: {"status":"healthy","timestamp":"..."}

# User Service
curl http://localhost:8001/health
# Expected: {"status":"healthy","service":"user-service"}

# Content Service
curl http://localhost:8002/health

# Messaging Service
curl http://localhost:8003/health

# Collaboration Service
curl http://localhost:8004/health

# Media Service
curl http://localhost:8005/health

# Shop Service
curl http://localhost:8006/health

# AI Service
curl http://localhost:8007/health
```

### 2. User Registration & Login

**Test User Registration:**

```bash
curl -X POST http://localhost:8000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser1",
    "email": "test1@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

Expected response:
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-here",
    "username": "testuser1",
    "email": "test1@example.com",
    "firstName": "Test",
    "lastName": "User"
  }
}
```

Save the token and user ID for subsequent tests!

**Test User Login:**

```bash
curl -X POST http://localhost:8000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test1@example.com",
    "password": "password123"
  }'
```

### 3. Public Access Features (No Auth)

**Browse Public Videos:**

```bash
curl http://localhost:8000/api/content/public/videos
# Expected: [] (empty array if no videos yet)
```

**Browse Public Products:**

```bash
curl http://localhost:8000/api/shop/public/products
# Expected: [] (empty array if no products yet)
```

**Browse Public Documents:**

```bash
curl http://localhost:8000/api/collaboration/public/docs
# Expected: [] (empty array if no docs yet)
```

**Browse Public Wiki:**

```bash
curl http://localhost:8000/api/collaboration/public/wiki
# Expected: [] (empty array if no wiki pages yet)
```

### 4. Content Creation (Authenticated)

Replace `YOUR_TOKEN` and `YOUR_USER_ID` with actual values from registration.

**Create a Post:**

```bash
curl -X POST http://localhost:8000/api/content/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "YOUR_USER_ID",
    "content": "Hello from Let'\''s Connect! This is my first post.",
    "type": "text",
    "visibility": "public"
  }'
```

**Create a Video:**

```bash
curl -X POST http://localhost:8000/api/content/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "YOUR_USER_ID",
    "title": "My First Video",
    "description": "This is a test video",
    "videoUrl": "https://example.com/video.mp4",
    "thumbnailUrl": "https://example.com/thumb.jpg",
    "duration": 180,
    "visibility": "public"
  }'
```

**Get Your Feed:**

```bash
curl http://localhost:8000/api/content/feed/YOUR_USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Messaging (Authenticated)

**Create a Conversation:**

```bash
curl -X POST http://localhost:8000/api/messaging/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Chat",
    "type": "direct",
    "participants": ["YOUR_USER_ID"]
  }'
```

Save the conversation ID!

**Get Conversations:**

```bash
curl http://localhost:8000/api/messaging/conversations/YOUR_USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Collaboration (Authenticated)

**Create a Document:**

```bash
curl -X POST http://localhost:8000/api/collaboration/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "My First Document",
    "content": "This is the document content",
    "ownerId": "YOUR_USER_ID",
    "type": "doc",
    "visibility": "public",
    "tags": ["test", "demo"]
  }'
```

**Create a Wiki Page:**

```bash
curl -X POST http://localhost:8000/api/collaboration/wiki \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Getting Started",
    "slug": "getting-started",
    "content": "# Getting Started\n\nWelcome to the wiki!",
    "ownerId": "YOUR_USER_ID",
    "visibility": "public"
  }'
```

**Create a Task:**

```bash
curl -X POST http://localhost:8000/api/collaboration/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Task",
    "description": "This is a test task",
    "assigneeId": "YOUR_USER_ID",
    "status": "todo",
    "priority": "high"
  }'
```

### 7. E-commerce (Authenticated)

**Create a Product:**

```bash
curl -X POST http://localhost:8000/api/shop/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sellerId": "YOUR_USER_ID",
    "name": "Test Product",
    "description": "This is a test product",
    "price": "29.99",
    "currency": "USD",
    "category": "electronics",
    "stock": 100,
    "isPublic": true
  }'
```

**Browse Products (Public):**

```bash
curl http://localhost:8000/api/shop/public/products
# Should now show your product
```

**Place an Order:**

```bash
curl -X POST http://localhost:8000/api/shop/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "buyerId": "YOUR_USER_ID",
    "productId": "PRODUCT_ID_FROM_ABOVE",
    "quantity": 1,
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "USA"
    },
    "paymentMethod": "credit_card"
  }'
```

### 8. AI Features (Authenticated)

**Note:** Requires GEMINI_API_KEY in .env

**Chat with AI:**

```bash
curl -X POST http://localhost:8000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello! What is Let'\''s Connect?"}
    ],
    "userId": "YOUR_USER_ID"
  }'
```

**Summarize Text:**

```bash
curl -X POST http://localhost:8000/api/ai/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "Let'\''s Connect is a unified social collaboration platform..."
  }'
```

### 9. Frontend Testing

Open browser and go to: http://localhost:3000

**Test Registration:**
1. Click "Register"
2. Fill form:
   - Username: webuser1
   - Email: web1@example.com
   - Password: password123
   - First Name: Web
   - Last Name: User
3. Click "Register"
4. Should redirect to Feed

**Test Public Access:**
1. Logout (if logged in)
2. Click "Videos" - Should show videos
3. Click "Shop" - Should show products
4. Click "Docs" - Should show documents
5. No login required!

**Test Private Features:**
1. Login with credentials
2. Create a post in Feed
3. Go to Chat - View conversations
4. Go to Profile - Update profile
5. Should all work!

### 10. Real-time Chat Testing

**Using Browser Console:**

```javascript
// Open http://localhost:3000/chat
// Open Browser DevTools (F12)
// Check Network tab for WebSocket connection
// Should see: ws://localhost:8003

// Send messages and verify real-time delivery
```

## Verification Checklist

### Services Running
- [ ] All 8 services respond to /health
- [ ] PostgreSQL accessible
- [ ] Redis accessible
- [ ] MinIO accessible

### Public Access
- [ ] Can browse videos without login
- [ ] Can browse shop without login
- [ ] Can view docs without login
- [ ] Can view wiki without login

### Authentication
- [ ] User registration works
- [ ] User login works
- [ ] JWT token received
- [ ] Token validates correctly

### Content
- [ ] Can create posts
- [ ] Can create videos
- [ ] Can view feed
- [ ] Can add comments

### Messaging
- [ ] Can create conversations
- [ ] Can view conversations
- [ ] WebSocket connects
- [ ] Messages delivered in real-time

### Collaboration
- [ ] Can create documents
- [ ] Can create wiki pages
- [ ] Can create tasks
- [ ] Can view public content

### E-commerce
- [ ] Can create products
- [ ] Can browse products publicly
- [ ] Can place orders
- [ ] Stock updates correctly

### AI Features
- [ ] AI chat responds (if API key set)
- [ ] Text summarization works
- [ ] Content moderation works

### Frontend
- [ ] Homepage loads
- [ ] Registration form works
- [ ] Login form works
- [ ] Public pages accessible
- [ ] Private pages require auth
- [ ] All components render

## Performance Testing

**Load Testing (Optional):**

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test API Gateway
ab -n 1000 -c 10 http://localhost:8000/health

# Test public endpoints
ab -n 1000 -c 10 http://localhost:8000/api/content/public/posts
```

## Troubleshooting Tests

### Common Issues

**401 Unauthorized:**
- Check token is valid
- Check Authorization header format: "Bearer TOKEN"
- Token may have expired (7-day expiration)

**Service not responding:**
```bash
# Check service status
docker-compose ps

# Check service logs
docker-compose logs [service-name]

# Restart service
docker-compose restart [service-name]
```

**Database errors:**
```bash
# Check PostgreSQL
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

**Empty responses:**
- This is normal for fresh installation
- Create test data first
- Then verify it appears in queries

## Automated Testing Script

Save as `test.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:8000"

echo "Testing Let's Connect Platform..."

# Test health
echo "1. Testing health endpoints..."
curl -s $API_URL/health | jq

# Register user
echo "2. Registering user..."
RESPONSE=$(curl -s -X POST $API_URL/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }')

TOKEN=$(echo $RESPONSE | jq -r '.token')
USER_ID=$(echo $RESPONSE | jq -r '.user.id')

echo "Token: $TOKEN"
echo "User ID: $USER_ID"

# Create post
echo "3. Creating post..."
curl -s -X POST $API_URL/api/content/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"content\": \"Test post\",
    \"type\": \"text\",
    \"visibility\": \"public\"
  }" | jq

# Get public posts
echo "4. Getting public posts..."
curl -s $API_URL/api/content/public/posts | jq

echo "Tests complete!"
```

Run with:
```bash
chmod +x test.sh
./test.sh
```

## Success Criteria

✅ All services return healthy status
✅ User registration creates account
✅ User login returns valid token
✅ Public endpoints accessible without auth
✅ Private endpoints require valid token
✅ Content can be created and retrieved
✅ Real-time messaging connects via WebSocket
✅ Frontend loads and functions correctly
✅ All CRUD operations work as expected

---

**Note:** For production testing, replace localhost with your actual domain and use HTTPS.
