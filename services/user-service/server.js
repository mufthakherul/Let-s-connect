const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Sequelize } = require('sequelize');
const { sequelize } = require('./src/models');
const routes = require('./src/routes');
const { HealthChecker, checkDatabase, checkRedis } = require('../shared/monitoring');
const { CacheManager } = require('../shared/caching');
const { MigrationManager } = require('../shared/migrations-manager');
const { syncWithPolicy } = require('../shared/db-sync-policy');
const { createForwardedIdentityGuard } = require('../shared/security-utils');
const { buildCorsOptions } = require('../shared/cors-config');
const response = require('../shared/response-wrapper');
const { errorHandler: globalErrorHandler } = require('../shared/errorHandling');
const { createLogger, requestLogger, errorLogger, logStartup, logShutdown } = require('../shared/advanced-logger');
// Workstream E: New utilities
const { initGracefulShutdown, createDatabaseCleanup, createRedisCleanup } = require('../shared/graceful-shutdown');
const { createHealthCheck, setupHealthRoutes } = require('../shared/health-check');
const { validateEnv } = require('../shared/env-validator');
const { securityAuditMiddleware } = require('../shared/sanitization');
const { setupQueryMonitoring, queryStatsMiddleware } = require('../shared/query-monitor');
const { getPoolConfig, monitorPoolHealth } = require('../shared/pool-config');
require('dotenv').config({ quiet: true });

const app = express();
const logger = createLogger('user-service');
const healthChecker = new HealthChecker('user-service');
const cacheManager = new CacheManager();
const migrationManager = new MigrationManager(sequelize, 'user-service');

// Register checks (legacy monitoring)
healthChecker.registerCheck('database', () => checkDatabase(sequelize));
healthChecker.registerCheck('redis', () => checkRedis(cacheManager.redis));

// Workstream E: Validate environment at startup
const envValidation = validateEnv({
  strict: process.env.NODE_ENV === 'production',
  skipDatabase: false
});
if (!envValidation.valid) {
  logger.error('Environment validation failed', { errors: envValidation.errors });
  process.exit(1);
}

const PORT = process.env.PORT || 8001;
const dbPoolProfile = process.env.DB_POOL_PROFILE || 'heavy';

// Middleware
app.use(helmet());
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: '10mb' }));
app.use(createForwardedIdentityGuard());

// Advanced request logging middleware
app.use(requestLogger('user-service'));

// Workstream E: Security audit middleware
app.use(securityAuditMiddleware(logger));

// Metrics tracking middleware
app.use(healthChecker.metricsMiddleware());

// Attach utilities to req
app.use((req, res, next) => {
  req.cacheManager = cacheManager;
  next();
});

// Simple health endpoint (liveness probe) - always returns 200
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'running', service: 'user-service' });
});

// App Routes
app.use('/', routes);

// Legacy health checks (keep for backward compatibility during transition)
app.get('/health/ready', async (req, res) => {
  try {
    const health = await healthChecker.runChecks();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(healthChecker.getPrometheusMetrics());
});

// Note: /health and /ready are now handled by Workstream E health-check.js via setupHealthRoutes()

// Workstream F2: query profiling endpoint (disabled by default in production)
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_QUERY_DEBUG_ENDPOINT === 'true') {
  app.get('/debug/query-stats', queryStatsMiddleware);
}

// Friendly root endpoint (avoid default "Cannot GET /")
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'user-service',
    message: 'User service is running.',
    health: '/health',
    ready: '/ready'
  });
});

// Standard route fallback
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint '${req.originalUrl}' does not exist.`
    }
  });
});

// Advanced error logging middleware
app.use(errorLogger('user-service'));

// Global Error Handler
app.use(globalErrorHandler);

// Start Server
async function ensureSchemaBootstrapIfMissing() {
  const qi = sequelize.getQueryInterface();
  const rawTables = await qi.showAllTables();
  const tableNames = new Set(
    rawTables.map((entry) => (typeof entry === 'string' ? entry : entry.tableName || entry)).filter(Boolean)
  );

  if (!tableNames.has('Users')) {
    logger.warn('Core schema tables missing; bootstrapping with sequelize.sync() for recovery.');
    await sequelize.sync();
  }
}

// Workstream E: New health check system
let newHealthCheck;

async function startServer() {
  try {
    const startTime = Date.now();
    await sequelize.authenticate();
    logger.database('authenticate', 'sequelize', Date.now() - startTime);

    // Workstream F2/F3: Query monitoring + pool health checks
    setupQueryMonitoring(sequelize, {
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '100', 10),
      n1Threshold: parseInt(process.env.N1_QUERY_THRESHOLD || '5', 10),
      enableStackTrace: process.env.NODE_ENV !== 'production'
    });
    monitorPoolHealth(sequelize, getPoolConfig(dbPoolProfile));

    await ensureSchemaBootstrapIfMissing();

    // Phase 10: Professional Migrations
    await migrationManager.runMigrations([
      {
        name: 'init-user-tables',
        up: async (qi) => {
          await syncWithPolicy(sequelize, 'user-service');
        }
      },
      {
        name: 'add-feedback-table',
        up: async (qi) => {
          const feedbackTableExists = await qi
            .describeTable('Feedbacks')
            .then(() => true)
            .catch(() => false);

          if (!feedbackTableExists) {
            await qi.createTable('Feedbacks', {
              id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
              },
              userId: {
                type: Sequelize.UUID,
                allowNull: true,
                references: { model: 'Users', key: 'id' }
              },
              category: {
                type: Sequelize.ENUM('feature-request', 'bug-report', 'improvement', 'praise', 'other'),
                allowNull: false
              },
              subject: {
                type: Sequelize.STRING(140),
                allowNull: false
              },
              message: {
                type: Sequelize.TEXT,
                allowNull: false
              },
              rating: {
                type: Sequelize.FLOAT,
                allowNull: true
              },
              displayName: {
                type: Sequelize.STRING(80),
                allowNull: false,
                defaultValue: 'Community Member'
              },
              status: {
                type: Sequelize.ENUM('pending', 'approved', 'rejected'),
                allowNull: false,
                defaultValue: 'pending'
              },
              verified: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
              },
              reviewerId: {
                type: Sequelize.UUID,
                allowNull: true,
                references: { model: 'Users', key: 'id' }
              },
              reviewedAt: {
                type: Sequelize.DATE,
                allowNull: true
              },
              reason: {
                type: Sequelize.TEXT,
                allowNull: true
              },
              createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
              },
              updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
              }
            });
          }

          await sequelize.query('CREATE INDEX IF NOT EXISTS feedbacks_status ON "Feedbacks" ("status")');
          await sequelize.query('CREATE INDEX IF NOT EXISTS feedbacks_category ON "Feedbacks" ("category")');
          await sequelize.query('CREATE INDEX IF NOT EXISTS feedbacks_user_id ON "Feedbacks" ("userId")');
        }
      }
    ]);

    const server = app.listen(PORT, () => {
      logStartup('user-service', PORT, {
        database: 'connected',
        redis: cacheManager.redis ? 'connected' : 'disabled',
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Workstream E: Initialize graceful shutdown
    const shutdownManager = initGracefulShutdown(app, server, {
      shutdownTimeout: 30000,
      healthcheckGracePeriod: 5000,
      logger
    });

    // Register cleanup handlers
    shutdownManager.registerCleanup(
      'database',
      createDatabaseCleanup(sequelize),
      10
    );

    if (cacheManager.redis) {
      shutdownManager.registerCleanup(
        'redis',
        createRedisCleanup(cacheManager.redis),
        20
      );
    }

    // Workstream E: Initialize new health check system
    newHealthCheck = createHealthCheck('user-service', {
      version: require('./package.json').version || '1.0.0',
      database: sequelize,
      redis: cacheManager.redis,
      redisRequired: false,
      shutdownManager
    });

    // Setup new health routes (/health for liveness, /ready for readiness)
    setupHealthRoutes(app, newHealthCheck);

  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// Signal handling and shutdown logging are managed by the shared graceful shutdown manager.

startServer();
