'use strict';

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Redis = require('ioredis');
const { createForwardedIdentityGuard } = require('../shared/security-utils');
const { startServiceWithDatabase } = require('../shared/startup');
const { buildSocketCorsOptions } = require('../shared/cors-config');
const { HealthChecker, checkDatabase, checkRedis } = require('../shared/monitoring');
const { setupQueryMonitoring, queryStatsMiddleware } = require('../shared/query-monitor');
const { getPoolConfig, monitorPoolHealth } = require('../shared/pool-config');
const { createLogger, requestLogger, logStartup, logShutdown } = require('../shared/advanced-logger');
require('dotenv').config({ quiet: true });

// Create service logger
const logger = createLogger('messaging-service');

const models = require('./models');
const mountRoutes = require('./routes');
const push = require('./lib/push');
const createHelpers = require('./lib/helpers');
const setupSocketHandlers = require('./lib/socket');

const {
  sequelize, Message, Conversation, Subscription
} = models;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: buildSocketCorsOptions() });

const PORT = process.env.PORT || 8003;
const BOT_SYSTEM_USER_ID = process.env.BOT_SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000001';
const TELEGRAM_BOT_WEBHOOK_TOKEN = process.env.TELEGRAM_BOT_WEBHOOK_TOKEN || '';
const dbPoolProfile = process.env.DB_POOL_PROFILE || 'heavy';

const healthChecker = new HealthChecker('messaging-service');
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger('messaging-service'));
app.use(createForwardedIdentityGuard());
app.use(healthChecker.metricsMiddleware());

const { pushNotificationsEnabled, webpush, VAPID_PUBLIC_KEY } = push;

// Redis for pub/sub
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
const redisSub = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

healthChecker.registerCheck('database', () => checkDatabase(sequelize));
healthChecker.registerCheck('redis', () => checkRedis(redis));

// ── Helpers (presence, events, webhooks, email digest) ─────────────────────

const {
  setUserPresence, clearUserPresence, getUserPresence,
  publishEvent, triggerWebhooks, sendDigestEmail,
  startDigestScheduler, EVENT_STREAM_KEY
} = createHelpers({ redis, Webhook: models.Webhook, Notification: models.Notification, NotificationPreference: models.NotificationPreference, Op: models.Op });

startDigestScheduler();


// ── Socket.IO + Redis pub/sub ─────────────────────────────────────────────────
setupSocketHandlers({
  io, redisSub, redis,
  Message: models.Message,
  Conversation: models.Conversation,
  Subscription: models.Subscription,
  setUserPresence, clearUserPresence, publishEvent,
  webpush, pushNotificationsEnabled
});


// ── Mount all routes ──────────────────────────────────────────────────────────
mountRoutes(app, {
  models,
  io,
  redis,
  pushNotificationsEnabled,
  webpush,
  VAPID_PUBLIC_KEY,
  publishEvent,
  triggerWebhooks,
  getUserPresence,
  sendDigestEmail,
  EVENT_STREAM_KEY,
  BOT_SYSTEM_USER_ID,
  TELEGRAM_BOT_WEBHOOK_TOKEN,
  healthChecker,
  queryStatsMiddleware
});

// ensure tables exist when DB_SCHEMA_MODE=migrate skips sync during normal startup
async function ensureSchemaBootstrapIfMissing() {
  const qi = sequelize.getQueryInterface();
  const rawTables = await qi.showAllTables();
  const tableNames = new Set(
    rawTables.map((entry) => (typeof entry === 'string' ? entry : entry.tableName || entry)).filter(Boolean)
  );

  // recovery: migrations may have run while schema sync was skipped
  if (!tableNames.has('Notifications')) {
    logger.warn('Core schema tables missing; bootstrapping with sequelize.sync() for recovery.');
    await sequelize.sync();
  }
}

startServiceWithDatabase({
  serviceName: 'messaging-service',
  sequelize,
  beforeStart: async () => {
    await sequelize.authenticate();
    logger.info('Database connected');
    setupQueryMonitoring(sequelize, {
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '100', 10),
      n1Threshold: parseInt(process.env.N1_QUERY_THRESHOLD || '5', 10),
      enableStackTrace: process.env.NODE_ENV !== 'production'
    });
    monitorPoolHealth(sequelize, getPoolConfig(dbPoolProfile));
    await ensureSchemaBootstrapIfMissing();
  },
  start: () => new Promise((resolve) => {
    server.listen(PORT, () => {
      logStartup('messaging-service', PORT, { dbPoolProfile, socketIO: true });
      resolve();
    });
  }),
  onError: (error) => {
    logger.fatal({ err: error }, 'Database initialization failed');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logShutdown('messaging-service', 'SIGTERM received');
  server.close(() => {
    redis.disconnect();
    redisSub.disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logShutdown('messaging-service', 'SIGINT received');
  server.close(() => {
    redis.disconnect();
    redisSub.disconnect();
    process.exit(0);
  });
});
