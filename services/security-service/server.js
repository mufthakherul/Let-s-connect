const express = require('express');
const proxy = require('express-http-proxy');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const ipRangeCheck = require('ip-range-check');
const speakeasy = require('speakeasy');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Sequelize, DataTypes, Op } = require('sequelize');
require('dotenv').config({ quiet: true });

const { getRequiredEnv, isPlaceholderSecret } = require('../shared/security-utils');
const { setupQueryMonitoring, queryStatsMiddleware } = require('../shared/query-monitor');
const { getPoolConfig, monitorPoolHealth } = require('../shared/pool-config');

// configuration
// security-service listens on a configurable port (previously 9101)
// change via SECURITY_PORT in environment (e.g. 9102 to avoid conflicts)
const PORT = process.env.SECURITY_PORT || 9102;
const adminDbPoolProfile = process.env.ADMIN_DB_POOL_PROFILE || 'lightweight';
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

const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    message: { error: 'Authentication temporarily unavailable' },
    standardHeaders: true,
    legacyHeaders: false
});

const ADMIN_ROLES = new Set(['master', 'admin', 'viewer']);

function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
}

function sanitizeRole(value) {
    const role = String(value || '').trim().toLowerCase();
    if (!ADMIN_ROLES.has(role)) return null;
    return role;
}

// helper middleware to check admin secret or JWT token
// allows unauthenticated access to login endpoint
function requireAdminSecret(req, res, next) {
    if (req.path === '/admin/login') {
        return next();
    }
    // check for Bearer token first
    const auth = req.headers['authorization'];
    if (auth && auth.startsWith('Bearer ')) {
        const token = auth.slice(7);
        try {
            const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
            req.admin = decoded;
            return next();
        } catch (err) {
            // fall through to secret check below
        }
    }

    const secret = req.headers['x-admin-secret'] || req.query.admin_secret;
    if (secret !== ADMIN_API_SECRET) {
        return res.status(403).json({ error: 'Forbidden - invalid admin token' });
    }
    next();
}

// IP whitelisting middleware
function requireWhitelistedIP(req, res, next) {
    // allow login endpoint regardless of IP
    if (req.path === '/admin/login') {
        return next();
    }

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
    // skip 2FA for login
    if (req.path === '/admin/login') {
        return next();
    }
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

// ---------- admin database setup ----------
// Use postgresql:// protocol (postgres:// is deprecated in newer versions)
const ADMIN_DB_URL = (process.env.ADMIN_DB_URL || 'postgresql://postgres:postgres@postgres:5432/milonexa_admin').replace(/^postgres:/, 'postgresql:');

let adminSequelize;
let AdminUser;
let dbInitialized = false;

async function initializeAdminDB() {
    try {
        adminSequelize = new Sequelize(ADMIN_DB_URL, {
            logging: false,
            dialectOptions: {
                connectTimeout: 10000
            },
            ...getPoolConfig(adminDbPoolProfile)
        });

        setupQueryMonitoring(adminSequelize, {
            slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '100', 10),
            n1Threshold: parseInt(process.env.N1_QUERY_THRESHOLD || '5', 10),
            enableStackTrace: process.env.NODE_ENV !== 'production'
        });
        monitorPoolHealth(adminSequelize, getPoolConfig(adminDbPoolProfile));

        AdminUser = adminSequelize.define('AdminUser', {
            username: { type: DataTypes.STRING, unique: true, allowNull: false },
            email: { type: DataTypes.STRING, unique: true, allowNull: true },
            passwordHash: { type: DataTypes.STRING, allowNull: false },
            role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'admin' },
            isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            failedLoginAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
            lockedUntil: { type: DataTypes.DATE, allowNull: true },
            lastLoginAt: { type: DataTypes.DATE, allowNull: true }
        });

        await adminSequelize.authenticate();
        await adminSequelize.sync({ alter: true });

        const masterUsername = normalizeUsername(process.env.MASTER_ADMIN_USERNAME || process.env.ADMIN_MASTER_USERNAME);
        const masterEmail = normalizeEmail(process.env.MASTER_ADMIN_EMAIL);
        const masterPassword = process.env.MASTER_ADMIN_PASSWORD || process.env.ADMIN_MASTER_PASSWORD;

        if (masterUsername && masterPassword) {
            const lookup = [{ username: masterUsername }];
            if (masterEmail) lookup.push({ email: masterEmail });

            let user = await AdminUser.findOne({
                where: { [Op.or]: lookup }
            });

            const passwordHash = await bcrypt.hash(masterPassword, 10);

            if (!user) {
                user = await AdminUser.create({
                    username: masterUsername,
                    email: masterEmail || null,
                    passwordHash,
                    role: 'master',
                    isActive: true
                });
            } else {
                await user.update({
                    username: masterUsername,
                    email: masterEmail || user.email,
                    passwordHash,
                    role: 'master',
                    isActive: true,
                    lockedUntil: null,
                    failedLoginAttempts: 0
                });
            }
        }

        dbInitialized = true;
        console.log('[Admin DB] Connected and initialized successfully');
    } catch (err) {
        console.error('[Admin DB] Initialization failed:', err.message);
        // Retry after 5 seconds
        setTimeout(initializeAdminDB, 5000);
    }
}

// Start initialization in background
initializeAdminDB();

const ADMIN_JWT_SECRET = getRequiredEnv('ADMIN_JWT_SECRET');

function generateAdminToken(user) {
    return jwt.sign({ id: user.id, username: user.username, role: user.role }, ADMIN_JWT_SECRET, { expiresIn: '2h' });
}

// middleware to verify Bearer JWT specifically
function requireAdminJWT(req, res, next) {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header missing' });
    }
    const token = auth.slice(7);
    try {
        req.admin = jwt.verify(token, ADMIN_JWT_SECRET);
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'X-User-Id', 'X-Admin-Secret', 'X-Admin-2FA-Token', 'X-Admin-User-Id']
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// Apply rate limiting
app.use('/user-service/admin', strictLimiter);
app.use('/admin/login', adminLoginLimiter);
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (no middleware)
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        db_status: dbInitialized ? 'connected' : 'initializing',
        security: {
            ip_whitelisting: ALLOWED_IPS.length > 0 || ALLOWED_IP_RANGES.length > 0,
            rate_limiting: true,
            two_factor: ENABLE_2FA
        }
    });
});

// Security middleware chain (applied after health check)
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

// ---------- admin authentication routes ----------
// master login / admin user sign in
app.post('/admin/login', async (req, res) => {
    const username = normalizeUsername(req.body.username);
    const email = normalizeEmail(req.body.email);
    const identifier = username || email;
    const { password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ error: 'Username/email and password required' });
    }
    if (!dbInitialized || !AdminUser) {
        return res.status(503).json({ error: 'Admin database not ready, please try again' });
    }
    try {
        const or = [{ username: identifier }];
        if (identifier.includes('@')) or.push({ email: identifier });

        const user = await AdminUser.findOne({ where: { [Op.or]: or } });
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Authentication failed' });
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
            return res.status(401).json({ error: 'Authentication failed' });
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            const attempts = (user.failedLoginAttempts || 0) + 1;
            const lockAccount = attempts >= 5;
            await user.update({
                failedLoginAttempts: lockAccount ? 0 : attempts,
                lockedUntil: lockAccount ? new Date(Date.now() + 15 * 60 * 1000) : null
            });
            return res.status(401).json({ error: 'Authentication failed' });
        }

        await user.update({
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date()
        });
        const token = generateAdminToken(user);
        res.json({
            token,
            role: user.role,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('login error', err);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// protected route to create additional admin users
app.post('/admin/users', requireAdminJWT, async (req, res) => {
    const username = normalizeUsername(req.body.username);
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    const role = sanitizeRole(req.body.role || 'admin');

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    if (!role) {
        return res.status(400).json({ error: 'Invalid role' });
    }
    if (role === 'master' && req.admin.role !== 'master') {
        return res.status(403).json({ error: 'Only master admin can assign master role' });
    }
    if (!dbInitialized || !AdminUser) {
        return res.status(503).json({ error: 'Admin database not ready, please try again' });
    }
    try {
        const existing = await AdminUser.findOne({
            where: {
                [Op.or]: [
                    { username },
                    ...(email ? [{ email }] : [])
                ]
            }
        });
        if (existing) {
            return res.status(409).json({ error: 'Admin user already exists' });
        }
        const hash = await bcrypt.hash(password, 10);
        const newUser = await AdminUser.create({
            username,
            email: email || null,
            passwordHash: hash,
            role
        });
        res.status(201).json({
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            isActive: newUser.isActive
        });
    } catch (err) {
        console.error('create admin user error', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.get('/admin/users', requireAdminJWT, async (req, res) => {
    if (!dbInitialized || !AdminUser) {
        return res.status(503).json({ error: 'Admin database not ready, please try again' });
    }
    try {
        const users = await AdminUser.findAll({
            attributes: ['id', 'username', 'email', 'role', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'],
            order: [['createdAt', 'DESC']]
        });
        return res.json({ users });
    } catch (err) {
        console.error('list admin users error', err);
        return res.status(500).json({ error: 'Failed to list admin users' });
    }
});

app.patch('/admin/users/:id', requireAdminJWT, async (req, res) => {
    if (!dbInitialized || !AdminUser) {
        return res.status(503).json({ error: 'Admin database not ready, please try again' });
    }
    try {
        const user = await AdminUser.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Admin user not found' });
        }

        if (req.admin.role !== 'master' && user.role === 'master') {
            return res.status(403).json({ error: 'Only master admin can modify master account' });
        }

        const updates = {};
        if (typeof req.body.username === 'string') {
            const normalizedUsername = normalizeUsername(req.body.username);
            if (!normalizedUsername) return res.status(400).json({ error: 'Invalid username' });
            updates.username = normalizedUsername;
        }
        if (typeof req.body.email === 'string') {
            const normalizedEmail = normalizeEmail(req.body.email);
            updates.email = normalizedEmail || null;
        }
        if (typeof req.body.role !== 'undefined') {
            const normalizedRole = sanitizeRole(req.body.role);
            if (!normalizedRole) return res.status(400).json({ error: 'Invalid role' });
            if (normalizedRole === 'master' && req.admin.role !== 'master') {
                return res.status(403).json({ error: 'Only master admin can assign master role' });
            }
            updates.role = normalizedRole;
        }
        if (typeof req.body.isActive !== 'undefined') {
            if (user.id === req.admin.id && parseBoolean(req.body.isActive) === false) {
                return res.status(400).json({ error: 'Cannot deactivate own account' });
            }
            if (user.role === 'master' && parseBoolean(req.body.isActive) === false) {
                return res.status(400).json({ error: 'Master account cannot be deactivated' });
            }
            updates.isActive = parseBoolean(req.body.isActive);
        }
        if (typeof req.body.password === 'string' && req.body.password.length > 0) {
            updates.passwordHash = await bcrypt.hash(req.body.password, 10);
            updates.failedLoginAttempts = 0;
            updates.lockedUntil = null;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid updates provided' });
        }

        await user.update(updates);
        return res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt
        });
    } catch (err) {
        console.error('update admin user error', err);
        return res.status(500).json({ error: 'Failed to update admin user' });
    }
});

app.post('/admin/users/:id/disable', requireAdminJWT, async (req, res) => {
    if (!dbInitialized || !AdminUser) {
        return res.status(503).json({ error: 'Admin database not ready, please try again' });
    }
    try {
        const user = await AdminUser.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Admin user not found' });
        }
        if (user.id === req.admin.id) {
            return res.status(400).json({ error: 'Cannot disable own account' });
        }
        if (user.role === 'master') {
            return res.status(400).json({ error: 'Master account cannot be disabled' });
        }
        if (req.admin.role !== 'master') {
            return res.status(403).json({ error: 'Master admin privileges required' });
        }

        await user.update({ isActive: false, lockedUntil: null, failedLoginAttempts: 0 });
        return res.json({ id: user.id, disabled: true });
    } catch (err) {
        console.error('disable admin user error', err);
        return res.status(500).json({ error: 'Failed to disable admin user' });
    }
});

app.get('/admin/verify', requireAdminJWT, async (req, res) => {
    if (!dbInitialized || !AdminUser) {
        return res.status(503).json({ error: 'Admin database not ready, please try again' });
    }
    try {
        const user = await AdminUser.findByPk(req.admin.id, {
            attributes: ['id', 'username', 'email', 'role', 'isActive', 'lastLoginAt']
        });
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Authentication failed' });
        }
        return res.json({ valid: true, user });
    } catch (err) {
        console.error('verify admin token error', err);
        return res.status(500).json({ error: 'Verification failed' });
    }
});

app.get('/admin/debug/query-stats', requireAdminJWT, queryStatsMiddleware);

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
