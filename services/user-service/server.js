const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { sequelize } = require('./src/models');
const routes = require('./src/routes');
const { HealthChecker, checkDatabase, checkRedis } = require('../shared/monitoring');
const { CacheManager } = require('../shared/caching');
const { MigrationManager } = require('../shared/migrations-manager');
const { getSafeSyncOptions } = require('../shared/db-sync-policy');
const { createForwardedIdentityGuard } = require('../shared/security-utils');
const response = require('../shared/response-wrapper');
const { errorHandler: globalErrorHandler } = require('../shared/errorHandling');
const logger = require('../shared/logger');
require('dotenv').config();

const app = express();
const healthChecker = new HealthChecker('user-service');
const cacheManager = new CacheManager();
const migrationManager = new MigrationManager(sequelize, 'user-service');

// Register checks
healthChecker.registerCheck('database', () => checkDatabase(sequelize));
healthChecker.registerCheck('redis', () => checkRedis(cacheManager.redis));

const PORT = process.env.PORT || 8001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(createForwardedIdentityGuard());

// Metrics tracking middleware
app.use(healthChecker.metricsMiddleware());

// Log requests
app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.url, requestId: req.headers['x-request-id'] });
  next();
});

// Attach utilities to req
app.use((req, res, next) => {
  req.cacheManager = cacheManager;
  next();
});

// App Routes
app.use('/', routes);

// Enhanced health checks
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

// Health Check
app.get('/health', (req, res) => {
  res.json(healthChecker.getBasicHealth());
});

// Global Error Handler
app.use(globalErrorHandler);

// Start Server
async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Phase 10: Professional Migrations
    await migrationManager.runMigrations([
      {
        name: 'init-user-tables',
        up: async (qi) => {
      await sequelize.sync(getSafeSyncOptions('user-service'));
        }
      }
    ]);

    app.listen(PORT, () => {
      logger.info(`User service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error({ message: 'Failed to start server', error: err.message });
    process.exit(1);
  }
}

startServer();
