const logger = require('./logger');
const response = require('./response-wrapper');

/**
 * Standardized Error class for operational errors
 */
class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
      }
    };
  }
}
// Specific error types
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource, identifier = null) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', { resource, identifier });
  }
}

class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter = 60) {
    super('Too many requests, please try again later', 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
    this.retryAfter = retryAfter;
  }
}

class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500, 'DATABASE_ERROR', originalError?.message);
    this.originalError = originalError;
  }
}

class ExternalServiceError extends AppError {
  constructor(service, message = 'External service unavailable') {
    super(message, 503, 'EXTERNAL_SERVICE_ERROR', { service });
  }
}

const logger = require('./logger');
const response = require('./response-wrapper');

/**
 * Standardized Global Error Treatment
 */
function errorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error with Pino
  logger.error({
    name: err.name,
    message: err.message,
    code: err.code,
    path: req.originalUrl,
    method: req.method,
    requestId: req.headers['x-request-id'] || res.getHeader('X-Request-Id'),
    stack: err.stack
  });

  // Development Response
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err
    });
  }

  // Handle Operational Errors
  if (err.isOperational) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle Common Library Errors
  if (err.name === 'SequelizeValidationError') {
    const details = err.errors.map(e => ({ field: e.path, message: e.message }));
    return response.error(res, 'Validation failed', 400, details, { code: 'VALIDATION_ERROR' });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'field';
    return response.error(res, `${field} already exists`, 409, { field }, { code: 'CONFLICT' });
  }

  if (err.name === 'JsonWebTokenError') {
    return response.error(res, 'Invalid authentication token', 401, null, { code: 'INVALID_TOKEN' });
  }

  if (err.name === 'TokenExpiredError') {
    return response.error(res, 'Authentication token has expired', 401, null, { code: 'TOKEN_EXPIRED' });
  }

  // Final generic fallback for production
  return response.error(res, 'An unexpected error occurred', 500, null, { code: 'INTERNAL_SERVER_ERROR' });
}

/**
 * Async handler wrapper to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation middleware factory
 */
function validate(schema, source = 'body') {
  return asyncHandler(async (req, res, next) => {
    try {
      const data = req[source];

      if (typeof schema === 'function') {
        await schema(data);
      } else if (schema.validate) {
        // Joi schema
        const { error } = schema.validate(data, { abortEarly: false });
        if (error) {
          const details = error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }));
          throw new ValidationError('Validation failed', details);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  });
}

/**
 * Authorization middleware factory
 */
function requireAuth(req, res, next) {
  const userId = req.header('x-user-id');
  if (!userId) {
    throw new AuthenticationError();
  }
  next();
}

function requireRole(...roles) {
  return asyncHandler(async (req, res, next) => {
    const userRole = req.header('x-user-role') || 'user';

    if (!roles.includes(userRole)) {
      throw new AuthorizationError(`Required role: ${roles.join(' or ')}`);
    }

    next();
  });
}

/**
 * Rate limiting middleware
 */
const rateLimitStore = new Map();

function rateLimit(options = {}) {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 60,
    keyGenerator = (req) => req.ip || req.header('x-forwarded-for')
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, []);
    }

    const requests = rateLimitStore.get(key);
    const recentRequests = requests.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      const oldestRequest = Math.min(...recentRequests);
      const retryAfter = Math.ceil((windowMs - (now - oldestRequest)) / 1000);

      res.setHeader('Retry-After', retryAfter);
      throw new RateLimitError(retryAfter);
    }

    recentRequests.push(now);
    rateLimitStore.set(key, recentRequests);

    // Cleanup old entries
    if (Math.random() < 0.01) {
      for (const [k, times] of rateLimitStore.entries()) {
        const validTimes = times.filter(time => now - time < windowMs);
        if (validTimes.length === 0) {
          rateLimitStore.delete(k);
        } else {
          rateLimitStore.set(k, validTimes);
        }
      }
    }

    next();
  };
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  errorHandler,
  asyncHandler,
  validate,
  requireAuth,
  requireRole,
  rateLimit
};
