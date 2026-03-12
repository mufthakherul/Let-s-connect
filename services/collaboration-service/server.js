'use strict';

const express = require('express');
const { Sequelize } = require('sequelize');
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const { createForwardedIdentityGuard } = require('../shared/security-utils');
const { startServiceWithDatabase } = require('../shared/startup');
const { HealthChecker, checkDatabase, checkRedis } = require('../shared/monitoring');
const { setupQueryMonitoring, queryStatsMiddleware } = require('../shared/query-monitor');
const { getPoolConfig, monitorPoolHealth } = require('../shared/pool-config');
const initModels = require('./models');
const createHelpers = require('./lib/helpers');
const setupRoutes = require('./routes');
require('dotenv').config({ quiet: true });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

const PORT = process.env.PORT || 8004;
const dbPoolProfile = process.env.DB_POOL_PROFILE || 'heavy';
const healthChecker = new HealthChecker('collaboration-service');

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/collaboration',
  {
    dialect: 'postgres',
    logging: false,
    ...getPoolConfig(dbPoolProfile)
  }
);

healthChecker.registerCheck('database', () => checkDatabase(sequelize));
healthChecker.registerCheck('redis', () => checkRedis(redis));

app.use(express.json());
app.use(createForwardedIdentityGuard());
app.use(healthChecker.metricsMiddleware());

// Health / metrics endpoints
app.get('/health', (req, res) => {
  res.json(healthChecker.getBasicHealth());
});

app.get('/health/ready', async (req, res) => {
  try {
    const health = await healthChecker.runChecks();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(healthChecker.getPrometheusMetrics());
});

// Initialise models and helpers, then mount all route modules
const models = initModels(sequelize);
const helpers = createHelpers(models);
setupRoutes(app, { models, redis, helpers, io });

// Friendly root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'collaboration-service',
    message: 'Collaboration service is running.',
    health: '/health'
  });
});

if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_QUERY_DEBUG_ENDPOINT === 'true') {
  app.get('/debug/query-stats', queryStatsMiddleware);
}

// 404 fallback
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint '${req.originalUrl}' does not exist.`
    }
  });
});

// ============================================================================
// WebSocket Handlers for Real-time Collaboration
// ============================================================================

const { CollaborativeSession, CollaborativeOperation, UserPresence } = models;

const documentSockets = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-document', async (data) => {
    try {
      const { documentId, userId, userName } = data;

      if (!documentId || !userId) {
        socket.emit('error', { message: 'documentId and userId are required' });
        return;
      }

      socket.join(documentId);

      if (!documentSockets.has(documentId)) {
        documentSockets.set(documentId, new Set());
      }
      documentSockets.get(documentId).add(socket.id);

      let session = await CollaborativeSession.findOne({ where: { documentId } });
      if (!session) {
        session = await CollaborativeSession.create({
          documentId,
          activeUsers: [userId]
        });
      } else if (!session.activeUsers.includes(userId)) {
        session.activeUsers = [...session.activeUsers, userId];
        await session.save();
      }

      const color = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
      await UserPresence.create({
        sessionId: session.id,
        userId,
        color,
        cursorPosition: 0
      });

      socket.to(documentId).emit('user-joined', {
        userId,
        userName,
        color,
        timestamp: new Date()
      });

      const presences = await UserPresence.findAll({
        where: { sessionId: session.id }
      });

      socket.emit('session-joined', {
        sessionId: session.id,
        activeUsers: session.activeUsers,
        presences,
        currentRevision: session.operationCount
      });

      console.log(`User ${userId} joined document ${documentId}`);
    } catch (error) {
      console.error('Error joining document:', error);
      socket.emit('error', { message: 'Failed to join document' });
    }
  });

  socket.on('operation', async (data) => {
    try {
      const { documentId, userId, operation, baseRevision } = data;

      const session = await CollaborativeSession.findOne({ where: { documentId } });
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      const appliedRevision = session.operationCount + 1;

      await CollaborativeOperation.create({
        sessionId: session.id,
        userId,
        operationType: operation.type,
        position: operation.position,
        content: operation.content,
        length: operation.length,
        attributes: operation.attributes,
        baseRevision,
        appliedRevision
      });

      session.operationCount = appliedRevision;
      session.lastActivity = new Date();
      await session.save();

      socket.to(documentId).emit('operation', {
        userId,
        operation,
        revision: appliedRevision,
        timestamp: new Date()
      });

      socket.emit('operation-ack', {
        revision: appliedRevision,
        baseRevision
      });
    } catch (error) {
      console.error('Error processing operation:', error);
      socket.emit('error', { message: 'Failed to process operation' });
    }
  });

  socket.on('cursor-update', async (data) => {
    try {
      const { documentId, userId, cursorPosition, selectionStart, selectionEnd } = data;

      const session = await CollaborativeSession.findOne({ where: { documentId } });
      if (!session) {
        return;
      }

      await UserPresence.update(
        {
          cursorPosition,
          selectionStart,
          selectionEnd,
          lastSeen: new Date()
        },
        {
          where: { sessionId: session.id, userId }
        }
      );

      socket.to(documentId).emit('cursor-update', {
        userId,
        cursorPosition,
        selectionStart,
        selectionEnd,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error updating cursor:', error);
    }
  });

  socket.on('leave-document', async (data) => {
    try {
      const { documentId, userId } = data;

      socket.leave(documentId);

      if (documentSockets.has(documentId)) {
        documentSockets.get(documentId).delete(socket.id);
        if (documentSockets.get(documentId).size === 0) {
          documentSockets.delete(documentId);
        }
      }

      const session = await CollaborativeSession.findOne({ where: { documentId } });
      if (session) {
        session.activeUsers = session.activeUsers.filter(id => id !== userId);
        await session.save();

        await UserPresence.destroy({
          where: { sessionId: session.id, userId }
        });

        socket.to(documentId).emit('user-left', {
          userId,
          timestamp: new Date()
        });

        if (session.activeUsers.length === 0) {
          await session.destroy();
        }
      }

      console.log(`User ${userId} left document ${documentId}`);
    } catch (error) {
      console.error('Error leaving document:', error);
    }
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);

    for (const [documentId, sockets] of documentSockets.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          documentSockets.delete(documentId);
        }

        socket.to(documentId).emit('user-disconnected', {
          socketId: socket.id,
          timestamp: new Date()
        });
      }
    }
  });
});

// ============================================================================
// Bootstrap & Start
// ============================================================================

async function ensureSchemaBootstrapIfMissing() {
  const qi = sequelize.getQueryInterface();
  const rawTables = await qi.showAllTables();
  const tableNames = new Set(
    rawTables.map((entry) => (typeof entry === 'string' ? entry : entry.tableName || entry)).filter(Boolean)
  );

  const hasCoreTables = tableNames.has('Documents') && tableNames.has('Wikis');
  if (!hasCoreTables) {
    console.warn('[Collaboration Service] Core schema tables missing; bootstrapping with sequelize.sync() for recovery.');
    await sequelize.sync();
  }
}

startServiceWithDatabase({
  serviceName: 'collaboration-service',
  sequelize,
  beforeStart: async () => {
    await sequelize.authenticate();
    console.log('[Collaboration Service] Database connected.');
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
      console.log(`Collaboration service running on port ${PORT}`);
      resolve();
    });
  }),
  onError: (error) => {
    console.error('Database initialization failed:', error);
  }
});
