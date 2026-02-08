# Let's Connect - Unified Social Collaboration Platform

A comprehensive social collaboration platform combining features from Facebook, X (Twitter), YouTube, WhatsApp, Telegram, Discord, and Notion into one self-hosted application.

## 🚀 Features

### Public Access (No Signup Required)
- 📺 **Video Platform** - Watch public videos like YouTube with channels
- 📖 **Documentation** - Read public docs and wiki pages
- 🛒 **Shop** - Browse products and marketplace with reviews

### Private Access (Authentication Required)
- 📱 **Social Feed** - Posts, images, hashtags, reactions (like, love, haha, wow, sad, angry)
- 💬 **Real-time Chat** - Instant messaging with Discord-style servers and roles
- 📞 **Voice/Video** - Calls and conferences (WebRTC ready)
- 📝 **Collaboration** - Documents, wikis, and GitHub-style issue tracking
- 📁 **File Sharing** - Upload and share files with S3-compatible storage
- 🛍️ **E-commerce** - Shopping cart, reviews, wishlist, and order tracking
- 🤖 **AI Assistant** - Smart features powered by OpenAI
- 👥 **Communities** - Reddit-style communities with voting
- 🎯 **Skills** - LinkedIn-style skills and endorsements
- 📊 **Projects** - GitHub-style project management

## 🏗️ Architecture

Built with **modular microservices** for scalability and maintainability:

- **API Gateway** - Request routing, authentication, rate limiting
- **User Service** - Authentication and profile management
- **Content Service** - Posts, feeds, and videos
- **Messaging Service** - Real-time chat with Socket.IO
- **Collaboration Service** - Docs, wiki, and task management
- **Media Service** - File storage with MinIO (S3-compatible)
- **Shop Service** - E-commerce and order management
- **AI Service** - OpenAI integration for smart features

## 🛠️ Technology Stack

- **Backend**: Node.js, Express, PostgreSQL, Redis, MinIO
- **Frontend**: React 18, Material-UI, React Router, Axios
- **Real-time**: Socket.IO for WebSocket connections
- **Infrastructure**: Docker, Docker Compose, Nginx
- **Security**: JWT auth, bcrypt, Helmet.js, rate limiting

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

- [Full Documentation](./docs/README.md)
- [API Reference](./docs/API.md)
- [New Platform Features API](./docs/API_NEW_FEATURES.md)
- [Quick Reference Guide](./docs/QUICK_REFERENCE.md)
- [Development Roadmap](./ROADMAP.md)
- [Platform Features Mapping](./PLATFORM_FEATURES.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## 🚀 Deployment

The platform is designed for **self-hosted deployment** with Docker:

```bash
# Production deployment
docker-compose -f docker-compose.yml up -d
```

For detailed deployment instructions, see [DEPLOYMENT.md](./docs/DEPLOYMENT.md)

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
