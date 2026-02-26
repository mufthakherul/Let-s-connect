/**
 * Standardized API response wrapper
 */
const sendResponse = (res, statusCode, success, data = null, message = null, meta = {}) => {
    return res.status(statusCode).json({
        success,
        timestamp: new Date().toISOString(),
        message,
        data,
        meta: {
            ...meta,
            requestId: res.getHeader('X-Request-Id') || 'unknown'
        }
    });
};

const success = (res, data, message = 'Success', statusCode = 200, meta = {}) => {
    return sendResponse(res, statusCode, true, data, message, meta);
};

const error = (res, message = 'Internal Server Error', statusCode = 500, data = null, meta = {}) => {
    return sendResponse(res, statusCode, false, data, message, meta);
};

module.exports = {
    success,
    error
};
