const express = require('express');
const proxy = require('express-http-proxy');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config({ quiet: true });

const { getRequiredEnv, isPlaceholderSecret } = require('../shared/security-utils');

// configuration
const PORT = process.env.SECURITY_PORT || 9101;
const ADMIN_API_SECRET = getRequiredEnv('ADMIN_API_SECRET');
const INTERNAL_GATEWAY_TOKEN = getRequiredEnv('INTERNAL_GATEWAY_TOKEN');

// helper middleware to check admin secret
function requireAdminSecret(req, res, next) {
    const secret = req.headers['x-admin-secret'] || req.query.admin_secret;
    if (secret !== ADMIN_API_SECRET) {
        return res.status(403).json({ error: 'Forbidden - invalid admin token' });
    }
    next();
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
app.use(helmet());

// CORS - restrict to localhost/admin front-end by default
const adminCorsOrigins = (process.env.ADMIN_CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || adminCorsOrigins.includes(origin) || origin.includes('localhost')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Authorization','Content-Type','X-Requested-With','X-User-Id','X-Admin-Secret']
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

// require secret for all requests
app.use(requireAdminSecret);

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
