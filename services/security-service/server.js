const express = require('express');
const proxy = require('express-http-proxy');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const ipRangeCheck = require('ip-range-check');
const speakeasy = require('speakeasy');
require('dotenv').config({ quiet: true });

const { getRequiredEnv, isPlaceholderSecret } = require('../shared/security-utils');

// configuration
const PORT = process.env.SECURITY_PORT || 9101;
const ADMIN_API_SECRET = getRequiredEnv('ADMIN_API_SECRET');
const INTERNAL_GATEWAY_TOKEN = getRequiredEnv('INTERNAL_GATEWAY_TOKEN');

// IP whitelisting
const ALLOWED_IPS = (process.env.ADMIN_ALLOWED_IPS || '').split(',').filter(ip => ip.trim());
const ALLOWED_IP_RANGES = (process.env.ADMIN_ALLOWED_IP_RANGES || '').split(',').filter(range => range.trim());

// 2FA configuration
const ENABLE_2FA = process.env.ENABLE_ADMIN_2FA === 'true';
const TOTP_SECRETS = {}; // In production, store in database

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limiting for admin endpoints
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many admin requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// helper middleware to check admin secret
function requireAdminSecret(req, res, next) {
    const secret = req.headers['x-admin-secret'] || req.query.admin_secret;
    if (secret !== ADMIN_API_SECRET) {
        return res.status(403).json({ error: 'Forbidden - invalid admin token' });
    }
    next();
}

// IP whitelisting middleware
function requireWhitelistedIP(req, res, next) {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

    // Check individual IPs
    if (ALLOWED_IPS.length > 0 && ALLOWED_IPS.includes(clientIP)) {
        return next();
    }

    // Check IP ranges
    if (ALLOWED_IP_RANGES.length > 0) {
        for (const range of ALLOWED_IP_RANGES) {
            if (ipRangeCheck(clientIP, range)) {
                return next();
            }
        }
    }

    // If no whitelisting configured, allow all (for development)
    if (ALLOWED_IPS.length === 0 && ALLOWED_IP_RANGES.length === 0) {
        return next();
    }

    return res.status(403).json({ error: 'IP not whitelisted' });
}

// 2FA verification middleware
function require2FA(req, res, next) {
    if (!ENABLE_2FA) return next();

    const token = req.headers['x-admin-2fa-token'];
    const userId = req.headers['x-admin-user-id'];

    if (!token || !userId) {
        return res.status(401).json({ error: '2FA token and user ID required' });
    }

    const secret = TOTP_SECRETS[userId];
    if (!secret) {
        return res.status(401).json({ error: '2FA not configured for this user' });
    }

    const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time windows (30 seconds each)
    });

    if (!verified) {
        return res.status(401).json({ error: 'Invalid 2FA token' });
    }

    next();
}

// 2FA setup endpoint
function setup2FA(userId) {
    const secret = speakeasy.generateSecret({
        name: `Milonexa Admin (${userId})`,
        issuer: 'Milonexa'
    });
    TOTP_SECRETS[userId] = secret.base32;
    return {
        secret: secret.base32,
        otpauth_url: secret.otpauth_url
    };
}

// build service URL map (may be overridden via env vars)
const services = {
    'user-service': process.env.USER_SERVICE_URL || 'http://user-service:8002',
    'content-service': process.env.CONTENT_SERVICE_URL || 'http://content-service:8010',
    'streaming-service': process.env.STREAMING_SERVICE_URL || 'http://streaming-service:8009'
    // add others as needed
};

// generic proxy options to forward identity headers and internal token
const proxyOptions = {
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers = proxyReqOpts.headers || {};
        proxyReqOpts.headers['x-internal-gateway-token'] = INTERNAL_GATEWAY_TOKEN;
        if (srcReq.id) {
            proxyReqOpts.headers['x-request-id'] = srcReq.id;
        }
        return proxyReqOpts;
    },
    proxyReqPathResolver: (req) => {
        // preserve original path after the service prefix
        const parts = req.originalUrl.split('/').filter(Boolean);
        // e.g. /user-service/admin/stats -> ['user-service','admin','stats']
        const svc = parts.shift();
        return '/' + parts.join('/');
    }
};

const app = express();
app.set('trust proxy', 1);
app.use(compression());
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS - restrict to localhost/admin front-end by default
const adminCorsOrigins = (process.env.ADMIN_CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

// Add dynamic GitHub Codespaces URL if CODESPACE_NAME is available
if (process.env.CODESPACE_NAME && process.env.REACT_APP_ADMIN_PORT) {
    const codespaceUrl = `https://${process.env.CODESPACE_NAME}-${process.env.REACT_APP_ADMIN_PORT}.app.github.dev`;
    adminCorsOrigins.push(codespaceUrl);
    console.log(`Added GitHub Codespaces CORS origin: ${codespaceUrl}`);
}

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || adminCorsOrigins.includes(origin) || origin.includes('localhost') || origin.includes('app.github.dev')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Authorization','Content-Type','X-Requested-With','X-User-Id','X-Admin-Secret','X-Admin-2FA-Token','X-Admin-User-Id']
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// Apply rate limiting
app.use('/user-service/admin', strictLimiter);
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware chain
app.use(requireWhitelistedIP);
app.use(requireAdminSecret);
app.use(require2FA);

// 2FA setup endpoint (before proxy to avoid proxying)
app.post('/setup-2fa', (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
    }

    try {
        const setup = setup2FA(userId);
        res.json({
            message: '2FA setup initiated',
            secret: setup.secret,
            otpauth_url: setup.otpauth_url
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to setup 2FA' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        security: {
            ip_whitelisting: ALLOWED_IPS.length > 0 || ALLOWED_IP_RANGES.length > 0,
            rate_limiting: true,
            two_factor: ENABLE_2FA
        }
    });
});

// mount proxies dynamically
app.use('/:service', (req, res, next) => {
    const svcName = req.params.service;
    const target = services[svcName];
    if (!target) {
        return res.status(404).json({ error: 'Unknown service' });
    }
    return proxy(target, proxyOptions)(req, res, next);
});

app.listen(PORT, () => {
    console.log(`Security service (admin backend) listening on port ${PORT}`);
    console.log('Proxying the following services:');
    Object.keys(services).forEach(k => console.log(`  - ${k} -> ${services[k]}`));
});
