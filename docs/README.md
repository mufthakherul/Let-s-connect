# Documentation Index

Welcome to the Let's Connect documentation. This directory contains comprehensive technical documentation for developers, operators, and contributors.

## 📚 Documentation Overview

### Getting Started
- **[Quick Start Guide](../QUICK_START.md)** - Get up and running in 5 minutes
- **[Features Overview](../FEATURES.md)** - Complete feature checklist
- **[README](../README.md)** - Project overview and introduction

### Architecture & Design
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and microservices design
- **[API.md](API.md)** - Complete REST API reference for all services
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Current implementation status

### Deployment & Operations
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide and infrastructure setup
- **[RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)** - Render.com deployment instructions
- **[Kubernetes Setup](../k8s/README.md)** - Kubernetes deployment configuration

### Configuration & Setup
- **[OAUTH_MAILGUN_SETUP.md](OAUTH_MAILGUN_SETUP.md)** - OAuth and Mailgun email configuration
- **[ELASTICSEARCH_IMPLEMENTATION.md](ELASTICSEARCH_IMPLEMENTATION.md)** - Elasticsearch setup for search functionality
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick reference for common tasks

### Development
- **[TESTING.md](../TESTING.md)** - Testing strategy and guidelines
- **[SECURITY_NOTES.md](../SECURITY_NOTES.md)** - Security best practices and guidelines
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes
- **[ROADMAP.md](../ROADMAP.md)** - Future development plans

## 🏗️ System Architecture

Let's Connect is built using a microservices architecture with 8 independent services:

| Service | Port | Purpose |
|---------|------|---------|
| API Gateway | 8000 | Request routing, authentication, rate limiting |
| User Service | 8001 | User management, profiles, authentication |
| Content Service | 8002 | Posts, feeds, videos, comments |
| Messaging Service | 8003 | Real-time chat, WebRTC calls, notifications |
| Collaboration Service | 8004 | Documents, wikis, tasks, folders |
| Media Service | 8005 | File uploads, image optimization, S3 storage |
| Shop Service | 8006 | Products, orders, inventory |
| AI Service | 8007 | AI-powered features, content moderation |

## 🚀 Quick Links

### For Developers
- Start with [QUICK_START.md](../QUICK_START.md) for local setup
- Review [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Check [API.md](API.md) for API endpoints
- Read [TESTING.md](../TESTING.md) for testing guidelines

### For DevOps
- See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment options
- Check [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for Render.com
- Review [Kubernetes configs](../k8s/README.md) for K8s deployment
- Read [SECURITY_NOTES.md](../SECURITY_NOTES.md) for security setup

### For Contributors
- Review [FEATURES.md](../FEATURES.md) to see what's implemented
- Check [ROADMAP.md](../ROADMAP.md) for future plans
- Read [CHANGELOG.md](CHANGELOG.md) for recent changes

## 📂 Project Structure

```
Let-s-connect/
├── docs/                   # Technical documentation (you are here)
├── services/               # Backend microservices
│   ├── api-gateway/       # API Gateway service
│   ├── user-service/      # User management
│   ├── content-service/   # Content and feeds
│   ├── messaging-service/ # Chat and calls
│   ├── collaboration-service/ # Docs and wikis
│   ├── media-service/     # File storage
│   ├── shop-service/      # E-commerce
│   └── ai-service/        # AI features
├── frontend/              # React frontend application
├── k8s/                   # Kubernetes manifests
├── scripts/               # Utility scripts
└── archives/              # Historical documentation

```

## 🔒 Security

This platform implements enterprise-grade security:
- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting and DDoS protection
- Input validation and sanitization
- Encrypted data storage
- Security headers and CORS

See [SECURITY_NOTES.md](../SECURITY_NOTES.md) for detailed security documentation.

## 📝 Technology Stack

**Backend**: Node.js, Express, PostgreSQL, Redis, Socket.IO, Sequelize  
**Frontend**: React 18, Material-UI, React Router, Axios  
**Storage**: MinIO (S3-compatible), PostgreSQL  
**Infrastructure**: Docker, Kubernetes, Nginx  
**Monitoring**: Prometheus, Grafana  

## 🤝 Contributing

To contribute to this project:
1. Read the relevant documentation above
2. Check the [ROADMAP.md](../ROADMAP.md) for planned features
3. Review [TESTING.md](../TESTING.md) for testing requirements
4. Follow security guidelines in [SECURITY_NOTES.md](../SECURITY_NOTES.md)

## 📜 License

MIT License - See main [README.md](../README.md) for details.

---

**Need Help?** Start with the [Quick Start Guide](../QUICK_START.md) or check the [Architecture](ARCHITECTURE.md) documentation.
