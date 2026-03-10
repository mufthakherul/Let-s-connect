/**
 * Standardized Error Envelope and Trace Propagation
 * Workstream D1: Policy hardening
 * 
 * Provides:
 * - Consistent error response format across all gateway responses
 * - Request tracing with correlation IDs
 * - Error categorization and client-friendly messages
 * - Trace context propagation to downstream services
 */

const logger = require('../shared/logger');

/**
 * Error Categories
 * Standardized error types with HTTP status codes
 */
const ERROR_CATEGORIES = {
    // Client errors (4xx)
    VALIDATION_ERROR: {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        message: 'Request validation failed'
    },
    AUTHENTICATION_ERROR: {
        code: 'AUTHENTICATION_ERROR',
        statusCode: 401,
        message: 'Authentication required or invalid'
    },
    AUTHORIZATION_ERROR: {
        code: 'AUTHORIZATION_ERROR',
        statusCode: 403,
        message: 'Insufficient permissions'
    },
    NOT_FOUND: {
        code: 'NOT_FOUND',
        statusCode: 404,
        message: 'Resource not found'
    },
    CONFLICT: {
        code: 'CONFLICT',
        statusCode: 409,
        message: 'Resource conflict'
    },
    RATE_LIMIT_EXCEEDED: {
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        message: 'Rate limit exceeded'
    },

    // Server errors (5xx)
    INTERNAL_ERROR: {
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        message: 'Internal server error'
    },
    SERVICE_UNAVAILABLE: {
        code: 'SERVICE_UNAVAILABLE',
        statusCode: 503,
        message: 'Service temporarily unavailable'
    },
    GATEWAY_TIMEOUT: {
        code: 'GATEWAY_TIMEOUT',
        statusCode: 504,
        message: 'Gateway timeout'
    },
    CIRCUIT_OPEN: {
        code: 'CIRCUIT_OPEN',
        statusCode: 503,
        message: 'Service circuit breaker open'
    }
};

/**
 * Standardized Error Envelope
 * 
 * Format:
 * {
 *   success: false,
 *   error: {
 *     code: "ERROR_CODE",
 *     message: "Human readable message",
 *     details: [...],  // Optional: validation errors, etc.
 *     trace: {
 *       requestId: "uuid",
 *       timestamp: "ISO8601",
 *       path: "/api/path",
 *       method: "POST"
 *     }
 *   }
 * }
 */
class StandardError extends Error {
    constructor(category, details = null, originalError = null) {
        super(category.message);
        this.category = category;
        this.code = category.code;
        this.statusCode = category.statusCode;
        this.details = details;
        this.originalError = originalError;

        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Convert to error envelope
     */
    toEnvelope(req) {
        const envelope = {
            success: false,
            error: {
                code: this.code,
                message: this.message,
                trace: {
                    requestId: req?.id || 'unknown',
                    timestamp: new Date().toISOString(),
                    path: req?.originalUrl || req?.url || 'unknown',
                    method: req?.method || 'unknown'
                }
            }
        };

        // Add details if present (e.g., validation errors)
        if (this.details) {
            envelope.error.details = this.details;
        }

        // In development, add stack trace
        if (process.env.NODE_ENV !== 'production' && this.stack) {
            envelope.error.stack = this.stack;
        }

        return envelope;
    }
}

/**
 * Create standard error from category
 */
function createError(category, details = null, originalError = null) {
    return new StandardError(category, details, originalError);
}

/**
 * Error handler middleware
 * Converts all errors to standard envelopes
 */
function errorEnvelopeMiddleware(err, req, res, next) {
    let standardError;

    // If it's already a StandardError, use it
    if (err instanceof StandardError) {
        standardError = err;
    }
    // Map common errors to standard categories
    else if (err.name === 'ValidationError') {
        standardError = createError(ERROR_CATEGORIES.VALIDATION_ERROR, err.errors, err);
    }
    else if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
        standardError = createError(ERROR_CATEGORIES.AUTHENTICATION_ERROR, null, err);
    }
    else if (err.statusCode === 403) {
        standardError = createError(ERROR_CATEGORIES.AUTHORIZATION_ERROR, null, err);
    }
    else if (err.statusCode === 404) {
        standardError = createError(ERROR_CATEGORIES.NOT_FOUND, null, err);
    }
    else if (err.statusCode === 429) {
        standardError = createError(ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED, null, err);
    }
    else if (err.code === 'ETIMEDOUT' || err.statusCode === 504) {
        standardError = createError(ERROR_CATEGORIES.GATEWAY_TIMEOUT, null, err);
    }
    else if (err.code === 'ECONNREFUSED' || err.statusCode === 503) {
        standardError = createError(ERROR_CATEGORIES.SERVICE_UNAVAILABLE, null, err);
    }
    else if (err.message?.includes('circuit breaker')) {
        standardError = createError(ERROR_CATEGORIES.CIRCUIT_OPEN, null, err);
    }
    // Default to internal error
    else {
        standardError = createError(ERROR_CATEGORIES.INTERNAL_ERROR, null, err);
    }

    // Log error with trace context
    logger.error('Gateway error occurred', {
        requestId: req.id,
        path: req.originalUrl || req.url,
        method: req.method,
        statusCode: standardError.statusCode,
        errorCode: standardError.code,
        message: standardError.message,
        details: standardError.details,
        originalError: standardError.originalError?.message,
        stack: standardError.stack
    });

    // Send error envelope
    const envelope = standardError.toEnvelope(req);
    res.status(standardError.statusCode).json(envelope);
}

/**
 * Success response wrapper
 * Standardized success format
 * 
 * Format:
 * {
 *   success: true,
 *   data: {...},
 *   meta: {
 *     requestId: "uuid",
 *     timestamp: "ISO8601"
 *   }
 * }
 */
function successEnvelope(req, data, meta = {}) {
    return {
        success: true,
        data,
        meta: {
            requestId: req?.id || 'unknown',
            timestamp: new Date().toISOString(),
            ...meta
        }
    };
}

/**
 * Trace Context Propagation
 * Ensures request IDs flow through the system
 */

/**
 * Generate trace context for request
 */
function generateTraceContext(req) {
    const requestId = req.headers['x-request-id'] ||
        req.id ||
        require('uuid').v4();

    const parentSpanId = req.headers['x-parent-span-id'] || null;
    const traceId = req.headers['x-trace-id'] || requestId;

    return {
        requestId,
        traceId,
        parentSpanId,
        timestamp: Date.now(),
        path: req.originalUrl || req.url,
        method: req.method,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
    };
}

/**
 * Attach trace context to request
 */
function traceContextMiddleware(req, res, next) {
    const traceContext = generateTraceContext(req);

    // Attach to request object
    req.traceContext = traceContext;
    req.id = traceContext.requestId;

    // Set response headers for client-side tracing
    res.setHeader('X-Request-Id', traceContext.requestId);
    res.setHeader('X-Trace-Id', traceContext.traceId);

    // Log request start
    logger.info('Gateway request received', {
        requestId: traceContext.requestId,
        traceId: traceContext.traceId,
        path: traceContext.path,
        method: traceContext.method,
        ip: traceContext.ip,
        userAgent: traceContext.userAgent
    });

    // Track request timing
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;

        // Log request completion
        logger.info('Gateway request completed', {
            requestId: traceContext.requestId,
            traceId: traceContext.traceId,
            path: traceContext.path,
            method: traceContext.method,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
    });

    next();
}

/**
 * Propagate trace headers to downstream services
 * Used in proxy configuration
 */
function getTraceHeaders(req) {
    const traceContext = req.traceContext || {};

    return {
        'x-request-id': traceContext.requestId || req.id,
        'x-trace-id': traceContext.traceId || req.id,
        'x-parent-span-id': traceContext.requestId || req.id,
        'x-forwarded-for': req.ip || req.connection.remoteAddress,
        'x-forwarded-proto': req.protocol,
        'x-forwarded-host': req.hostname
    };
}

/**
 * Validation error helper
 * Creates standardized validation error with field details
 */
function validationError(fields) {
    const details = fields.map(field => ({
        field: field.field || field.path,
        message: field.message,
        value: field.value,
        constraint: field.constraint || field.type
    }));

    return createError(ERROR_CATEGORIES.VALIDATION_ERROR, details);
}

/**
 * Rate limit error helper
 */
function rateLimitError(retryAfter) {
    const details = {
        retryAfter: retryAfter || 60,
        message: `Rate limit exceeded. Retry after ${retryAfter || 60} seconds.`
    };

    return createError(ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED, details);
}

module.exports = {
    ERROR_CATEGORIES,
    StandardError,
    createError,
    errorEnvelopeMiddleware,
    successEnvelope,
    traceContextMiddleware,
    getTraceHeaders,
    generateTraceContext,
    validationError,
    rateLimitError
};
