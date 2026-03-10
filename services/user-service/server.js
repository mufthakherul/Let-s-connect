const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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
const logger = require('../shared/logger');
// Workstream E: New utilities
const { initGracefulShutdown, createDatabaseCleanup, createRedisCleanup } = require('../shared/graceful-shutdown');
const { createHealthCheck, setupHealthRoutes } = require('../shared/health-check');
const { validateEnv } = require('../shared/env-validator');
const { securityAuditMiddleware } = require('../shared/sanitization');
const { setupQueryMonitoring, queryStatsMiddleware } = require('../shared/query-monitor');
const { getPoolConfig, monitorPoolHealth } = require('../shared/pool-config');
require('dotenv').config({ quiet: true });

const app = express();
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
app.use(express.json());
app.use(createForwardedIdentityGuard());

// Workstream E: Security audit middleware
app.use(securityAuditMiddleware(logger));

// Metrics tracking middleware
app.use(healthChecker.metricsMiddleware());

// Log requests
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  logger.info({
    method: req.method,
    path: req.url,
    requestId: req.id,
    correlationId: req.headers['x-correlation-id'] || req.id,
    traceId: req.traceContext?.traceId,
    spanId: req.traceContext?.spanId,
    traceparent: req.headers.traceparent || req.traceContext?.traceparent
  });
  next();
});

// Attach utilities to req
app.use((req, res, next) => {
  req.cacheManager = cacheManager;
  next();
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
    console.warn('[User Service] Core schema tables missing; bootstrapping with sequelize.sync() for recovery.');
    await sequelize.sync();
  }
}

// Workstream E: New health check system
let newHealthCheck;

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

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
      }
    ]);

    const server = app.listen(PORT, () => {
      logger.info(`User service running on port ${PORT}`);
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
    logger.error({ message: 'Failed to start server', error: err.message });
    process.exit(1);
  }
}

startServer();
