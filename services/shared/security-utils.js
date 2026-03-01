function isPlaceholderSecret(value = '') {
    const normalized = String(value).trim().toLowerCase();
    return !normalized ||
        normalized.includes('your-secret-key') ||
        normalized.includes('change-this') ||
        normalized.includes('placeholder') ||
        normalized === 'dummy';
}

function getRequiredEnv(name, { allowInDev = false } = {}) {
    const value = process.env[name];
    if (!value || isPlaceholderSecret(value)) {
        if (allowInDev && process.env.NODE_ENV === 'development') {
            return null;
        }
        throw new Error(`[Config] Missing secure environment variable: ${name}`);
    }
    return value;
}

function createForwardedIdentityGuard() {
    return (req, res, next) => {
        const hasForwardedIdentity = Boolean(
            req.headers['x-user-id'] ||
            req.headers['x-user-role'] ||
            req.headers['x-user-email'] ||
            req.headers['x-user-is-admin']
        );

        if (!hasForwardedIdentity) {
            return next();
        }

        if (process.env.ALLOW_DIRECT_SERVICE_ACCESS === 'true') {
            return next();
        }

        const expectedToken = process.env.INTERNAL_GATEWAY_TOKEN;
        const inboundToken = req.headers['x-internal-gateway-token'];

        if (!expectedToken || isPlaceholderSecret(expectedToken)) {
            return res.status(503).json({
                error: 'Service misconfiguration',
                message: 'INTERNAL_GATEWAY_TOKEN is missing or insecure'
            });
        }

        if (inboundToken !== expectedToken) {
            return res.status(401).json({
                error: 'Unauthorized forwarded identity',
                message: 'Forwarded identity headers are only accepted from trusted gateway'
            });
        }

        return next();
    };
}

module.exports = {
    isPlaceholderSecret,
    getRequiredEnv,
    createForwardedIdentityGuard
};
