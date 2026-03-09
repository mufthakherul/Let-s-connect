/**
 * Milonexa Environment Validator
 * Validates all required environment variables at service startup
 * Used to fail fast if critical configuration is missing or uses placeholders
 */

const REQUIRED_SECRETS = [
    'JWT_SECRET',
    'INTERNAL_GATEWAY_TOKEN',
    'ADMIN_API_SECRET',
    'ADMIN_JWT_SECRET'
];

const REQUIRED_DB_CONFIG = [
    'APP_DB_USER',
    'APP_DB_PASSWORD',
    'POSTGRES_PASSWORD',
    'POSTGRES_HOST',
    'POSTGRES_DB'
];

const PLACEHOLDER_PATTERNS = [
    'replace-with-',
    'your-',
    'change-this',
    'placeholder',
    'dummy',
    'xxx',
    '<',
    '>'
];

/**
 * Check if a value is a placeholder that hasn't been replaced
 */
function isPlaceholder(value) {
    if (!value || typeof value !== 'string') {
        return true;
    }
    
    const normalized = value.toLowerCase().trim();
    return PLACEHOLDER_PATTERNS.some(pattern => normalized.includes(pattern));
}

/**
 * Validate all required environment variables
 * @param {Object} options - Validation options
 * @param {boolean} options.strict - If true, fail on any missing var; if false, allow in development
 * @param {Array<string>} options.additionalSecrets - Extra secret keys to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateEnv(options = {}) {
    const { 
        strict = true, 
        additionalSecrets = [],
        skipDatabase = false
    } = options;
    
    const errors = [];
    const isDev = process.env.NODE_ENV === 'development';
    
    // Check all required secrets
    const secrets = [...REQUIRED_SECRETS, ...additionalSecrets];
    
    for (const key of secrets) {
        const value = process.env[key];
        
        if (!value) {
            if (strict || !isDev) {
                errors.push(`Missing required secret: ${key}`);
            }
        } else if (isPlaceholder(value)) {
            if (strict || !isDev) {
                errors.push(`Secret "${key}" contains a placeholder value and must be replaced with a real secret`);
            } else {
                console.warn(`[env-validator] WARNING: ${key} uses a placeholder in development mode`);
            }
        }
    }
    
    // Check database configuration (skip if not needed)
    if (!skipDatabase) {
        for (const key of REQUIRED_DB_CONFIG) {
            const value = process.env[key];
            if (!value) {
                if (strict || !isDev) {
                    errors.push(`Missing required database config: ${key}`);
                }
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings: [],
        timestamp: new Date().toISOString()
    };
}

/**
 * Assert environment is valid, throw if not
 * @param {Object} options - Validation options (same as validateEnv)
 * @throws {Error} If validation fails
 */
function assertEnvValid(options = {}) {
    const result = validateEnv(options);
    
    if (!result.valid) {
        const errorMessage = [
            '\n[Milonexa Config Error] Environment validation failed:',
            ...result.errors.map(e => `  - ${e}`),
            '\nPlease fix these issues before starting the service.'
        ].join('\n');
        
        throw new Error(errorMessage);
    }
}

/**
 * Get validation report as formatted string
 */
function getValidationReport() {
    const result = validateEnv({ strict: false });
    
    return [
        'Milonexa Environment Validation Report',
        '=====================================',
        `Valid: ${result.valid}`,
        `Timestamp: ${result.timestamp}`,
        `Environment: ${process.env.NODE_ENV || 'not set'}`,
        '',
        'Checked Configuration:',
        '  Secrets: ' + REQUIRED_SECRETS.join(', '),
        '  Database: ' + REQUIRED_DB_CONFIG.join(', '),
        '',
        result.errors.length > 0 ? `Errors (${result.errors.length}):` : 'No errors',
        ...result.errors.map(e => `  ✗ ${e}`),
        ''
    ].filter(line => line !== '').join('\n');
}

module.exports = {
    validateEnv,
    assertEnvValid,
    getValidationReport,
    isPlaceholder,
    REQUIRED_SECRETS,
    REQUIRED_DB_CONFIG
};
