# Let's Connect - Unified Social Collaboration Platform

A comprehensive social collaboration platform combining features from Facebook, X (Twitter), YouTube, WhatsApp, Telegram, Discord, and Notion into one self-hosted application.

## ✨ What's New in v1.1

### 🎨 Modern UI/UX
- **Dark Mode** - System-wide dark mode with persistent preference
- **Infinite Scroll** - Smooth feed loading with lazy loading
- **Responsive Design** - Mobile-friendly drawer navigation
- **Toast Notifications** - Real-time feedback with elegant toasts
- **Loading Skeletons** - Better loading states
- **Professional Design** - Modern card layouts with hover effects

### 🚀 New Features
- **Groups** - Facebook-style groups with privacy settings (public, private, secret)
- **Bookmarks** - Save posts, videos, and content for later (Twitter/X-style)
- **Threads & Retweets UI** - Full Twitter/X-style thread and quote flow
- **Awards UI** - Reddit-style awards on posts
- **Channel Feed & Playlists UI** - YouTube-style channel browsing and playlists
- **Server Discovery UI** - Discord-style public server discovery
- **Project Board & Milestones UI** - GitHub-style boards with card movement
- **In-app Notifications** - Notification center with unread badges
- **Enhanced Feed** - Post interactions, visibility controls, media support
- **Gradient Hero** - Beautiful landing page with feature highlights

### 🛠️ Technical Upgrades
- **React 18.3** - Latest React with concurrent features
- **Zustand** - Lightweight state management
- **React Query** - Efficient data fetching and caching
- **React Intersection Observer** - Infinite scroll implementation
- **Date-fns** - Modern date formatting
- **Enhanced Theming** - Custom Material-UI theme with better colors

## 🚀 Features

### Public Access (No Signup Required)
- 📺 **Video Platform** - Watch public videos like YouTube with channels
- 📖 **Documentation** - Read public docs and wiki pages
- 🛒 **Shop** - Browse products and marketplace with reviews

### Private Access (Authentication Required)
- 📱 **Social Feed** - Posts, images, hashtags, reactions, threads, retweets, awards
- 👥 **Groups** - Create and join groups with privacy controls (NEW)
- 🔖 **Bookmarks** - Save and organize content (NEW)
- 💬 **Real-time Chat** - Instant messaging with Discord-style servers, roles, and discovery
- 📞 **Voice/Video** - Calls and conferences (WebRTC ready)
- 📝 **Collaboration** - Documents, wikis, issues, projects, milestones, boards
- 📁 **File Sharing** - Upload and share files with S3-compatible storage
- 🛍️ **E-commerce** - Shopping cart, reviews, wishlist, and order tracking
- 🤖 **AI Assistant** - Smart features powered by OpenAI
- 🎯 **Communities** - Reddit-style communities with voting
- 💡 **Skills** - LinkedIn-style skills and endorsements
- 📊 **Projects** - GitHub-style project management
- 🔔 **Notifications** - In-app notification center (NEW)

## 🏗️ Architecture

Built with **modular microservices** for scalability and maintainability:

- **API Gateway** - Request routing, authentication, rate limiting
- **User Service** - Authentication and profile management
- **Content Service** - Posts, feeds, videos, groups, and bookmarks
- **Messaging Service** - Real-time chat with Socket.IO
- **Collaboration Service** - Docs, wiki, and task management
- **Media Service** - File storage with MinIO (S3-compatible)
- **Shop Service** - E-commerce and order management
- **AI Service** - OpenAI integration for smart features

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18, Express.js
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Storage**: MinIO (S3-compatible)
- **Real-time**: Socket.IO
- **Security**: JWT auth, bcrypt, Helmet.js, rate limiting

### Frontend
- **Framework**: React 18.3 (latest)
- **UI Library**: Material-UI v5
- **State Management**: Zustand
- **Data Fetching**: React Query (@tanstack/react-query)
- **Routing**: React Router v6
- **Notifications**: react-hot-toast
- **Date Formatting**: date-fns
- **Infinite Scroll**: react-intersection-observer
- **HTTP Client**: Axios

### Infrastructure
- **Containers**: Docker, Docker Compose
- **Reverse Proxy**: Nginx
- **Deployment**: Self-hosted, production-ready

## 📦 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/mufthakherul/Let-s-connect.git
cd Let-s-connect
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start all services**
```bash
docker-compose up --build
```

4. **Access the platform**
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8000
- MinIO Console: http://localhost:9001 (admin/admin)

## 🔒 Security

- **JWT Authentication** with secure token-based auth
- **Role-Based Access Control** (user, moderator, admin)
- **Rate Limiting** to prevent API abuse
- **Password Hashing** using bcrypt
- **Content Moderation** with AI
- **HTTPS Ready** for production deployment

## 📚 Documentation

### Getting Started
- **[Quick Start Guide](./QUICK_START.md)** - Get running in 5 minutes
- **[Features Overview](./FEATURES.md)** - Complete feature checklist
- **[Development Roadmap](./ROADMAP.md)** - Future plans and progress

### Deployment
- **[📖 Comprehensive Deployment Guide](./DEPLOYMENT_GUIDE.md)** - **Complete step-by-step guide for Docker Compose & Kubernetes**
- **[Deployment Quick Reference](./docs/DEPLOYMENT.md)** - Quick deployment reference
- **[Kubernetes Setup](./k8s/README.md)** - Kubernetes manifests and configuration
- **[Render Deployment](./docs/RENDER_DEPLOYMENT.md)** - Deploy to Render.com

### Technical Documentation
- **[Full Documentation Index](./docs/README.md)** - Complete documentation index
- **[Architecture Guide](./docs/ARCHITECTURE.md)** - System design and microservices
- **[API Reference](./docs/API.md)** - Complete REST API documentation

### Configuration & Setup
- **[OAuth & Email Setup](./docs/OAUTH_MAILGUN_SETUP.md)** - Configure OAuth and Mailgun

### Development Resources
- **[Testing Guide](./TESTING.md)** - Testing strategies and guidelines
- **[Security Notes](./SECURITY_NOTES.md)** - Security best practices
- **[Changelog](./CHANGELOG.md)** - Version history

## 🚀 Deployment

The platform is designed for **self-hosted deployment** with Docker Compose for development and Kubernetes for production:

### Development (Docker Compose)
```bash
# Start all services
docker-compose up --build

# Access at http://localhost:3000
```

### Production (Kubernetes)
```bash
# Deploy to Kubernetes cluster
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/
```

### 📖 Complete Deployment Guide

For detailed step-by-step instructions covering:
- ✅ Docker Compose setup and configuration
- ✅ Kubernetes cluster deployment
- ✅ Database and infrastructure setup
- ✅ SSL/TLS certificate configuration
- ✅ Monitoring and scaling
- ✅ Production best practices
- ✅ Troubleshooting

**See: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Inspired by the best features from:
- Facebook (Social Feed, Reactions, Pages)
- X/Twitter (Microblogging, Hashtags, Trending)
- YouTube (Video Platform, Channels, Subscriptions)
- WhatsApp/Telegram (Messaging, Groups)
- Discord (Servers, Roles, Channels)
- Notion (Collaboration, Docs, Wiki)
- Reddit (Communities, Voting, Karma)
- LinkedIn (Skills, Endorsements, Professional Network)
- GitHub (Issues, Projects, Task Management)
- Amazon/AliExpress (E-commerce, Reviews, Cart)

## 📧 Support

For issues and questions, please use the [GitHub Issues](https://github.com/mufthakherul/Let-s-connect/issues) page.
