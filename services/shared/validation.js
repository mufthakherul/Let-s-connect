/**
 * Request Schema Validation Middleware
 * Workstream E1: Service blueprint standard
 * 
 * Provides Joi-based request validation with standardized error responses
 */

const Joi = require('joi');
const { ValidationError } = require('./errorHandling');

/**
 * Joi validation options
 */
const DEFAULT_OPTIONS = {
    abortEarly: false,      // Return all errors, not just the first one
    allowUnknown: false,    // Don't allow properties not in schema
    stripUnknown: false,    // Don't strip unknown properties
    errors: {
        wrap: {
            label: ''           // Don't wrap field names in quotes
        }
    }
};

/**
 * Common Joi schemas for reuse
 */
const commonSchemas = {
    id: Joi.string().uuid().required().messages({
        'string.guid': 'Invalid ID format',
        'any.required': 'ID is required'
    }),

    email: Joi.string().email().lowercase().trim().required().messages({
        'string.email': 'Invalid email format',
        'any.required': 'Email is required'
    }),

    password: Joi.string().min(8).max(128).required().messages({
        'string.min': 'Password must be at least 8 characters',
        'string.max': 'Password cannot exceed 128 characters',
        'any.required': 'Password is required'
    }),

    username: Joi.string().alphanum().min(3).max(30).lowercase().trim().required().messages({
        'string.alphanum': 'Username must contain only letters and numbers',
        'string.min': 'Username must be at least 3 characters',
        'string.max': 'Username cannot exceed 30 characters',
        'any.required': 'Username is required'
    }),

    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sort: Joi.string().valid('asc', 'desc').default('desc'),
        sortBy: Joi.string().default('createdAt')
    }),

    timestamp: Joi.date().iso(),

    url: Joi.string().uri().messages({
        'string.uri': 'Invalid URL format'
    }),

    phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).messages({
        'string.pattern.base': 'Invalid phone number format'
    })
};

/**
 * Validate request against Joi schema
 * @param {Object} schema - Joi schema object with body, query, params keys
 * @param {Object} options - Validation options
 */
function validate(schema, options = {}) {
    const validationOptions = { ...DEFAULT_OPTIONS, ...options };

    return (req, res, next) => {
        const toValidate = {};

        // Build object to validate
        if (schema.body && req.body) {
            toValidate.body = req.body;
        }
        if (schema.query && req.query) {
            toValidate.query = req.query;
        }
        if (schema.params && req.params) {
            toValidate.params = req.params;
        }
        if (schema.headers && req.headers) {
            toValidate.headers = req.headers;
        }

        // Create combined schema
        const combinedSchema = Joi.object(schema).unknown(true);

        // Validate
        const { error, value } = combinedSchema.validate(toValidate, validationOptions);

        if (error) {
            // Format validation errors
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                type: detail.type
            }));

            throw new ValidationError('Request validation failed', details);
        }

        // Replace request data with validated/sanitized values
        if (value.body) req.body = value.body;
        if (value.query) req.query = value.query;
        if (value.params) req.params = value.params;

        next();
    };
}

/**
 * Quick validation helpers for common cases
 */
const validators = {
    /**
     * Validate UUID param
     */
    idParam: (paramName = 'id') => validate({
        params: Joi.object({
            [paramName]: commonSchemas.id
        })
    }),

    /**
     * Validate pagination query params
     */
    pagination: () => validate({
        query: commonSchemas.pagination
    }),

    /**
     * Validate user registration
     */
    userRegistration: () => validate({
        body: Joi.object({
            username: commonSchemas.username,
            email: commonSchemas.email,
            password: commonSchemas.password,
            firstName: Joi.string().min(1).max(50).trim(),
            lastName: Joi.string().min(1).max(50).trim()
        })
    }),

    /**
     * Validate user login
     */
    userLogin: () => validate({
        body: Joi.object({
            email: commonSchemas.email,
            password: Joi.string().required().messages({
                'any.required': 'Password is required'
            })
        })
    }),

    /**
     * Validate email-only requests
     */
    emailOnly: () => validate({
        body: Joi.object({
            email: commonSchemas.email
        })
    })
};

/**
 * Validate array of items against schema
 */
function validateArray(itemSchema, options = {}) {
    const arraySchema = Joi.array().items(itemSchema);

    if (options.min !== undefined) {
        arraySchema.min(options.min);
    }
    if (options.max !== undefined) {
        arraySchema.max(options.max);
    }

    return validate({
        body: arraySchema
    }, options);
}

/**
 * Create custom validator from Joi schema
 */
function createValidator(schema) {
    return (value) => {
        const { error, value: validated } = schema.validate(value, DEFAULT_OPTIONS);

        if (error) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            throw new ValidationError('Validation failed', details);
        }

        return validated;
    };
}

/**
 * Sanitize and validate file upload
 */
function validateFileUpload(options = {}) {
    const {
        required = true,
        fieldName = 'file',
        allowedMimeTypes = [],
        maxSize = 10 * 1024 * 1024, // 10MB default
        allowedExtensions = []
    } = options;

    return (req, res, next) => {
        const file = req.file || req.files?.[fieldName];

        if (!file && required) {
            throw new ValidationError('File upload required', [
                { field: fieldName, message: 'File is required' }
            ]);
        }

        if (!file && !required) {
            return next();
        }

        // Check file size
        if (file.size > maxSize) {
            throw new ValidationError('File too large', [
                { field: fieldName, message: `File size must not exceed ${maxSize / 1024 / 1024}MB` }
            ]);
        }

        // Check MIME type
        if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
            throw new ValidationError('Invalid file type', [
                { field: fieldName, message: `File type must be one of: ${allowedMimeTypes.join(', ')}` }
            ]);
        }

        // Check file extension
        if (allowedExtensions.length > 0) {
            const ext = file.originalname.split('.').pop()?.toLowerCase();
            if (!ext || !allowedExtensions.includes(ext)) {
                throw new ValidationError('Invalid file extension', [
                    { field: fieldName, message: `File extension must be one of: ${allowedExtensions.join(', ')}` }
                ]);
            }
        }

        next();
    };
}

module.exports = {
    validate,
    validators,
    validateArray,
    createValidator,
    validateFileUpload,
    commonSchemas,
    Joi
};
