# Let's Connect - Unified Social Collaboration Platform

## Overview

Let's Connect is a unified social collaboration platform that combines the best features of Facebook, X (Twitter), YouTube, WhatsApp, Telegram, Discord, and Notion into one comprehensive application.

## Features

### Public Access (No Signup Required)
- **Video Watching**: Browse and watch public videos
- **Documentation**: Read public docs and wiki pages
- **Shop Browsing**: Browse products and view details

### Private Access (Authentication Required)
- **Social Feed**: Create and view posts, images, and updates
- **Real-time Messaging**: Chat with individuals and groups
- **Voice/Video Calls**: Conduct voice and video calls (WebRTC support)
- **Collaboration**: Create and edit documents, wikis, and manage tasks
- **File Sharing**: Upload and share files with others
- **Orders**: Purchase products and track orders
- **AI Assistant**: Get help from AI-powered features

## Architecture

### Microservices

The platform is built using a modular microservices architecture:

1. **API Gateway** (Port 8000) - Routes requests, JWT auth, rate limiting
2. **User Service** (Port 8001) - Authentication and profile management
3. **Content Service** (Port 8002) - Posts, feeds, and videos
4. **Messaging Service** (Port 8003) - Real-time chat with WebSocket
5. **Collaboration Service** (Port 8004) - Documents, wikis, and tasks
6. **Media Service** (Port 8005) - File uploads and S3 storage
7. **Shop Service** (Port 8006) - Products and orders
8. **AI Service** (Port 8007) - AI-powered features

### Technology Stack

**Backend:** Node.js, Express, PostgreSQL, Redis, MinIO, Socket.IO
**Frontend:** React 18, Material-UI, React Router, Axios
**Infrastructure:** Docker, Docker Compose, Nginx

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Git

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/mufthakherul/Let-s-connect.git
cd Let-s-connect
\`\`\`

2. Create environment file:
\`\`\`bash
cp .env.example .env
\`\`\`

3. Edit \`.env\` and configure your settings

4. Build and start services:
\`\`\`bash
docker-compose up --build
\`\`\`

5. Access the application:
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:8000
   - MinIO Console: http://localhost:9001

## Security Features

- JWT Authentication
- Role-Based Access Control
- Rate Limiting
- Password Hashing (bcrypt)
- Content Moderation (AI-powered)
- Encrypted Storage

## API Documentation

See full API documentation in docs/API.md

## License

MIT License
