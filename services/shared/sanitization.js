/**
 * Input Sanitization Utilities
 * Workstream E3: Security standards
 * 
 * Provides sanitization for text inputs, HTML, SQL, and other user-provided data
 * Prevents XSS, SQL injection, and other injection attacks
 */

const sanitizeHtml = require('sanitize-html');
const validator = require('validator');

/**
 * Default HTML sanitization config (strict)
 */
const DEFAULT_HTML_CONFIG = {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
};

/**
 * Rich text HTML sanitization config (allows safe formatting)
 */
const RICH_TEXT_CONFIG = {
    allowedTags: [
        'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'a', 'blockquote'
    ],
    allowedAttributes: {
        'a': ['href', 'title', 'target'],
        '*': ['class']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
        a: ['http', 'https', 'mailto']
    },
    transformTags: {
        'a': (tagName, attribs) => {
            // Force external links to open in new tab
            return {
                tagName: 'a',
                attribs: {
                    ...attribs,
                    rel: 'noopener noreferrer',
                    target: '_blank'
                }
            };
        }
    }
};

/**
 * Sanitize plain text (remove all HTML)
 */
function sanitizeText(input, options = {}) {
    if (typeof input !== 'string') {
        return '';
    }

    const {
        maxLength = null,
        trim = true,
        lowercase = false
    } = options;

    // Remove all HTML tags
    let sanitized = sanitizeHtml(input, DEFAULT_HTML_CONFIG);

    // HTML entity decode
    sanitized = validator.unescape(sanitized);

    // Trim whitespace
    if (trim) {
        sanitized = sanitized.trim();
    }

    // Convert to lowercase
    if (lowercase) {
        sanitized = sanitized.toLowerCase();
    }

    // Truncate to max length
    if (maxLength && sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
}

/**
 * Sanitize rich text HTML (allows safe formatting tags)
 */
function sanitizeRichText(input, options = {}) {
    if (typeof input !== 'string') {
        return '';
    }

    const config = { ...RICH_TEXT_CONFIG, ...options };
    return sanitizeHtml(input, config);
}

/**
 * Sanitize email address
 */
function sanitizeEmail(input) {
    if (typeof input !== 'string') {
        return '';
    }

    const email = input.trim().toLowerCase();
    return validator.isEmail(email) ? validator.normalizeEmail(email) : '';
}

/**
 * Sanitize URL
 */
function sanitizeUrl(input, options = {}) {
    if (typeof input !== 'string') {
        return '';
    }

    const {
        allowedProtocols = ['http', 'https'],
        requireProtocol = true
    } = options;

    let url = input.trim();

    // Check if URL is valid
    if (!validator.isURL(url, { require_protocol: requireProtocol })) {
        return '';
    }

    // Check protocol
    if (allowedProtocols.length > 0) {
        const hasAllowedProtocol = allowedProtocols.some(protocol =>
            url.toLowerCase().startsWith(protocol + '://')
        );

        if (!hasAllowedProtocol) {
            return '';
        }
    }

    return url;
}

/**
 * Sanitize filename (remove path traversal and dangerous chars)
 */
function sanitizeFilename(input) {
    if (typeof input !== 'string') {
        return '';
    }

    // Remove path separators and special chars
    return input
        .replace(/[\/\\]/g, '')           // Remove path separators
        .replace(/\.\./g, '')             // Remove parent directory refs
        .replace(/[<>:"|?*\x00-\x1f]/g, '') // Remove dangerous chars
        .trim()
        .substring(0, 255);               // Limit length
}

/**
 * Sanitize SQL identifier (table/column names)
 * NOTE: Use parameterized queries instead when possible
 */
function sanitizeSqlIdentifier(input) {
    if (typeof input !== 'string') {
        return '';
    }

    // Only allow alphanumeric and underscore
    return input.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 64);
}

/**
 * Sanitize phone number
 */
function sanitizePhoneNumber(input) {
    if (typeof input !== 'string') {
        return '';
    }

    // Remove all non-numeric chars except + at the start
    const sanitized = input.trim().replace(/[^\d+]/g, '');

    // Ensure + only at the start
    if (sanitized.startsWith('+')) {
        return '+' + sanitized.substring(1).replace(/\+/g, '');
    }

    return sanitized.replace(/\+/g, '');
}

/**
 * Sanitize JSON input (parse and re-stringify to remove dangerous content)
 */
function sanitizeJson(input) {
    try {
        if (typeof input === 'string') {
            const parsed = JSON.parse(input);
            return JSON.stringify(parsed);
        }
        return JSON.stringify(input);
    } catch (error) {
        return null;
    }
}

/**
 * Sanitize multiple fields in an object
 */
function sanitizeFields(obj, fieldMap) {
    if (typeof obj !== 'object' || obj === null) {
        return {};
    }

    const sanitized = { ...obj };

    for (const [field, sanitizer] of Object.entries(fieldMap)) {
        if (field in sanitized) {
            if (typeof sanitizer === 'function') {
                sanitized[field] = sanitizer(sanitized[field]);
            } else if (sanitizer === 'text') {
                sanitized[field] = sanitizeText(sanitized[field]);
            } else if (sanitizer === 'richText') {
                sanitized[field] = sanitizeRichText(sanitized[field]);
            } else if (sanitizer === 'email') {
                sanitized[field] = sanitizeEmail(sanitized[field]);
            } else if (sanitizer === 'url') {
                sanitized[field] = sanitizeUrl(sanitized[field]);
            } else if (sanitizer === 'filename') {
                sanitized[field] = sanitizeFilename(sanitized[field]);
            } else if (sanitizer === 'phone') {
                sanitized[field] = sanitizePhoneNumber(sanitized[field]);
            }
        }
    }

    return sanitized;
}

/**
 * Create sanitization middleware
 */
function createSanitizationMiddleware(fieldMap) {
    return (req, res, next) => {
        if (req.body && Object.keys(fieldMap).length > 0) {
            req.body = sanitizeFields(req.body, fieldMap);
        }
        next();
    };
}

/**
 * Detect potential XSS in string
 */
function detectXss(input) {
    if (typeof input !== 'string') {
        return false;
    }

    const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe/gi,
        /<object/gi,
        /<embed/gi,
        /eval\(/gi
    ];

    return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Detect potential SQL injection
 */
function detectSqlInjection(input) {
    if (typeof input !== 'string') {
        return false;
    }

    const sqlPatterns = [
        /(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute)(\s|$)/gi,
        /;.*(-{2}|\/\*)/gi,
        /'\s*(or|and)\s*'?1'?\s*=\s*'?1/gi,
        /--/g,
        /\/\*/g
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Security audit middleware - logs suspicious input
 */
function securityAuditMiddleware(logger) {
    return (req, res, next) => {
        const checkInput = (input, path) => {
            if (typeof input === 'string') {
                if (detectXss(input)) {
                    logger.warn('Potential XSS detected', {
                        path,
                        userId: req.user?.id,
                        ip: req.ip,
                        requestId: req.id
                    });
                }

                if (detectSqlInjection(input)) {
                    logger.warn('Potential SQL injection detected', {
                        path,
                        userId: req.user?.id,
                        ip: req.ip,
                        requestId: req.id
                    });
                }
            } else if (typeof input === 'object' && input !== null) {
                for (const [key, value] of Object.entries(input)) {
                    checkInput(value, `${path}.${key}`);
                }
            }
        };

        if (req.body) {
            checkInput(req.body, 'body');
        }
        if (req.query) {
            checkInput(req.query, 'query');
        }

        next();
    };
}

module.exports = {
    sanitizeText,
    sanitizeRichText,
    sanitizeEmail,
    sanitizeUrl,
    sanitizeFilename,
    sanitizeSqlIdentifier,
    sanitizePhoneNumber,
    sanitizeJson,
    sanitizeFields,
    createSanitizationMiddleware,
    detectXss,
    detectSqlInjection,
    securityAuditMiddleware,
    DEFAULT_HTML_CONFIG,
    RICH_TEXT_CONFIG
};
