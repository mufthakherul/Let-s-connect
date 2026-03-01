function parseOrigins() {
    const configured = (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    if (configured.length > 0) {
        return configured;
    }

    return [
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ];
}

function isAllowedOrigin(origin, allowedOrigins) {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;

    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
    if (origin.endsWith('.app.github.dev')) return true;

    return false;
}

function buildCorsOptions(extra = {}) {
    const allowedOrigins = parseOrigins();

    return {
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin, allowedOrigins)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'X-User-Id'],
        ...extra
    };
}

function buildSocketCorsOptions(extra = {}) {
    const allowedOrigins = parseOrigins();

    return {
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin, allowedOrigins)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by socket CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST'],
        ...extra
    };
}

module.exports = {
    parseOrigins,
    buildCorsOptions,
    buildSocketCorsOptions
};
