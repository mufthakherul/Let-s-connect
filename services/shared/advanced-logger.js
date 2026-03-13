/**
 * Advanced Logging System for Milonexa Platform
 *
 * Features:
 * - Structured JSON logging with pino
 * - Request ID tracking across services
 * - Performance metrics and timing
 * - Error stack traces with context
 * - Log levels: trace, debug, info, warn, error, fatal
 * - Pretty printing in development
 * - JSON output in production
 * - Correlation IDs for distributed tracing
 * - Automatic PII redaction
 * - Performance monitoring
 */

const pino = require('pino');
const path = require('path');

// Determine environment
const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

// Sensitive fields to redact
const REDACT_PATHS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.secret'
];

/**
 * Create service-specific logger
 * @param {string} serviceName - Name of the service
 * @param {object} options - Additional logger options
 * @returns {object} Pino logger instance
 */
function createLogger(serviceName = 'milonexa', options = {}) {
  const config = {
    name: serviceName,
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

    // Redact sensitive information
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]'
    },

    // Format timestamps
    timestamp: pino.stdTimeFunctions.isoTime,

    // Custom formatters
    formatters: {
      level: (label) => ({ level: label.toUpperCase() }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        host: bindings.hostname,
        service: serviceName
      })
    },

    // Serializers for common objects
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        path: req.path,
        params: req.params,
        query: req.query,
        remoteAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
        correlationId: req.headers['x-correlation-id'] || req.id
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        responseTime: res.responseTime
      }),
      err: pino.stdSerializers.err
    },

    // Base fields to include in every log
    base: {
      env: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      service: serviceName
    },

    // Pretty print in development
    ...(isDevelopment && !isTest ? {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: false,
          messageFormat: '{service} [{level}] {msg}',
          customPrettifiers: {
            time: timestamp => `🕐 ${timestamp}`,
            level: level => {
              const levels = {
                TRACE: '🔍',
                DEBUG: '🐛',
                INFO: 'ℹ️',
                WARN: '⚠️',
                ERROR: '❌',
                FATAL: '💀'
              };
              return `${levels[level] || '📝'} ${level}`;
            }
          }
        }
      }
    } : {}),

    ...options
  };

  const logger = pino(config);

  // Add custom methods
  logger.performance = function(label, startTime) {
    const duration = Date.now() - startTime;
    this.info({ duration, label }, `Performance: ${label} took ${duration}ms`);
  };

  logger.audit = function(action, details) {
    this.info({
      audit: true,
      action,
      ...details
    }, `Audit: ${action}`);
  };

  logger.security = function(event, details) {
    this.warn({
      security: true,
      event,
      ...details
    }, `Security: ${event}`);
  };

  logger.apiCall = function(method, url, duration, statusCode) {
    this.info({
      apiCall: true,
      method,
      url,
      duration,
      statusCode
    }, `API: ${method} ${url} - ${statusCode} (${duration}ms)`);
  };

  logger.database = function(operation, table, duration) {
    this.debug({
      database: true,
      operation,
      table,
      duration
    }, `DB: ${operation} on ${table} (${duration}ms)`);
  };

  return logger;
}

/**
 * Express middleware for request logging
 */
function requestLogger(serviceName) {
  const logger = createLogger(serviceName);

  return (req, res, next) => {
    const startTime = Date.now();

    // Generate request ID if not exists
    req.id = req.id || req.headers['x-request-id'] || generateRequestId();

    // Add request ID to response headers
    res.setHeader('X-Request-ID', req.id);

    // Create child logger with request context
    req.log = logger.child({
      requestId: req.id,
      correlationId: req.headers['x-correlation-id'] || req.id
    });

    // Log request
    req.log.info({ req }, 'Incoming request');

    // Capture response
    const originalSend = res.send;
    res.send = function(data) {
      res.responseTime = Date.now() - startTime;
      res.send = originalSend;
      return res.send(data);
    };

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      req.log[level]({
        res,
        duration,
        statusCode: res.statusCode
      }, `Request completed - ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
    });

    next();
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Error logging middleware
 */
function errorLogger(serviceName) {
  const logger = createLogger(serviceName);

  return (err, req, res, next) => {
    const log = req.log || logger;

    log.error({
      err,
      req,
      errorType: err.constructor.name,
      stack: err.stack
    }, err.message);

    next(err);
  };
}

/**
 * Log application startup
 */
function logStartup(serviceName, port, options = {}) {
  const logger = createLogger(serviceName);

  logger.info({
    port,
    env: process.env.NODE_ENV,
    ...options
  }, `🚀 ${serviceName} started on port ${port}`);
}

/**
 * Log graceful shutdown
 */
function logShutdown(serviceName, reason) {
  const logger = createLogger(serviceName);

  logger.info({ reason }, `👋 ${serviceName} shutting down: ${reason}`);
}

module.exports = {
  createLogger,
  requestLogger,
  errorLogger,
  logStartup,
  logShutdown,
  generateRequestId
};
