'use strict';

/**
 * Assembles all sub-routers, mounts them on the Express app,
 * and adds health, metrics, debug, root, and 404 routes.
 *
 * Usage: require('./routes')(app, deps)
 */
const createMessagesRouter = require('./messages');
const createConversationsRouter = require('./conversations');
const createChannelsRouter = require('./channels');
const createBotRouter = require('./bot');
const BotService = require('../lib/bot-service');

module.exports = function mountRoutes(app, deps) {
  const {
    models, io, redis,
    pushNotificationsEnabled, webpush, VAPID_PUBLIC_KEY,
    publishEvent, triggerWebhooks, getUserPresence, sendDigestEmail,
    EVENT_STREAM_KEY, BOT_SYSTEM_USER_ID, TELEGRAM_BOT_WEBHOOK_TOKEN,
    healthChecker, queryStatsMiddleware
  } = deps;

  // ── Initialize Bot Service ─────────────────────────────────────────────────
  const botService = new BotService({
    models,
    io,
    redis,
    publishEvent,
    BOT_SYSTEM_USER_ID
  });

  // Store botService reference for use in routes
  app.locals.botService = botService;

  // ── Health & Observability ─────────────────────────────────────────────────

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

  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_QUERY_DEBUG_ENDPOINT === 'true') {
    app.get('/debug/query-stats', queryStatsMiddleware);
  }

  // ── Feature Routes ─────────────────────────────────────────────────────────

  app.use(createMessagesRouter({ models, io, redis, pushNotificationsEnabled, webpush, VAPID_PUBLIC_KEY, botService }));
  app.use(createConversationsRouter({ models, io }));
  app.use(createChannelsRouter({
    models, io, redis,
    publishEvent, triggerWebhooks, getUserPresence, sendDigestEmail,
    EVENT_STREAM_KEY, BOT_SYSTEM_USER_ID, TELEGRAM_BOT_WEBHOOK_TOKEN
  }));
  app.use('/bot', createBotRouter({ botService, models }));

  // ── Root & Fallback ────────────────────────────────────────────────────────

  app.get('/', (req, res) => {
    res.status(200).json({ success: true, service: 'messaging-service', message: 'Messaging service is running.', health: '/health' });
  });

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'ROUTE_NOT_FOUND', message: `The requested endpoint '${req.originalUrl}' does not exist.` }
    });
  });
};
