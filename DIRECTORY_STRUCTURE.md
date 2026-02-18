# Let's Connect - Directory Structure

This document provides an overview of the clean, organized repository structure.

## Root Directory Structure

```
Let-s-connect/
├── README.md                      # Main project documentation
├── QUICK_START.md                 # Quick start guide for developers
├── ROADMAP.md                     # Project roadmap and future plans
├── SECURITY_NOTES.md              # Security best practices and notes
├── TESTING.md                     # Testing guidelines and procedures
├── DIRECTORY_STRUCTURE.md         # This file
├── docker-compose.yml             # Docker Compose configuration
├── .env.example                   # Example environment variables
├── .gitignore                     # Git ignore rules
├── .renderignore                  # Render.com deployment ignore rules
│
├── docs/                          # 📚 Comprehensive documentation
│   ├── API.md                     # API documentation
│   ├── ARCHITECTURE.md            # System architecture overview
│   ├── CHANGELOG.md               # Version history and changes
│   ├── DEPLOYMENT.md              # Deployment instructions
│   ├── DEPLOYMENT_GUIDE.md        # Detailed deployment guide
│   ├── DEV_PROD_MODE_GUIDE.md     # Development vs Production mode
│   ├── DYNAMIC_SEEDING_GUIDE.md   # Dynamic data seeding guide
│   ├── DYNAMIC_SEEDING_QUICK_START.md  # Quick start for seeding
│   ├── ELASTICSEARCH_IMPLEMENTATION.md # Elasticsearch setup
│   ├── FEATURES.md                # Complete feature list
│   ├── GITLAB_HOSTING.md          # GitLab hosting guide (NEW)
│   ├── HELPCENTER_SETUP.md        # Help center configuration
│   ├── IMPLEMENTATION_SUMMARY.md  # Implementation overview
│   ├── OAUTH_MAILGUN_SETUP.md     # OAuth and Mailgun setup
│   ├── QUICK_REFERENCE.md         # Quick reference guide
│   ├── RENDER_DEPLOYMENT.md       # Render.com deployment
│   ├── STREAMING_FEATURES.md      # Streaming service features
│   ├── STREAMING_SEEDING_QUICK_START.md  # Streaming data seeding
│   ├── TV_ADVANCED_FEATURES.md    # TV streaming advanced features
│   ├── TV_API_INTEGRATION.md      # TV API integration guide
│   ├── TV_PROFESSIONAL_UPGRADE.md # TV professional features
│   ├── TV_QUICK_REFERENCE.md      # TV quick reference
│   └── V2_QUICK_DEPLOYMENT.md     # V2 deployment guide
│
├── archives/                      # 📦 Historical and implementation reports
│   ├── README.md                  # Archives overview
│   ├── audit-reports/             # Security and compliance audit reports
│   ├── implementation-reports/    # Detailed implementation reports
│   │   ├── COMPLETE_INDEX.md
│   │   ├── DYNAMIC_SEEDING_COMPLETE.md
│   │   ├── DYNAMIC_SEEDING_IMPROVEMENTS_V2.md
│   │   ├── DYNAMIC_SEEDING_SUMMARY.md
│   │   ├── FEATURES_COMPLETE.md
│   │   ├── IMPLEMENTATION_COMPLETE.md
│   │   ├── STREAMING_IMPLEMENTATION_SUMMARY.md
│   │   ├── STREAMING_SEEDING_IMPLEMENTATION.md
│   │   └── V2_IMPLEMENTATION_COMPLETE.md
│   ├── phase-reports/             # Phase-by-phase implementation reports
│   │   ├── PHASE_9_IMPLEMENTATION_REPORT.md
│   │   ├── PHASE_10_IMPLEMENTATION_REPORT.md
│   │   ├── PHASE_11_IMPLEMENTATION_REPORT.md
│   │   └── PHASE_12_IMPLEMENTATION_REPORT.md
│   ├── task-reports/              # Task completion reports
│   └── other-docs/                # Miscellaneous archived documents
│
├── frontend/                      # 🎨 React frontend application
│   ├── public/                    # Static assets
│   ├── src/                       # Source code
│   │   ├── components/            # React components
│   │   ├── services/              # API service clients
│   │   ├── utils/                 # Utility functions
│   │   ├── App.js                 # Main app component
│   │   └── index.js               # Entry point
│   ├── package.json               # Frontend dependencies
│   └── Dockerfile                 # Frontend Docker configuration
│
├── services/                      # 🔧 Backend microservices
│   ├── api-gateway/               # API Gateway service
│   ├── user-service/              # User management service
│   ├── content-service/           # Content management service
│   ├── messaging-service/         # Messaging and chat service
│   ├── collaboration-service/     # Collaboration and meetings service
│   ├── media-service/             # Media processing service
│   ├── streaming-service/         # Radio/TV streaming service
│   ├── shop-service/              # E-commerce service
│   ├── ai-service/                # AI/ML service
│   └── shared/                    # Shared utilities and libraries
│
├── k8s/                           # ☸️ Kubernetes configurations
│   ├── deployments/               # Deployment manifests
│   ├── services/                  # Service definitions
│   └── ingress/                   # Ingress configurations
│
├── scripts/                       # 🔨 Utility scripts
│   ├── setup.sh                   # Setup script
│   ├── deploy.sh                  # Deployment script
│   └── test.sh                    # Testing script
│
└── screenshots/                   # 📸 Application screenshots
    └── audit-feb-2026/            # Timestamped screenshot collections
```

## Service Architecture

Each microservice follows a consistent structure:

```
service-name/
├── server.js                      # Main server file
├── package.json                   # Service dependencies
├── Dockerfile                     # Docker configuration
├── .dockerignore                  # Docker ignore rules
└── [service-specific files]       # Additional service files
```

## Key Files and Directories

### Root Level Documentation
- **README.md** - Main entry point, project overview, and quick links
- **QUICK_START.md** - Get up and running in 5 minutes
- **ROADMAP.md** - Feature roadmap and development plans
- **SECURITY_NOTES.md** - Security considerations and best practices
- **TESTING.md** - Testing strategy and guidelines

### Documentation (`/docs`)
Contains all comprehensive guides, API documentation, deployment instructions, and feature documentation. This is the go-to place for in-depth information.

### Archives (`/archives`)
Historical records, implementation reports, and phase reports. These documents track the development history but are not needed for daily operations.

### Frontend (`/frontend`)
React-based web application with modern UI/UX. Includes all frontend components, services, and utilities.

### Services (`/services`)
Microservices architecture with 9 independent services:
- **api-gateway** - Central API gateway and request routing
- **user-service** - Authentication, authorization, and user management
- **content-service** - Posts, comments, and social content
- **messaging-service** - Real-time messaging and chat
- **collaboration-service** - Video meetings and collaboration tools
- **media-service** - Media upload, processing, and storage
- **streaming-service** - Radio and TV streaming (optimized for fast startup)
- **shop-service** - E-commerce and marketplace
- **ai-service** - AI-powered features and recommendations

### Infrastructure (`/k8s`, `/scripts`)
- **k8s/** - Kubernetes deployment configurations for production
- **scripts/** - Automation scripts for development and deployment

### Screenshots (`/screenshots`)
Visual documentation of the application UI and features, organized by date.

## Development Workflow

1. **Setup**: Follow `QUICK_START.md` for initial setup
2. **Development**: Use `docker-compose.yml` for local development
3. **Testing**: Refer to `TESTING.md` for testing guidelines
4. **Deployment**: Check `docs/DEPLOYMENT_GUIDE.md` for deployment options
5. **Documentation**: All new features should update relevant docs

## Recent Improvements

- ✅ Reorganized repository structure for better navigation
- ✅ Moved implementation reports to archives
- ✅ Consolidated documentation in docs directory
- ✅ Optimized streaming-service startup time
- ✅ Added GitLab CI/CD support

## Contributing

When adding new files:
- Put comprehensive guides in `/docs`
- Put implementation/completion reports in `/archives/implementation-reports`
- Keep root directory clean with only essential files
- Update this document when adding new major directories

## Need Help?

- Start with `README.md` for project overview
- Check `QUICK_START.md` for setup instructions
- Browse `/docs` for detailed documentation
- Look in `/archives` for historical context
