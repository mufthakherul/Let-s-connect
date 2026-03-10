/**
 * Standardized API response wrapper
 * Aligns with Workstream D error envelope format
 */

/**
 * Success response wrapper
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {Object} meta - Additional metadata
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const success = (req, res, data, meta = {}, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        data,
        meta: {
            requestId: req.id || res.getHeader('X-Request-Id') || 'unknown',
            timestamp: new Date().toISOString(),
            ...meta
        }
    });
};

/**
 * Error response wrapper (use AppError classes instead when possible)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Error details
 */
const error = (req, res, code, message, statusCode = 500, details = null) => {
    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            details,
            trace: {
                requestId: req.id || res.getHeader('X-Request-Id') || 'unknown',
                timestamp: new Date().toISOString(),
                path: req.path,
                method: req.method
            }
        }
    });
};

/**
 * Paginated response helper
 */
const paginated = (req, res, data, pagination, meta = {}) => {
    return success(req, res, data, {
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages: Math.ceil(pagination.total / pagination.limit),
            hasMore: pagination.page * pagination.limit < pagination.total
        },
        ...meta
    });
};

/**
 * Legacy compatibility wrapper (deprecated)
 * @deprecated Use success() with req parameter
 */
const legacySuccess = (res, data, message = 'Success', statusCode = 200, meta = {}) => {
    return res.status(statusCode).json({
        success: true,
        timestamp: new Date().toISOString(),
        message,
        data,
        meta: {
            ...meta,
            requestId: res.getHeader('X-Request-Id') || 'unknown'
        }
    });
};

/**
 * Legacy compatibility wrapper (deprecated)
 * @deprecated Use error() with req parameter
 */
const legacyError = (res, message = 'Internal Server Error', statusCode = 500, data = null, meta = {}) => {
    return res.status(statusCode).json({
        success: false,
        timestamp: new Date().toISOString(),
        message,
        data,
        meta: {
            ...meta,
            requestId: res.getHeader('X-Request-Id') || 'unknown'
        }
    });
};

module.exports = {
    success,
    error,
    paginated,
    // Legacy exports for backward compatibility
    legacySuccess,
    legacyError
};
