/**
 * Enhanced Logging Utilities
 * Phase 2 - Observability expansion
 * 
 * Provides structured logging enhancements:
 * - Request/response correlation
 * - Performance timing
 * - Error serialization
 * - Distributed tracing context
 */

const logger = require('./logger');

/**
 * Create a child logger with request context
 * @param {Object} req - Express request object
 * @param {string} serviceName - Name of the service
 */
function createRequestLogger(req, serviceName) {
  const requestContext = {
    requestId: req.id || req.headers['x-request-id'],
    service: serviceName,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  };

  // Add user context if authenticated
  if (req.user) {
    requestContext.userId = req.user.id;
    requestContext.username = req.user.username;
  }

  return logger.child(requestContext);
}

/**
 * Log request start with context
 */
function logRequestStart(req, serviceName) {
  const reqLogger = createRequestLogger(req, serviceName);
  
  reqLogger.info({
    event: 'request.start',
    query: req.query,
    bodySize: req.headers['content-length'] || 0
  }, `${req.method} ${req.path} started`);

  return reqLogger;
}

/**
 * Log request completion with timing
 */
function logRequestComplete(reqLogger, req, res, startTime) {
  const duration = Date.now() - startTime;
  
  reqLogger.info({
    event: 'request.complete',
    statusCode: res.statusCode,
    duration,
    responseSize: res.getHeader('content-length') || 0
  }, `${req.method} ${req.path} completed in ${duration}ms`);
}

/**
 * Log request error
 */
function logRequestError(reqLogger, req, error, startTime) {
  const duration = startTime ? Date.now() - startTime : 0;
  
  reqLogger.error({
    event: 'request.error',
    error: {
      message: error.message,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
    duration
  }, `${req.method} ${req.path} failed: ${error.message}`);
}

/**
 * Express middleware for request/response logging
 */
function requestLoggingMiddleware(serviceName) {
  return (req, res, next) => {
    const startTime = Date.now();
    const reqLogger = logRequestStart(req, serviceName);
    
    // Attach logger to request for use in route handlers
    req.log = reqLogger;

    // Log on response finish
    res.on('finish', () => {
      logRequestComplete(reqLogger, req, res, startTime);
    });

    // Log on response error
    res.on('error', (err) => {
      logRequestError(reqLogger, req, err, startTime);
    });

    next();
  };
}

/**
 * Log database query with timing
 */
function logDatabaseQuery(logger, operation, query, duration) {
  logger.info({
    event: 'database.query',
    operation,
    query: process.env.LOG_QUERIES === 'true' ? query : undefined,
    duration
  }, `Database ${operation} completed in ${duration}ms`);
}

/**
 * Log cache operation
 */
function logCacheOperation(logger, operation, key, hit, duration) {
  logger.info({
    event: 'cache.operation',
    operation,
    key,
    hit,
    duration
  }, `Cache ${operation} ${hit ? 'HIT' : 'MISS'} for ${key} (${duration}ms)`);
}

/**
 * Log external API call
 */
function logExternalApiCall(logger, service, endpoint, method, statusCode, duration) {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  
  logger[level]({
    event: 'external.api.call',
    service,
    endpoint,
    method,
    statusCode,
    duration
  }, `External API call to ${service} ${endpoint} returned ${statusCode} (${duration}ms)`);
}

/**
 * Log business event (for analytics/auditing)
 */
function logBusinessEvent(logger, eventType, eventData) {
  logger.info({
    event: 'business.event',
    eventType,
    ...eventData
  }, `Business event: ${eventType}`);
}

/**
 * Log security event
 */
function logSecurityEvent(logger, eventType, details) {
  logger.warn({
    event: 'security.event',
    eventType,
    ...details
  }, `Security event: ${eventType}`);
}

/**
 * Create a timer for performance measurement
 */
function createTimer(logger, operation) {
  const startTime = Date.now();
  
  return {
    end: (metadata = {}) => {
      const duration = Date.now() - startTime;
      
      logger.info({
        event: 'performance.timer',
        operation,
        duration,
        ...metadata
      }, `${operation} completed in ${duration}ms`);
      
      return duration;
    }
  };
}

/**
 * Log health check result
 */
function logHealthCheck(logger, checkName, healthy, duration, details) {
  const level = healthy ? 'info' : 'error';
  
  logger[level]({
    event: 'health.check',
    check: checkName,
    healthy,
    duration,
    ...details
  }, `Health check ${checkName}: ${healthy ? 'PASS' : 'FAIL'} (${duration}ms)`);
}

/**
 * Log circuit breaker state change
 */
function logCircuitBreakerStateChange(logger, serviceName, oldState, newState, reason) {
  logger.warn({
    event: 'circuit.breaker.state.change',
    service: serviceName,
    oldState,
    newState,
    reason
  }, `Circuit breaker for ${serviceName}: ${oldState} -> ${newState}`);
}

/**
 * Sanitize sensitive data from logs
 */
function sanitizeForLogging(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'accessToken',
    'refreshToken',
    'authorization',
    'cookie',
    'sessionId'
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

module.exports = {
  createRequestLogger,
  logRequestStart,
  logRequestComplete,
  logRequestError,
  requestLoggingMiddleware,
  logDatabaseQuery,
  logCacheOperation,
  logExternalApiCall,
  logBusinessEvent,
  logSecurityEvent,
  createTimer,
  logHealthCheck,
  logCircuitBreakerStateChange,
  sanitizeForLogging
};
