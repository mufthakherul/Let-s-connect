# 📁 Repository Directory Structure

Complete annotated directory tree for the Milonexa repository.

---

```
milonexa/                              Root of the repository
│
├── frontend/                          React 18 user web application
│   ├── public/                        Static assets (favicon, manifest.json, index.html)
│   ├── src/
│   │   ├── components/                Feature UI components
│   │   │   ├── AuthHub.jsx            Unified login/register/forgot-password hub
│   │   │   ├── Home.jsx               Landing page for unauthenticated users
│   │   │   ├── Homepage.jsx           Homepage for authenticated users
│   │   │   ├── Feed.jsx               Social feed (authenticated)
│   │   │   ├── Chat.jsx               Messaging interface
│   │   │   ├── Videos.jsx             Video browser
│   │   │   ├── Shop.jsx               Product marketplace
│   │   │   ├── Docs.jsx               Collaboration documents
│   │   │   ├── Meetings.jsx           Video meeting management
│   │   │   ├── MeetingRoom.jsx        Live WebRTC meeting room
│   │   │   ├── Radio.jsx              Internet radio player
│   │   │   ├── TV.jsx                 Live TV channel browser
│   │   │   ├── Groups.jsx             Groups management
│   │   │   ├── Pages.jsx              Public pages
│   │   │   ├── Friends.jsx            Friends management
│   │   │   ├── Profile.jsx            Own profile
│   │   │   ├── PublicProfile.jsx      View other user profiles
│   │   │   ├── Bookmarks.jsx          Saved content
│   │   │   ├── Blog.jsx               Blog posts browser
│   │   │   ├── MediaGallery.jsx       Media gallery
│   │   │   ├── Search.jsx             Search interface
│   │   │   ├── Discovery.jsx          Discover content
│   │   │   ├── Analytics.jsx          User analytics
│   │   │   ├── Cart.jsx               Shopping cart
│   │   │   ├── ThemeSettings.jsx      Dark/light mode settings
│   │   │   ├── AccessibilitySettings.jsx Accessibility options
│   │   │   ├── SecuritySettings.jsx   Security settings (2FA, sessions)
│   │   │   ├── AppearanceSettings.jsx Appearance customization
│   │   │   ├── SettingsHub.jsx        Settings navigation hub
│   │   │   ├── EmailPreferences.jsx   Email notification preferences
│   │   │   ├── OAuthLogin.jsx         OAuth callback handler
│   │   │   ├── ResetRequest.jsx       Password reset request
│   │   │   ├── ResetPassword.jsx      Password reset form
│   │   │   ├── PrivacyPolicy.jsx      Privacy policy page
│   │   │   ├── TermsOfService.jsx     Terms of service page
│   │   │   ├── CookiePolicy.jsx       Cookie policy page
│   │   │   ├── errors/                Error pages (401, 403, 404, 429, 500, 503)
│   │   │   └── hubs/                  Hub pages
│   │   │       ├── helpcenter/        Help center, FAQ, guides, support tickets
│   │   │       ├── forum/             Community forum
│   │   │       ├── transparency/      Transparency hub
│   │   │       ├── developer/         Developer portal
│   │   │       ├── creator/           Creator hub
│   │   │       ├── business/          Business support
│   │   │       ├── wellbeing/         Wellbeing center
│   │   │       ├── education/         Educational resources
│   │   │       ├── accessibility/     Accessibility hub
│   │   │       └── donation/          Donation hub
│   │   ├── routing/
│   │   │   └── AppRoutes.jsx          Centralized route definitions (lazy loading)
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx         App shell with navbar, sidebar, content
│   │   ├── providers/
│   │   │   └── AppProviders.jsx       Context providers (React Query, etc.)
│   │   ├── store/                     Zustand state stores
│   │   │   ├── authStore.js           Authentication state (user, token)
│   │   │   ├── themeStore.js          Dark/light mode, accent colors
│   │   │   └── ...
│   │   ├── hooks/                     Custom React hooks
│   │   ├── utils/
│   │   │   └── api.js                 Axios instance (API_VERSION=v2, auth headers)
│   │   └── theme/
│   │       └── designSystem.js        Design tokens, color palettes, typography
│   └── package.json
│
├── admin/web/                         Admin React web panel (Docker profile: admin)
│   └── src/
│       ├── App.js                     Admin app shell
│       └── components/
│           ├── AdminDashboard.js      Main admin dashboard (30 tabs)
│           ├── AdminLogin.js          Admin login with 2FA
│           ├── Login.js               Alternate login component
│           ├── dashboard/             Dashboard panel components
│           │   ├── UserManagementTable.jsx
│           │   ├── AuditLogTable.jsx
│           │   ├── HealthMetricsPanel.jsx
│           │   ├── ModerationQueuePanel.jsx
│           │   ├── SecurityDashboard.jsx
│           │   ├── FeatureFlagToggle.jsx
│           │   ├── TenantManager.jsx
│           │   ├── AIAgentPanel.jsx
│           │   ├── AIIntegrationPanel.jsx
│           │   ├── CostBreakdown.jsx
│           │   ├── ComplianceDashboard.jsx
│           │   └── ...
│           └── common/                Shared components
│
├── services/                          Backend microservices
│   ├── api-gateway/                   Main API gateway
│   │   ├── server.js                  Express app with all routes
│   │   ├── resilience-config.js       Circuit breakers, timeouts
│   │   ├── route-governance.js        Route classification middleware
│   │   ├── swagger-config.js          OpenAPI spec configuration
│   │   ├── postman-generator.js       Postman collection generator
│   │   ├── webhook-routes.js          Webhook endpoint handlers
│   │   └── tests/resilience.test.js   Unit tests (22 tests)
│   │
│   ├── user-service/                  Auth & user management
│   │   └── src/
│   │       ├── controllers/
│   │       │   ├── authController.js  Register, login, refresh, 2FA
│   │       │   ├── oauthController.js OAuth (Google/GitHub/Discord/Apple)
│   │       │   ├── profileController.js Profile CRUD
│   │       │   ├── socialController.js Friends, follow, skills
│   │       │   ├── pageController.js  Pages CRUD & follower management
│   │       │   ├── notificationController.js Notifications
│   │       │   └── settingsController.js User settings
│   │       ├── routes/                Express router files
│   │       ├── models/                Sequelize models
│   │       └── validators/            Joi/express-validator validators
│   │
│   ├── content-service/               Posts, feed, groups, communities
│   │   └── src/
│   │       ├── controllers/           postController, groupController, etc.
│   │       ├── routes/                Route files per resource
│   │       └── models/                Post, Comment, Group, Community, etc.
│   │
│   ├── messaging-service/             Real-time chat
│   │   ├── routes/
│   │   │   ├── messages.js            Message CRUD, reactions, pins
│   │   │   ├── conversations.js       DM conversation management
│   │   │   └── channels.js            Servers, channels, voice, webhooks
│   │   └── models/                    Message, Conversation, Server, etc.
│   │
│   ├── collaboration-service/         Docs, wikis, tasks, meetings
│   │   └── routes/
│   │       ├── meetings.js            Meeting CRUD, participants, modes
│   │       ├── meeting-modes.js       Specialized meeting modes
│   │       ├── documents.js           Collaborative document editing
│   │       ├── wikis.js               Wiki CRUD with history
│   │       ├── tasks.js               Tasks, issues, projects
│   │       ├── governance.js          Governance workflows
│   │       └── knowledge.js           Knowledge base
│   │
│   ├── media-service/                 File uploads & MinIO storage
│   │   └── server.js                  Multer upload, MinIO client
│   │
│   ├── shop-service/                  E-commerce
│   │   └── server.js                  Products, orders, cart, reviews, Stripe
│   │
│   ├── ai-service/                    AI features
│   │   └── server.js                  Gemini/Ollama integration, moderation
│   │
│   ├── streaming-service/             Radio, TV, live streaming
│   │   └── server.js                  IPTV, radio stations, favorites
│   │
│   ├── security-service/              Admin auth proxy
│   │   └── server.js                  Admin authentication, JWT validation
│   │
│   └── shared/                        Utilities shared across all services
│       ├── logger.js                  Structured JSON logging (Winston)
│       ├── response-wrapper.js        Standardized API response format
│       ├── errorHandling.js           AppError class, global error handler
│       ├── db-sync-policy.js          Sequelize sync policy (migrate/alter)
│       ├── caching.js                 Redis cache manager & strategies
│       ├── event-bus.js               Redis pub/sub event bus
│       ├── monitoring.js              HealthChecker, Prometheus metrics
│       ├── security-utils.js          getRequiredEnv, secret validation
│       ├── env-validator.js           Startup env validation
│       └── logging-utils.js           Request logging middleware
│
├── admin/                             Admin panel ecosystem
│   ├── cli/
│   │   └── index.js                   Omni Admin CLI (Phase D+)
│   ├── rest-api/
│   │   └── server.js                  Admin REST API server (port 8888)
│   ├── ssh/
│   │   └── server.js                  SSH TUI dashboard (port 2222)
│   ├── webhook/
│   │   └── server.js                  Webhook notification hub (port 8889)
│   ├── email/
│   │   └── server.js                  Email admin command interface
│   ├── ai/
│   │   └── agent.js                   AI autonomous admin agent
│   ├── bot/
│   │   ├── slack-bot.js               Slack bot (Socket Mode)
│   │   ├── telegram-bot.js            Telegram admin bot
│   │   ├── teams-bot.js               Microsoft Teams bot
│   │   └── pagerduty-bot.js           PagerDuty integration
│   ├── web/
│   │   └── src/                       React app (admin web panel)
│   └── shared/                        Shared admin modules
│       ├── metrics.js                 MetricsCollector
│       ├── alerts.js                  AlertManager
│       ├── audit.js                   Immutable audit logging
│       ├── auth.js                    RBAC, role resolution
│       ├── compliance.js              ComplianceManager (GDPR, SOC2)
│       ├── cost-analyzer.js           CostAnalyzer, cost forecasting
│       ├── feature-flags.js           FeatureFlagManager
│       ├── tenant-manager.js          TenantManager (multi-tenancy)
│       ├── sla.js                     SLAManager, breach prediction
│       ├── webhooks.js                WebhookManager
│       ├── runbook.js                 RunbookManager (automated runbooks)
│       ├── ai-integration.js          AIIntegrationBridge
│       ├── opentelemetry.js           AdminTracer (distributed tracing)
│       ├── anomaly-detector.js        AnomalyDetector (ML-based)
│       ├── gdpr.js                    GDPRManager (data export/deletion)
│       ├── multi-cluster.js           MultiClusterManager
│       ├── trend-analysis.js          TrendAnalyzer
│       ├── ai-remediation.js          RemediationEngine
│       ├── change-log.js              ChangeLog manager
│       └── secrets-vault.js           SecretsVault
│
├── k8s/                               Kubernetes manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── api-gateway.yaml
│   ├── frontend.yaml
│   ├── ingress.yaml
│   ├── ingress-production.yaml
│   ├── alertmanager.yaml
│   ├── grafana.yaml
│   ├── logging.yaml
│   ├── backup-cronjob.yaml
│   ├── pod-disruption-budgets.yaml
│   ├── multi-region.yaml
│   └── pgbouncer.yaml
│
├── deploy/                            Deployment helpers
│   └── nginx/                         Nginx reverse proxy configs
│
├── scripts/                           Operational scripts
│   └── init-databases.sh              Postgres database provisioning
│
├── docs/                              Documentation (this directory)
│
├── Archives/
│   ├── Archive_codes/                 Archived code/configs
│   └── Archive_docs/                  Archived documentation
│
├── .github/workflows/ci.yml           GitHub Actions CI
├── docker-compose.yml                 Full platform orchestration
├── .env.example                       Environment configuration template
├── README.md                          Repository README
├── ROADMAP.md                         Platform roadmap v2.0
└── docs/development/SECURITY.md       Security practices
```

---

## Key Patterns

### Shared Response Format
All API responses use the shared response wrapper:
```json
{ "success": true, "data": {}, "meta": { "requestId": "...", "timestamp": "..." } }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable message" } }
```

### Internal Headers
Services communicate via trusted internal headers:
- `x-user-id` — Authenticated user's UUID
- `x-internal-gateway-token` — Service-to-service auth token
- `x-request-id` — Distributed trace request ID
- `X-API-Version: v2` — API version header

[← Back to Overview](./README.md) | [Tech Stack →](./TECH_STACK.md)
