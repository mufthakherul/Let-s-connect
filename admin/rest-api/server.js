#!/usr/bin/env node

/**
 * Milonexa Admin REST API Server (Phase E)
 *
 * Provides a full HTTP REST API for all admin CLI operations.
 * This is a third admin interface method (alongside the frontend UI and CLI).
 *
 * Endpoints:
 *   GET  /health                     Server health check
 *   GET  /api/v1/dashboard           Full dashboard summary
 *   GET  /api/v1/metrics             Query metrics
 *   POST /api/v1/metrics             Record a metric
 *   GET  /api/v1/alerts              List alerts
 *   GET  /api/v1/alerts/stats        Alert statistics
 *   GET  /api/v1/sla                 SLA status
 *   GET  /api/v1/sla/predict         SLA breach predictions
 *   POST /api/v1/sla/record          Record SLA measurement
 *   GET  /api/v1/webhooks            List webhooks
 *   POST /api/v1/webhooks            Add webhook
 *   DELETE /api/v1/webhooks/:id      Remove webhook
 *   POST /api/v1/webhooks/fire       Fire webhooks
 *   GET  /api/v1/clusters            List clusters
 *   POST /api/v1/clusters            Register cluster
 *   GET  /api/v1/clusters/status     Multi-cluster status
 *   GET  /api/v1/trends              Trend analysis report
 *   GET  /api/v1/trends/anomalies    Anomaly detection
 *   POST /api/v1/remediate           Run AI remediation analysis
 *   GET  /api/v1/compliance          Compliance status
 *   GET  /api/v1/costs               Cost summary
 *   GET  /api/v1/recommendations     Top recommendations
 *   GET  /api/v1/audit               Audit log
 *
 * Authentication: Bearer token via ADMIN_API_KEY env var
 * Usage: node admin-cli/admin-server.js [--port 8888] [--host 0.0.0.0]
 *
 * Security: Token is set via ADMIN_API_KEY environment variable.
 *           Requests without a valid token are rejected with 401.
 */

'use strict';

// ---------------------------------------------------------------------------
// Guard: ENABLE_ADMIN_REST_API must be 'true' (defaults to true for backward compat)
// ---------------------------------------------------------------------------
const ENABLE_ADMIN_REST_API = (process.env.ENABLE_ADMIN_REST_API ?? 'true').toLowerCase();
if (ENABLE_ADMIN_REST_API === 'false') {
    console.error('[admin-server] Admin REST API is disabled (ENABLE_ADMIN_REST_API=false).');
    process.exit(0);
}

const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { URL } = require('url');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const REPO_ROOT_CANDIDATE = path.resolve(__dirname, '../..');
const ROOT_DIR = fs.existsSync(path.join(REPO_ROOT_CANDIDATE, 'docker-compose.yml'))
    ? REPO_ROOT_CANDIDATE
    : path.resolve(__dirname, '..');
const ADMIN_HOME = process.env.ADMIN_HOME || path.join(ROOT_DIR, '.admin-cli');

const args = process.argv.slice(2);
function getArg(name, def) {
    const idx = args.indexOf(name);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
}

const PORT = parseInt(getArg('--port', process.env.ADMIN_API_PORT || '8888'));
const HOST = getArg('--host', process.env.ADMIN_API_HOST || '127.0.0.1');
const API_KEY = process.env.ADMIN_API_KEY || '';

// ---------------------------------------------------------------------------
// Load modules
// ---------------------------------------------------------------------------

const { MetricsCollector } = require('../shared/metrics');
const { AlertManager } = require('../shared/alerts');
const { ComplianceManager } = require('../shared/compliance');
const { CostAnalyzer } = require('../shared/cost-analyzer');
const { RecommendationEngine } = require('../shared/recommendations');
const { SLAManager } = require('../shared/sla');
const { WebhookManager } = require('../shared/webhooks');
const { MultiClusterManager } = require('../shared/multi-cluster');
const { TrendAnalyzer } = require('../shared/trend-analysis');
const { RemediationEngine } = require('../shared/ai-remediation');
const { printAuditLog } = require('../shared/audit');
const { SessionManager } = require('../shared/session-manager');
const { SecretsVault } = require('../shared/secrets-vault');
const { AnomalyDetector } = require('../shared/anomaly-detector');
const { GDPRManager } = require('../shared/gdpr');
const mtls = require('../shared/mtls');

// Q4 2026 modules
const { AdminTracer } = require('../shared/opentelemetry');
const { RunbookManager } = require('../shared/runbook');
const { ChangeLog } = require('../shared/change-log');
const { TenantManager } = require('../shared/tenant-manager');
const { FeatureFlagManager } = require('../shared/feature-flags');
const { AIIntegrationBridge } = require('../shared/ai-integration');

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

function log(level, msg) {
    const ts = new Date().toISOString();
    process.stdout.write(`[${ts}] [${level}] ${msg}\n`);
}

// ---------------------------------------------------------------------------
// Q3 2026 Security Hardening — helpers
// ---------------------------------------------------------------------------

/** Strip dangerous chars and limit to 500 characters. */
function sanitize(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>'"]/g, '').slice(0, 500);
}

/** OWASP security headers added to every response. */
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'none'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

// ---------------------------------------------------------------------------
// In-memory rate limiter (per-IP: 100 req/min, per-user: 200 req/min)
// ---------------------------------------------------------------------------

const RATE_WINDOW_MS = 60 * 1000;
const IP_MAX_REQUESTS = 100;
const USER_MAX_REQUESTS = 200;

const _ipWindows = {};
const _userWindows = {};

function checkRateLimit(ip, userId) {
    const now = Date.now();

    if (!_ipWindows[ip] || now - _ipWindows[ip].windowStart > RATE_WINDOW_MS) {
        _ipWindows[ip] = { count: 1, windowStart: now };
    } else {
        _ipWindows[ip].count++;
    }
    if (_ipWindows[ip].count > IP_MAX_REQUESTS) {
        return {
            limited: true, type: 'ip',
            retryAfter: Math.ceil((RATE_WINDOW_MS - (now - _ipWindows[ip].windowStart)) / 1000),
        };
    }

    if (userId) {
        if (!_userWindows[userId] || now - _userWindows[userId].windowStart > RATE_WINDOW_MS) {
            _userWindows[userId] = { count: 1, windowStart: now };
        } else {
            _userWindows[userId].count++;
        }
        if (_userWindows[userId].count > USER_MAX_REQUESTS) {
            return {
                limited: true, type: 'user',
                retryAfter: Math.ceil((RATE_WINDOW_MS - (now - _userWindows[userId].windowStart)) / 1000),
            };
        }
    }

    return { limited: false };
}

function getRateLimitState() {
    const result = [];
    for (const [ip, w] of Object.entries(_ipWindows)) {
        result.push({ ip, count: w.count, windowStart: new Date(w.windowStart).toISOString(), blocked: w.count > IP_MAX_REQUESTS });
    }
    for (const [userId, w] of Object.entries(_userWindows)) {
        result.push({ userId, count: w.count, windowStart: new Date(w.windowStart).toISOString(), blocked: w.count > USER_MAX_REQUESTS });
    }
    return result;
}

// ---------------------------------------------------------------------------
// IP Allowlist
// ---------------------------------------------------------------------------

let _ipAllowlist = (process.env.ADMIN_IP_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean);

function ipInAllowlist(ip) {
    if (_ipAllowlist.length === 0) return true;
    for (const entry of _ipAllowlist) {
        if (entry === ip) return true;
        if (entry.includes('/') && ipMatchesCidr(ip, entry)) return true;
    }
    return false;
}

function ipMatchesCidr(ip, cidr) {
    try {
        const [range, bits] = cidr.split('/');
        const mask = ~(Math.pow(2, 32 - parseInt(bits)) - 1) >>> 0;
        const ipNum = ipToInt(ip);
        const rangeNum = ipToInt(range);
        return (ipNum & mask) === (rangeNum & mask);
    } catch (_) {
        return false;
    }
}

function ipToInt(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

// ---------------------------------------------------------------------------
// Lazy module instances (Q3 2026)
// ---------------------------------------------------------------------------

let _sessionManager = null;
let _anomalyDetector = null;
let _secretsVault = null;
let _gdprManager = null;

function getSessionManager() {
    if (!_sessionManager) _sessionManager = new SessionManager(ADMIN_HOME, { evictOldest: true });
    return _sessionManager;
}

function getAnomalyDetector() {
    if (!_anomalyDetector) _anomalyDetector = new AnomalyDetector(ADMIN_HOME);
    return _anomalyDetector;
}

function getSecretsVault() {
    if (!_secretsVault) _secretsVault = new SecretsVault(ADMIN_HOME);
    return _secretsVault;
}

function getGDPRManager() {
    if (!_gdprManager) _gdprManager = new GDPRManager(ADMIN_HOME);
    return _gdprManager;
}

let _adminTracer = null;
let _runbookManager = null;
let _changeLog = null;
let _tenantManager = null;
let _featureFlagManager = null;
let _aiIntegration = null;

function getTracer() { if (!_adminTracer) _adminTracer = new AdminTracer(ADMIN_HOME); return _adminTracer; }
function getRunbookManager() { if (!_runbookManager) _runbookManager = new RunbookManager(ADMIN_HOME); return _runbookManager; }
function getChangeLog() { if (!_changeLog) _changeLog = new ChangeLog(ADMIN_HOME); return _changeLog; }
function getTenantManager() { if (!_tenantManager) _tenantManager = new TenantManager(ADMIN_HOME); return _tenantManager; }
function getFeatureFlagManager() { if (!_featureFlagManager) _featureFlagManager = new FeatureFlagManager(ADMIN_HOME); return _featureFlagManager; }
function getAIIntegration() { if (!_aiIntegration) _aiIntegration = new AIIntegrationBridge(ADMIN_HOME); return _aiIntegration; }

// ---------------------------------------------------------------------------
// Middleware helpers
// ---------------------------------------------------------------------------

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', d => { body += d; if (body.length > 1e6) req.destroy(); });
        req.on('end', () => {
            try { resolve(body ? JSON.parse(body) : {}); } catch (_) { resolve({}); }
        });
        req.on('error', reject);
    });
}

function sendJSON(res, statusCode, data) {
    const body = JSON.stringify(data, null, 2);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Powered-By': 'Milonexa-Admin-API/5.0',
        'Access-Control-Allow-Origin': process.env.ADMIN_CORS_ORIGIN || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        ...SECURITY_HEADERS,
    });
    res.end(body);
}

function sendError(res, code, message) {
    sendJSON(res, code, { error: message, timestamp: new Date().toISOString() });
}

function authenticate(req) {
    if (!API_KEY) {
        // No API key configured — only allow if explicitly opted-in for development mode
        // or if server is bound to loopback interface only
        const isLoopback = HOST === '127.0.0.1' || HOST === 'localhost' || HOST === '::1';
        return isLoopback;  // Deny all if not on loopback and no API_KEY set
    }
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    return token === API_KEY;
}

function getDir(sub) {
    return path.join(ADMIN_HOME, sub);
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handleRequest(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': process.env.ADMIN_CORS_ORIGIN || '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            ...SECURITY_HEADERS,
        });
        res.end();
        return;
    }

    log('info', `${method} ${pathname}`);

    // Health — no auth, no rate limit, no allowlist
    if (pathname === '/health' && method === 'GET') {
        return sendJSON(res, 200, { status: 'ok', timestamp: new Date().toISOString(), version: '5.0' });
    }

    // IP Allowlist enforcement (skip /health handled above)
    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (!ipInAllowlist(clientIp)) {
        return sendError(res, 403, `IP ${clientIp} is not in the allowlist`);
    }

    // Rate limit — per-IP (userId resolved after auth below, but still enforce IP limit now)
    const rlCheck = checkRateLimit(clientIp, null);
    if (rlCheck.limited) {
        res.setHeader('Retry-After', String(rlCheck.retryAfter));
        return sendError(res, 429, `Rate limit exceeded (${rlCheck.type}). Retry after ${rlCheck.retryAfter}s`);
    }

    // Auth check for all other routes
    if (!authenticate(req)) {
        return sendError(res, 401, 'Unauthorized. Provide a valid Bearer token via Authorization header.');
    }

    // Per-user rate limit (now that we have the API key)
    const authHeader = req.headers['authorization'] || '';
    const reqToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const tokenUserId = reqToken
        ? `key:${crypto.createHash('sha256').update(reqToken).digest('hex').slice(0, 16)}`
        : null;
    const userRlCheck = checkRateLimit(clientIp, tokenUserId);
    if (userRlCheck.limited) {
        res.setHeader('Retry-After', String(userRlCheck.retryAfter));
        return sendError(res, 429, `Rate limit exceeded (${userRlCheck.type}). Retry after ${userRlCheck.retryAfter}s`);
    }

    // Record activity for anomaly detection
    try {
        getAnomalyDetector().recordActivity({ userId: tokenUserId || 'anon', ip: clientIp, action: `${method}:${pathname}` });
    } catch (_) { /* never interrupt request handling */ }

    const body = (method === 'POST' || method === 'PUT' || method === 'PATCH') ? await parseBody(req) : {};

    try {
        // ---- Dashboard ----
        if (pathname === '/api/v1/dashboard' && method === 'GET') {
            const metrics = new MetricsCollector(getDir('metrics')).query();
            const alertStats = new AlertManager(getDir('alerts')).getStats();
            const compStatus = new ComplianceManager(getDir('compliance')).getStatus();
            const budgetStatus = new CostAnalyzer(getDir('costs')).checkBudgetStatus();
            const slaSummary = new SLAManager(getDir('sla')).getSummary();
            const webhookStats = new WebhookManager(getDir('webhooks')).getStats();
            return sendJSON(res, 200, {
                timestamp: new Date().toISOString(),
                metrics: { count: metrics.length },
                alerts: alertStats,
                compliance: compStatus,
                budget: budgetStatus,
                sla: slaSummary,
                webhooks: webhookStats,
            });
        }

        // ---- Metrics ----
        if (pathname === '/api/v1/metrics' && method === 'GET') {
            const filters = {};
            const cat = parsedUrl.searchParams.get('category');
            const svc = parsedUrl.searchParams.get('service');
            if (cat) filters.category = cat;
            if (svc) filters.service = svc;
            const metrics = new MetricsCollector(getDir('metrics')).query(filters);
            return sendJSON(res, 200, { count: metrics.length, metrics });
        }

        if (pathname === '/api/v1/metrics' && method === 'POST') {
            const { category, value, service, runtime, unit, tags } = body;
            if (!category || value === undefined) return sendError(res, 400, 'category and value are required');
            const collector = new MetricsCollector(getDir('metrics'));
            collector.record({ category, value: parseFloat(value), service, runtime, unit, tags });
            return sendJSON(res, 201, { recorded: true, category, value });
        }

        // ---- Alerts ----
        if (pathname === '/api/v1/alerts' && method === 'GET') {
            const mgr = new AlertManager(getDir('alerts'));
            return sendJSON(res, 200, { rules: mgr.rules, history: mgr.getHistory ? mgr.getHistory(50) : [] });
        }

        if (pathname === '/api/v1/alerts/stats' && method === 'GET') {
            return sendJSON(res, 200, new AlertManager(getDir('alerts')).getStats());
        }

        // ---- SLA ----
        if (pathname === '/api/v1/sla' && method === 'GET') {
            const mgr = new SLAManager(getDir('sla'));
            return sendJSON(res, 200, { summary: mgr.getSummary(), statuses: mgr.getStatus(), slos: mgr.slos });
        }

        if (pathname === '/api/v1/sla/predict' && method === 'GET') {
            return sendJSON(res, 200, { predictions: new SLAManager(getDir('sla')).getPredictions() });
        }

        if (pathname === '/api/v1/sla/record' && method === 'POST') {
            const { sloId, value } = body;
            if (!sloId || value === undefined) return sendError(res, 400, 'sloId and value are required');
            const m = new SLAManager(getDir('sla')).record(sloId, parseFloat(value));
            return sendJSON(res, 201, { recorded: m });
        }

        if (pathname === '/api/v1/sla/simulate' && method === 'POST') {
            const count = parseInt(body.count) || 10;
            const mgr = new SLAManager(getDir('sla'));
            let total = 0;
            for (const slo of mgr.slos) {
                for (let i = 0; i < count; i++) { mgr.recordSyntheticMeasurement(slo.id); total++; }
            }
            return sendJSON(res, 200, { recorded: total });
        }

        // ---- Webhooks ----
        if (pathname === '/api/v1/webhooks' && method === 'GET') {
            const type = parsedUrl.searchParams.get('type');
            const mgr = new WebhookManager(getDir('webhooks'));
            return sendJSON(res, 200, { webhooks: mgr.listWebhooks(type), stats: mgr.getStats() });
        }

        if (pathname === '/api/v1/webhooks' && method === 'POST') {
            const { type, name, url, token, channel, severity } = body;
            if (!type) return sendError(res, 400, 'type is required (slack|teams|pagerduty|github)');
            const hook = new WebhookManager(getDir('webhooks')).addWebhook(type, { name, url, token, channel, severity });
            return sendJSON(res, 201, { created: hook });
        }

        const webhookMatch = pathname.match(/^\/api\/v1\/webhooks\/([^/]+)$/);
        if (webhookMatch && method === 'DELETE') {
            const id = webhookMatch[1];
            const type = parsedUrl.searchParams.get('type');
            if (!type) return sendError(res, 400, 'type query parameter is required');
            const ok = new WebhookManager(getDir('webhooks')).removeWebhook(type, id);
            return sendJSON(res, ok ? 200 : 404, { removed: ok });
        }

        if (pathname === '/api/v1/webhooks/fire' && method === 'POST') {
            const { eventType = 'manual', severity = 'info', message = 'Admin API test' } = body;
            const results = await new WebhookManager(getDir('webhooks')).fire(
                eventType, { message, source: 'admin-api', timestamp: new Date().toISOString() }, severity
            );
            return sendJSON(res, 200, { results });
        }

        if (pathname === '/api/v1/webhooks/history' && method === 'GET') {
            const limit = parseInt(parsedUrl.searchParams.get('limit')) || 50;
            return sendJSON(res, 200, { history: new WebhookManager(getDir('webhooks')).getHistory(limit) });
        }

        if (webhookMatch && method === 'PUT') {
            const id = webhookMatch[1];
            const type = parsedUrl.searchParams.get('type') || body.type;
            if (!type) return sendError(res, 400, 'type query parameter or body field is required');
            const mgr = new WebhookManager(getDir('webhooks'));
            const updated = mgr.updateWebhook
                ? mgr.updateWebhook(type, id, body)
                : { id, type, ...body, updatedAt: new Date().toISOString() };
            return sendJSON(res, 200, { updated });
        }

        const webhookSubMatch = pathname.match(/^\/api\/v1\/webhooks\/([^/]+)\/(test|logs)$/);
        if (webhookSubMatch && method === 'POST' && webhookSubMatch[2] === 'test') {
            const id = webhookSubMatch[1];
            const eventType = body.eventType || 'webhook.test';
            const results = await new WebhookManager(getDir('webhooks')).fire(
                eventType,
                { message: 'Test event from admin API', webhookId: id, timestamp: new Date().toISOString() },
                'info'
            );
            return sendJSON(res, 200, { tested: true, webhookId: id, results });
        }

        if (webhookSubMatch && method === 'GET' && webhookSubMatch[2] === 'logs') {
            const id = webhookSubMatch[1];
            const limit = parseInt(parsedUrl.searchParams.get('limit')) || 20;
            const history = new WebhookManager(getDir('webhooks')).getHistory(limit);
            const logs = history.filter(h => !h.webhookId || h.webhookId === id);
            return sendJSON(res, 200, { webhookId: id, count: logs.length, logs });
        }

        // ---- Clusters ----
        if (pathname === '/api/v1/clusters' && method === 'GET') {
            return sendJSON(res, 200, { clusters: new MultiClusterManager(getDir('clusters')).listClusters() });
        }

        if (pathname === '/api/v1/clusters' && method === 'POST') {
            const cluster = new MultiClusterManager(getDir('clusters')).registerCluster(body);
            return sendJSON(res, 201, { registered: cluster });
        }

        if (pathname === '/api/v1/clusters/status' && method === 'GET') {
            const ns = parsedUrl.searchParams.get('namespace');
            return sendJSON(res, 200, { clusterStatus: new MultiClusterManager(getDir('clusters')).getClusterStatus(ns) });
        }

        // ---- Trends ----
        if (pathname === '/api/v1/trends' && method === 'GET') {
            const category = parsedUrl.searchParams.get('category');
            const collector = new MetricsCollector(getDir('metrics'));
            const analyzer = new TrendAnalyzer(getDir('metrics'));
            const metrics = collector.query(category ? { category } : {});
            const byCat = {};
            for (const m of metrics) {
                if (!byCat[m.category]) byCat[m.category] = [];
                byCat[m.category].push(m.value);
            }
            const reports = Object.entries(byCat).map(([cat, vals]) => analyzer.analyze(cat, vals));
            return sendJSON(res, 200, { reports });
        }

        if (pathname === '/api/v1/trends/anomalies' && method === 'GET') {
            const category = parsedUrl.searchParams.get('category');
            const collector = new MetricsCollector(getDir('metrics'));
            const analyzer = new TrendAnalyzer(getDir('metrics'));
            const metrics = collector.query(category ? { category } : {});
            const byCat = {};
            for (const m of metrics) {
                if (!byCat[m.category]) byCat[m.category] = [];
                byCat[m.category].push(m.value);
            }
            const anomalies = {};
            for (const [cat, vals] of Object.entries(byCat)) {
                anomalies[cat] = analyzer.detectAnomalies(vals);
            }
            return sendJSON(res, 200, { anomalies });
        }

        // ---- AI Remediation ----
        if (pathname === '/api/v1/remediate' && method === 'POST') {
            const engine = new RemediationEngine(getDir('remediation'));
            const alertMgr = new AlertManager(getDir('alerts'));
            const slaMgr = new SLAManager(getDir('sla'));
            const complianceMgr = new ComplianceManager(getDir('compliance'));
            const alerts = (alertMgr.history || []).filter(h => h.status === 'active').slice(-20);
            const slaStatus = slaMgr.getStatus();
            const complianceStatus = complianceMgr.getStatus();
            const context = body.context || { alerts, slaStatus, complianceStatus };
            const suggestions = await engine.analyze(context);
            return sendJSON(res, 200, { suggestions });
        }

        if (pathname === '/api/v1/remediate/rules' && method === 'GET') {
            return sendJSON(res, 200, { rules: new RemediationEngine(getDir('remediation')).getRules() });
        }

        // ---- Compliance ----
        if (pathname === '/api/v1/compliance' && method === 'GET') {
            const mgr = new ComplianceManager(getDir('compliance'));
            return sendJSON(res, 200, mgr.getStatus());
        }

        // ---- Costs ----
        if (pathname === '/api/v1/costs' && method === 'GET') {
            const analyzer = new CostAnalyzer(getDir('costs'));
            return sendJSON(res, 200, {
                summary: analyzer.getSummary ? analyzer.getSummary() : {},
                budget: analyzer.checkBudgetStatus(),
            });
        }

        // ---- Recommendations ----
        if (pathname === '/api/v1/recommendations' && method === 'GET') {
            const limit = parseInt(parsedUrl.searchParams.get('limit')) || 10;
            const engine = new RecommendationEngine(getDir('recommendations'));
            const recs = engine.getTopRecommendations ? engine.getTopRecommendations(limit) : [];
            return sendJSON(res, 200, { recommendations: recs });
        }

        // ---- Audit ----
        if (pathname === '/api/v1/audit' && method === 'GET') {
            const limit = parseInt(parsedUrl.searchParams.get('limit')) || 50;
            const auditFile = path.join(ADMIN_HOME, 'audit.log');
            let entries = [];
            if (fs.existsSync(auditFile)) {
                const lines = fs.readFileSync(auditFile, 'utf8').trim().split('\n').filter(Boolean);
                entries = lines.slice(-limit).map(l => {
                    try { return JSON.parse(l); } catch (_) { return { raw: l }; }
                });
            }
            return sendJSON(res, 200, { count: entries.length, entries });
        }

        // ---- GraphQL ----
        if (pathname === '/api/v1/graphql' && method === 'POST') {
            const { query: gqlQuery } = body;
            if (!gqlQuery) return sendError(res, 400, 'query field is required');
            try {
                const parsed = parseGraphQL(gqlQuery);
                const data = await executeGraphQL(parsed.fields);
                return sendJSON(res, 200, { data });
            } catch (err) {
                return sendJSON(res, 200, { errors: [{ message: err.message }] });
            }
        }

        // ---- Users ----
        if (pathname === '/api/v1/users' && method === 'GET') {
            let users = getUsers();
            const status = parsedUrl.searchParams.get('status');
            const role = parsedUrl.searchParams.get('role');
            if (status) users = users.filter(u => u.status === status);
            if (role) users = users.filter(u => u.role === role);
            return sendJSON(res, 200, { count: users.length, users });
        }

        if (pathname === '/api/v1/users/bulk' && method === 'POST') {
            const { action, userIds, role } = body;
            if (!action || !Array.isArray(userIds) || userIds.length === 0)
                return sendError(res, 400, 'action and userIds[] are required');
            const validActions = ['suspend', 'activate', 'delete', 'role-change'];
            if (!validActions.includes(action)) return sendError(res, 400, `action must be one of: ${validActions.join(', ')}`);
            if (action === 'role-change' && !role) return sendError(res, 400, 'role is required for role-change action');
            const users = getUsers();
            const affected = [];
            const updated = users.filter(u => {
                if (!userIds.includes(u.id)) return true;
                if (action === 'delete') { affected.push(u.id); return false; }
                if (action === 'suspend') u.status = 'suspended';
                else if (action === 'activate') u.status = 'active';
                else if (action === 'role-change') u.role = role;
                u.updatedAt = new Date().toISOString();
                affected.push(u.id);
                return true;
            });
            saveUsers(updated);
            appendAuditEvent({ action: `bulk-user-${action}`, userIds: affected, by: 'admin-api' });
            return sendJSON(res, 200, { affected: affected.length, action, userIds: affected });
        }

        if (pathname === '/api/v1/users/export' && method === 'GET') {
            const format = parsedUrl.searchParams.get('format') || 'json';
            const users = getUsers();
            if (format === 'csv') {
                const escapeCsv = v => { const s = String(v ?? ''); return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
                const header = 'id,name,email,role,status,createdAt,lastLogin';
                const rows = users.map(u => [u.id, u.name, u.email, u.role, u.status, u.createdAt, u.lastLogin].map(escapeCsv).join(','));
                const csv = [header, ...rows].join('\n');
                res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="users.csv"', 'Content-Length': Buffer.byteLength(csv), 'Access-Control-Allow-Origin': process.env.ADMIN_CORS_ORIGIN || '*' });
                res.end(csv);
                return;
            }
            return sendJSON(res, 200, { count: users.length, users });
        }

        const userMatch = pathname.match(/^\/api\/v1\/users\/([^/]+)$/);
        if (userMatch && method === 'PUT') {
            const id = userMatch[1];
            const users = getUsers();
            const idx = users.findIndex(u => u.id === id);
            if (idx === -1) return sendError(res, 404, `User ${id} not found`);
            for (const key of ['role', 'status', 'name', 'email']) { if (body[key] !== undefined) users[idx][key] = body[key]; }
            users[idx].updatedAt = new Date().toISOString();
            saveUsers(users);
            return sendJSON(res, 200, { updated: users[idx] });
        }

        const userActionMatch = pathname.match(/^\/api\/v1\/users\/([^/]+)\/(suspend|activate)$/);
        if (userActionMatch && method === 'POST') {
            const [, id, action] = userActionMatch;
            const users = getUsers();
            const idx = users.findIndex(u => u.id === id);
            if (idx === -1) return sendError(res, 404, `User ${id} not found`);
            users[idx].status = action === 'suspend' ? 'suspended' : 'active';
            users[idx].updatedAt = new Date().toISOString();
            saveUsers(users);
            appendAuditEvent({ action: `user-${action}`, userId: id, by: 'admin-api' });
            return sendJSON(res, 200, { id, status: users[idx].status });
        }

        // ---- API Keys ----
        if (pathname === '/api/v1/api-keys' && method === 'GET') {
            const keys = getApiKeys().map(({ keyHash, ...meta }) => meta);
            return sendJSON(res, 200, { count: keys.length, keys });
        }

        if (pathname === '/api/v1/api-keys' && method === 'POST') {
            const { name, service, expiresIn = '90d' } = body;
            if (!name || !service) return sendError(res, 400, 'name and service are required');
            const keyValue = crypto.randomBytes(32).toString('hex');
            const keyHash = crypto.createHash('sha256').update(keyValue).digest('hex');
            const days = ({ '30d': 30, '90d': 90, '1y': 365 })[expiresIn] || 90;
            const key = { id: `key_${crypto.randomBytes(8).toString('hex')}`, name, service, keyHash, created: new Date().toISOString(), lastUsed: null, expiresAt: new Date(Date.now() + days * 86400000).toISOString() };
            const keys = getApiKeys(); keys.push(key); saveApiKeys(keys);
            appendAuditEvent({ action: 'api-key-created', keyId: key.id, name, service, by: 'admin-api' });
            const { keyHash: _, ...meta } = key;
            return sendJSON(res, 201, { created: meta, key: keyValue });
        }

        const apiKeyMatch = pathname.match(/^\/api\/v1\/api-keys\/([^/]+)$/);
        if (apiKeyMatch && method === 'DELETE') {
            const id = apiKeyMatch[1];
            const keys = getApiKeys();
            const idx = keys.findIndex(k => k.id === id);
            if (idx === -1) return sendError(res, 404, `API key ${id} not found`);
            const [removed] = keys.splice(idx, 1); saveApiKeys(keys);
            appendAuditEvent({ action: 'api-key-revoked', keyId: id, name: removed.name, by: 'admin-api' });
            return sendJSON(res, 200, { revoked: true, id });
        }

        const apiKeyRotateMatch = pathname.match(/^\/api\/v1\/api-keys\/([^/]+)\/rotate$/);
        if (apiKeyRotateMatch && method === 'POST') {
            const id = apiKeyRotateMatch[1];
            const keys = getApiKeys();
            const idx = keys.findIndex(k => k.id === id);
            if (idx === -1) return sendError(res, 404, `API key ${id} not found`);
            const newValue = crypto.randomBytes(32).toString('hex');
            keys[idx].keyHash = crypto.createHash('sha256').update(newValue).digest('hex');
            keys[idx].rotatedAt = new Date().toISOString();
            saveApiKeys(keys);
            appendAuditEvent({ action: 'api-key-rotated', keyId: id, name: keys[idx].name, by: 'admin-api' });
            return sendJSON(res, 200, { rotated: true, id, key: newValue });
        }

        // ---- Rate Limits ----
        if (pathname === '/api/v1/rate-limits' && method === 'GET') {
            return sendJSON(res, 200, { rateLimits: getRateLimits() });
        }

        if (pathname === '/api/v1/rate-limits/stats' && method === 'GET') {
            const limits = getRateLimits();
            return sendJSON(res, 200, {
                total: limits.length,
                blocked: limits.filter(r => r.blocked).length,
                totalViolations: limits.reduce((s, r) => s + (r.violations || 0), 0),
                topOffenders: [...limits].sort((a, b) => (b.violations || 0) - (a.violations || 0)).slice(0, 10),
            });
        }

        if (pathname === '/api/v1/rate-limits/reset' && method === 'POST') {
            const { ip, userId } = body;
            if (!ip && !userId) return sendError(res, 400, 'ip or userId is required');
            const limits = getRateLimits().map(r => {
                if ((ip && r.ip === ip) || (userId && r.userId === userId))
                    return { ...r, requestCount: 0, blocked: false, violations: 0, windowStart: new Date().toISOString() };
                return r;
            });
            saveRateLimits(limits);
            return sendJSON(res, 200, { reset: true, ip, userId });
        }

        // ---- Events / Event Sourcing ----
        if (pathname === '/api/v1/events' && method === 'GET') {
            const limit = parseInt(parsedUrl.searchParams.get('limit')) || 100;
            const events = getAdminEvents(limit);
            return sendJSON(res, 200, { count: events.length, events });
        }

        if (pathname === '/api/v1/events/replay' && method === 'POST') {
            const { from, to, filter } = body;
            if (!from) return sendError(res, 400, 'from (ISO date) is required');
            const fromDate = new Date(from);
            if (isNaN(fromDate)) return sendError(res, 400, 'from must be a valid ISO date');
            const toDate = to ? new Date(to) : new Date();
            let sequence = getAdminEvents(10000).filter(e => {
                const ts = new Date(e.timestamp || e.ts || 0);
                return ts >= fromDate && ts <= toDate;
            });
            if (filter) { const re = new RegExp(filter, 'i'); sequence = sequence.filter(e => re.test(JSON.stringify(e))); }
            return sendJSON(res, 200, { from, to: toDate.toISOString(), count: sequence.length, sequence });
        }

        if (pathname === '/api/v1/events/stream' && method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': process.env.ADMIN_CORS_ORIGIN || '*', 'X-Powered-By': 'Milonexa-Admin-API/5.0' });
            res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
            const iv = setInterval(() => { if (res.writableEnded) { clearInterval(iv); return; } res.write(': heartbeat\n\n'); }, 15000);
            req.on('close', () => clearInterval(iv));
            return;
        }

        // ---- Alert Rules ----
        if (pathname === '/api/v1/alerts/rules' && method === 'GET') {
            return sendJSON(res, 200, { rules: getAlertRules() });
        }

        if (pathname === '/api/v1/alerts/rules' && method === 'POST') {
            const { name, condition, threshold, severity = 'warning', service, enabled = true } = body;
            if (!name || !condition) return sendError(res, 400, 'name and condition are required');
            const rule = { id: `rule_${crypto.randomBytes(6).toString('hex')}`, name, condition, threshold, severity, service, enabled, createdAt: new Date().toISOString() };
            const rules = getAlertRules(); rules.push(rule); saveAlertRules(rules);
            return sendJSON(res, 201, { created: rule });
        }

        const alertRuleMatch = pathname.match(/^\/api\/v1\/alerts\/rules\/([^/]+)$/);
        if (alertRuleMatch && method === 'PUT') {
            const id = alertRuleMatch[1];
            const rules = getAlertRules();
            const idx = rules.findIndex(r => r.id === id);
            if (idx === -1) return sendError(res, 404, `Alert rule ${id} not found`);
            for (const k of ['name', 'condition', 'threshold', 'severity', 'service', 'enabled']) { if (body[k] !== undefined) rules[idx][k] = body[k]; }
            rules[idx].updatedAt = new Date().toISOString();
            saveAlertRules(rules);
            return sendJSON(res, 200, { updated: rules[idx] });
        }

        if (alertRuleMatch && method === 'DELETE') {
            const id = alertRuleMatch[1];
            const rules = getAlertRules();
            const idx = rules.findIndex(r => r.id === id);
            if (idx === -1) return sendError(res, 404, `Alert rule ${id} not found`);
            rules.splice(idx, 1); saveAlertRules(rules);
            return sendJSON(res, 200, { deleted: true, id });
        }

        // ---- AI Permissions ----
        if (pathname === '/api/v1/ai/permissions' && method === 'GET') {
            const statusFilter = parsedUrl.searchParams.get('status');
            let perms = getAIPermissions();
            if (statusFilter) perms = perms.filter(p => p.status === statusFilter);
            return sendJSON(res, 200, { count: perms.length, permissions: perms });
        }

        const aiPermMatch = pathname.match(/^\/api\/v1\/ai\/permissions\/([^/]+)\/(approve|deny)$/);
        if (aiPermMatch && method === 'POST') {
            const [, id, decision] = aiPermMatch;
            const perms = getAIPermissions();
            const idx = perms.findIndex(p => p.id === id);
            if (idx === -1) return sendError(res, 404, `Permission request ${id} not found`);
            perms[idx].status = decision === 'approve' ? 'approved' : 'denied';
            perms[idx].decidedAt = new Date().toISOString();
            if (body.reason) perms[idx].reason = body.reason;
            saveAIPermissions(perms);
            appendAuditEvent({ action: `ai-permission-${decision}d`, permId: id, by: 'admin-api' });
            return sendJSON(res, 200, { id, status: perms[idx].status, decidedAt: perms[idx].decidedAt });
        }

        // ====================================================================
        // Q3 2026 Security Hardening endpoints
        // ====================================================================

        // ---- Rate Limits (security alias) ----
        if (pathname === '/api/v1/security/rate-limits' && method === 'GET') {
            return sendJSON(res, 200, { rateLimits: getRateLimitState() });
        }

        // ---- IP Allowlist ----
        if (pathname === '/api/v1/security/ip-allowlist' && method === 'GET') {
            return sendJSON(res, 200, { allowlist: _ipAllowlist });
        }

        if (pathname === '/api/v1/security/ip-allowlist' && method === 'POST') {
            const ip = sanitize(body.ip);
            if (!ip) return sendError(res, 400, 'ip is required');
            // Basic IPv4 / CIDR / IPv6 format validation
            const ipv4Re = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
            const ipv6Re = /^[0-9a-fA-F:]+$/;
            if (!ipv4Re.test(ip) && !ipv6Re.test(ip)) {
                return sendError(res, 400, 'ip must be a valid IPv4, IPv4 CIDR, or IPv6 address');
            }
            if (!_ipAllowlist.includes(ip)) _ipAllowlist.push(ip);
            return sendJSON(res, 200, { allowlist: _ipAllowlist });
        }

        const ipAllowlistDeleteMatch = pathname.match(/^\/api\/v1\/security\/ip-allowlist\/(.+)$/);
        if (ipAllowlistDeleteMatch && method === 'DELETE') {
            const target = decodeURIComponent(ipAllowlistDeleteMatch[1]);
            _ipAllowlist = _ipAllowlist.filter(e => e !== target);
            return sendJSON(res, 200, { allowlist: _ipAllowlist });
        }

        // ---- Session Management ----
        if (pathname === '/api/v1/security/sessions' && method === 'GET') {
            return sendJSON(res, 200, { sessions: getSessionManager().listSessions() });
        }

        if (pathname === '/api/v1/security/sessions/stats' && method === 'GET') {
            return sendJSON(res, 200, getSessionManager().getStats());
        }

        if (pathname === '/api/v1/security/sessions/logout-user' && method === 'POST') {
            const userId = sanitize(body.userId);
            if (!userId) return sendError(res, 400, 'userId is required');
            const count = getSessionManager().forceLogoutUser(userId);
            return sendJSON(res, 200, { loggedOut: count, userId });
        }

        const sessionLogoutMatch = pathname.match(/^\/api\/v1\/security\/sessions\/([^/]+)\/logout$/);
        if (sessionLogoutMatch && method === 'POST') {
            const sessionId = sessionLogoutMatch[1];
            const ok = getSessionManager().forceLogout(sessionId);
            return sendJSON(res, ok ? 200 : 404, { loggedOut: ok, sessionId });
        }

        // ---- Anomaly Detection ----
        if (pathname === '/api/v1/security/anomalies' && method === 'GET') {
            const limit = parseInt(parsedUrl.searchParams.get('limit')) || 50;
            return sendJSON(res, 200, { anomalies: getAnomalyDetector().getAnomalyHistory(limit) });
        }

        if (pathname === '/api/v1/security/anomalies/stats' && method === 'GET') {
            return sendJSON(res, 200, getAnomalyDetector().getStats());
        }

        // ---- 2FA ----
        if (pathname === '/api/v1/security/2fa/status' && method === 'GET') {
            const cfgFile = path.join(ADMIN_HOME, 'config.json');
            let cfg = {};
            if (fs.existsSync(cfgFile)) { try { cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')); } catch (_) {} }
            return sendJSON(res, 200, {
                enabled: cfg.ENABLE_ADMIN_2FA === true || cfg.ENABLE_ADMIN_2FA === 'true',
                enrolledUsers: Array.isArray(cfg.twoFactorEnrolled) ? cfg.twoFactorEnrolled : [],
            });
        }

        if (pathname === '/api/v1/security/2fa/enforce' && method === 'POST') {
            const enabled = body.enabled === true || body.enabled === 'true';
            const cfgFile = path.join(ADMIN_HOME, 'config.json');
            let cfg = {};
            if (fs.existsSync(cfgFile)) { try { cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')); } catch (_) {} }
            cfg.ENABLE_ADMIN_2FA = enabled;
            if (!fs.existsSync(ADMIN_HOME)) fs.mkdirSync(ADMIN_HOME, { recursive: true });
            fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2), 'utf8');
            return sendJSON(res, 200, { ENABLE_ADMIN_2FA: enabled });
        }

        if (pathname === '/api/v1/security/2fa/generate' && method === 'POST') {
            const userId = sanitize(body.userId);
            if (!userId) return sendError(res, 400, 'userId is required');
            // Generate a 20-byte TOTP secret and encode as base32 (RFC 4648) — bit-level to avoid modulo bias
            const secretBytes = crypto.randomBytes(20);
            const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            // Encode 5 bits at a time from the 20-byte buffer (yields 32 base32 chars)
            let bits = 0;
            let bitCount = 0;
            let secret = '';
            for (const byte of secretBytes) {
                bits = (bits << 8) | byte;
                bitCount += 8;
                while (bitCount >= 5) {
                    bitCount -= 5;
                    secret += base32Alphabet[(bits >>> bitCount) & 0x1f];
                }
            }
            // Generate 8 backup codes
            const backupCodes = Array.from({ length: 8 }, () =>
                crypto.randomBytes(4).toString('hex').toUpperCase()
            );
            const issuer = encodeURIComponent('Milonexa Admin');
            const accountName = encodeURIComponent(userId);
            const qrCodeUrl = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

            // Persist enrollment
            const cfgFile = path.join(ADMIN_HOME, 'config.json');
            let cfg = {};
            if (fs.existsSync(cfgFile)) { try { cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')); } catch (_) {} }
            if (!Array.isArray(cfg.twoFactorEnrolled)) cfg.twoFactorEnrolled = [];
            if (!cfg.twoFactorEnrolled.includes(userId)) cfg.twoFactorEnrolled.push(userId);
            if (!fs.existsSync(ADMIN_HOME)) fs.mkdirSync(ADMIN_HOME, { recursive: true });
            fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2), 'utf8');

            return sendJSON(res, 200, { secret, qrCodeUrl, backupCodes });
        }

        // ---- Secrets Vault ----
        if (pathname === '/api/v1/security/secrets' && method === 'GET') {
            const keys = await getSecretsVault().listSecrets();
            return sendJSON(res, 200, { keys, backend: getSecretsVault().getBackendType() });
        }

        if (pathname === '/api/v1/security/secrets' && method === 'POST') {
            const key = sanitize(body.key);
            const value = sanitize(body.value);
            if (!key || value === undefined) return sendError(res, 400, 'key and value are required');
            await getSecretsVault().setSecret(key, value);
            return sendJSON(res, 201, { set: true, key });
        }

        const secretDeleteMatch = pathname.match(/^\/api\/v1\/security\/secrets\/([^/]+)$/);
        if (secretDeleteMatch && method === 'DELETE') {
            const key = secretDeleteMatch[1];
            await getSecretsVault().deleteSecret(key);
            return sendJSON(res, 200, { deleted: true, key });
        }

        const secretRotateMatch = pathname.match(/^\/api\/v1\/security\/secrets\/([^/]+)\/rotate$/);
        if (secretRotateMatch && method === 'POST') {
            const key = secretRotateMatch[1];
            const newValue = sanitize(body.newValue);
            if (!newValue) return sendError(res, 400, 'newValue is required');
            const oldValue = await getSecretsVault().rotateSecret(key, newValue);
            return sendJSON(res, 200, { rotated: true, key, hadPreviousValue: oldValue !== null });
        }

        // ====================================================================
        // Q3 2026 — SSH Administration endpoints
        // ====================================================================
        const SSH_STATE_DIR = path.join(ADMIN_HOME, 'ssh');
        const SSH_KEYS_DIR_REST = path.join(__dirname, '..', 'ssh', 'ssh-keys');
        const SESSION_LOG_FILE_REST = path.join(SSH_STATE_DIR, 'session-log.json');
        const REVOKED_KEYS_FILE_REST = path.join(SSH_STATE_DIR, 'revoked-keys.json');
        const BREAK_GLASS_FILE_REST = path.join(ADMIN_HOME, 'break-glass.json');

        function readBreakGlassREST() {
            try {
                if (!fs.existsSync(BREAK_GLASS_FILE_REST)) return null;
                const data = JSON.parse(fs.readFileSync(BREAK_GLASS_FILE_REST, 'utf8'));
                if (!data || !data.expiry) return null;
                if (Date.now() > new Date(data.expiry).getTime()) {
                    try { fs.unlinkSync(BREAK_GLASS_FILE_REST); } catch (_) {}
                    return null;
                }
                return data;
            } catch (_) { return null; }
        }

        function listSSHKeysREST() {
            const results = [];
            let revokedKeys = [];
            try { if (fs.existsSync(REVOKED_KEYS_FILE_REST)) revokedKeys = JSON.parse(fs.readFileSync(REVOKED_KEYS_FILE_REST, 'utf8')); } catch (_) {}
            const scanDir = (dir) => {
                if (!fs.existsSync(dir)) return;
                for (const f of fs.readdirSync(dir)) {
                    try {
                        const full = path.join(dir, f);
                        const stat = fs.statSync(full);
                        if (!stat.isFile()) continue;
                        const isRevoked = revokedKeys.some(r => r.keyfile === full || r.keyfile === f);
                        results.push({ id: f, file: f, path: full, createdAt: stat.birthtime.toISOString(), modifiedAt: stat.mtime.toISOString(), size: stat.size, status: isRevoked ? 'revoked' : 'active' });
                    } catch (_) {}
                }
            };
            scanDir(SSH_STATE_DIR);
            scanDir(SSH_KEYS_DIR_REST);
            return results;
        }

        if (pathname === '/api/v1/ssh/keys' && method === 'GET') {
            return sendJSON(res, 200, { keys: listSSHKeysREST() });
        }

        if (pathname === '/api/v1/ssh/keys/rotate' && method === 'POST') {
            if (!fs.existsSync(SSH_STATE_DIR)) fs.mkdirSync(SSH_STATE_DIR, { recursive: true, mode: 0o700 });
            const hostKeyPath = path.join(SSH_STATE_DIR, 'host_rsa');
            const ts = Date.now();
            const backupPath = hostKeyPath + `.backup.${ts}`;
            if (fs.existsSync(hostKeyPath)) { fs.copyFileSync(hostKeyPath, backupPath); fs.chmodSync(backupPath, 0o600); }
            const { privateKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: 4096,
                privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
                publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
            });
            fs.writeFileSync(hostKeyPath, privateKey, { mode: 0o600 });
            const auditEntry = JSON.stringify({ ts: new Date().toISOString(), actor: clientIp, action: 'ssh_host_key_rotated', backupPath, interface: 'rest' }) + '\n';
            try { fs.appendFileSync(path.join(ADMIN_HOME, 'audit.log'), auditEntry); } catch (_) {}
            return sendJSON(res, 200, { rotated: true, backupPath, newKeyPath: hostKeyPath });
        }

        const sshKeyRevokeMatch = pathname.match(/^\/api\/v1\/ssh\/keys\/([^/]+)$/);
        if (sshKeyRevokeMatch && method === 'DELETE') {
            const keyId = decodeURIComponent(sshKeyRevokeMatch[1]);
            let revokedKeys = [];
            try { if (fs.existsSync(REVOKED_KEYS_FILE_REST)) revokedKeys = JSON.parse(fs.readFileSync(REVOKED_KEYS_FILE_REST, 'utf8')); } catch (_) {}
            if (!revokedKeys.some(r => r.keyfile === keyId)) {
                revokedKeys.push({ keyfile: keyId, revokedAt: new Date().toISOString() });
                if (!fs.existsSync(SSH_STATE_DIR)) fs.mkdirSync(SSH_STATE_DIR, { recursive: true });
                fs.writeFileSync(REVOKED_KEYS_FILE_REST, JSON.stringify(revokedKeys, null, 2), { mode: 0o600 });
            }
            return sendJSON(res, 200, { revoked: true, keyfile: keyId });
        }

        if (pathname === '/api/v1/ssh/sessions' && method === 'GET') {
            let sessions = [];
            try { if (fs.existsSync(SESSION_LOG_FILE_REST)) sessions = JSON.parse(fs.readFileSync(SESSION_LOG_FILE_REST, 'utf8')); } catch (_) {}
            return sendJSON(res, 200, { sessions });
        }

        // ---- Break-Glass ----
        if (pathname === '/api/v1/security/break-glass/status' && method === 'GET') {
            const bg = readBreakGlassREST();
            if (!bg) return sendJSON(res, 200, { active: false });
            const remaining = Math.max(0, Math.round((new Date(bg.expiry).getTime() - Date.now()) / 1000));
            return sendJSON(res, 200, { active: true, ...bg, remaining_sec: remaining });
        }

        if (pathname === '/api/v1/security/break-glass/activate' && method === 'POST') {
            const existing = readBreakGlassREST();
            if (existing) return sendJSON(res, 409, { error: 'Break-glass is already active', expiry: existing.expiry });
            const actor = sanitize(body.activatedBy) || clientIp || 'api';
            const reason = sanitize(body.reason) || '';
            const now = new Date();
            const expiry = new Date(now.getTime() + 15 * 60 * 1000);
            const bgData = { active: true, activatedBy: actor, activatedAt: now.toISOString(), expiry: expiry.toISOString(), reason, ip: clientIp };
            if (!fs.existsSync(ADMIN_HOME)) fs.mkdirSync(ADMIN_HOME, { recursive: true });
            fs.writeFileSync(BREAK_GLASS_FILE_REST, JSON.stringify(bgData, null, 2), { mode: 0o600 });
            const auditEntry = JSON.stringify({ ts: now.toISOString(), actor, action: 'break_glass_activated', ip: clientIp, reason, expiry: expiry.toISOString(), interface: 'rest', breakGlass: true }) + '\n';
            try { fs.appendFileSync(path.join(ADMIN_HOME, 'audit.log'), auditEntry); } catch (_) {}
            return sendJSON(res, 200, bgData);
        }

        if (pathname === '/api/v1/security/break-glass/revoke' && method === 'POST') {
            const bg = readBreakGlassREST();
            if (!bg) return sendJSON(res, 200, { revoked: false, reason: 'not active' });
            try { fs.unlinkSync(BREAK_GLASS_FILE_REST); } catch (_) {}
            const actor = sanitize(body.revokedBy) || clientIp || 'api';
            const auditEntry = JSON.stringify({ ts: new Date().toISOString(), actor, action: 'break_glass_revoked', interface: 'rest', breakGlass: true }) + '\n';
            try { fs.appendFileSync(path.join(ADMIN_HOME, 'audit.log'), auditEntry); } catch (_) {}
            return sendJSON(res, 200, { revoked: true });
        }

        // ====================================================================
        // GDPR & Compliance endpoints
        // ====================================================================

        const gdprExportMatch = pathname.match(/^\/api\/v1\/gdpr\/export\/([^/]+)$/);
        if (gdprExportMatch && method === 'GET') {
            const userId = gdprExportMatch[1];
            const data = getGDPRManager().exportUserData(userId);
            return sendJSON(res, 200, data);
        }

        if (pathname === '/api/v1/gdpr/erasure' && method === 'POST') {
            const userId = sanitize(body.userId);
            const reason = sanitize(body.reason);
            const requestedBy = sanitize(body.requestedBy) || 'admin-api';
            if (!userId) return sendError(res, 400, 'userId is required');
            const request = getGDPRManager().requestErasure({ userId, requestedBy, reason });
            return sendJSON(res, 201, request);
        }

        if (pathname === '/api/v1/gdpr/erasure' && method === 'GET') {
            const status = parsedUrl.searchParams.get('status');
            return sendJSON(res, 200, { requests: getGDPRManager().listErasureRequests(status) });
        }

        const erasureApproveMatch = pathname.match(/^\/api\/v1\/gdpr\/erasure\/([^/]+)\/approve$/);
        if (erasureApproveMatch && method === 'POST') {
            const requestId = erasureApproveMatch[1];
            const approvedBy = sanitize(body.approvedBy) || 'admin-api';
            const req_ = getGDPRManager().approveErasure(requestId, approvedBy);
            return sendJSON(res, 200, req_);
        }

        const erasureExecuteMatch = pathname.match(/^\/api\/v1\/gdpr\/erasure\/([^/]+)\/execute$/);
        if (erasureExecuteMatch && method === 'POST') {
            const requestId = erasureExecuteMatch[1];
            const req_ = getGDPRManager().executeErasure(requestId);
            return sendJSON(res, 200, req_);
        }

        const gdprConsentMatch = pathname.match(/^\/api\/v1\/gdpr\/consent\/([^/]+)$/);
        if (gdprConsentMatch && method === 'GET') {
            const userId = gdprConsentMatch[1];
            return sendJSON(res, 200, { history: getGDPRManager().getConsentHistory(userId) });
        }

        if (pathname === '/api/v1/gdpr/consent' && method === 'POST') {
            const { userId, type, version, granted, ip: consentIp } = body;
            if (!userId || !type) return sendError(res, 400, 'userId and type are required');
            const event = getGDPRManager().recordConsent({
                userId: sanitize(userId),
                type: sanitize(type),
                version: sanitize(version),
                granted: granted === true || granted === 'true',
                ip: sanitize(consentIp) || clientIp,
            });
            return sendJSON(res, 201, event);
        }

        if (pathname === '/api/v1/gdpr/retention/run' && method === 'POST') {
            const policies = Array.isArray(body.policies) ? body.policies : [];
            const result = getGDPRManager().runRetentionCleanup(policies);
            return sendJSON(res, 200, result);
        }

        if (pathname === '/api/v1/compliance/report' && method === 'GET') {
            const html = getGDPRManager().generateComplianceReport();
            const buf = Buffer.from(html, 'utf8');
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Length': buf.length,
                ...SECURITY_HEADERS,
                // Relax CSP to allow inline styles for the report's HTML rendering
                'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
            });
            res.end(buf);
            return;
        }

        if (pathname === '/api/v1/compliance/soc2' && method === 'GET') {
            return sendJSON(res, 200, getGDPRManager().collectSOC2Evidence());
        }

        // -----------------------------------------------------------------------
        // mTLS Management endpoints
        // -----------------------------------------------------------------------

        if (pathname === '/api/v1/security/mtls/status' && method === 'GET') {
            const certDir = process.env.ADMIN_CERT_DIR || path.join(ADMIN_HOME, 'certs');
            const enabled = (process.env.ADMIN_MTLS_ENABLED || '').toLowerCase() === 'true';
            const caExists = fs.existsSync(path.join(certDir, 'ca.crt'));
            const clientCertExists = fs.existsSync(path.join(certDir, 'client.crt'));
            const serverCertExists = fs.existsSync(path.join(certDir, 'server.crt'));
            return sendJSON(res, 200, {
                enabled,
                certDir,
                caGenerated: caExists,
                clientCertGenerated: clientCertExists,
                serverCertGenerated: serverCertExists,
                env: {
                    ADMIN_MTLS_ENABLED: process.env.ADMIN_MTLS_ENABLED || 'false',
                    ADMIN_MTLS_CA_CERT: process.env.ADMIN_MTLS_CA_CERT || '(not set)',
                    ADMIN_MTLS_CLIENT_CERT: process.env.ADMIN_MTLS_CLIENT_CERT || '(not set)',
                    ADMIN_MTLS_CLIENT_KEY: process.env.ADMIN_MTLS_CLIENT_KEY || '(not set)',
                },
            });
        }

        if (pathname === '/api/v1/security/mtls/setup' && method === 'POST') {
            const certDir = process.env.ADMIN_CERT_DIR || path.join(ADMIN_HOME, 'certs');
            const result = mtls.generateSelfSignedCA(certDir);
            if (result.instructions) {
                return sendJSON(res, 200, {
                    status: 'manual_required',
                    message: 'openssl not available; run the commands manually',
                    instructions: result.instructions,
                    openssl_commands: result.openssl_commands,
                });
            }
            return sendJSON(res, 200, {
                status: 'generated',
                caKeyPath: result.caKeyPath,
                caCertPath: result.caCertPath,
                message: 'CA generated. Use POST /api/v1/security/mtls/setup with { commonName } to issue client certs.',
            });
        }

        if (pathname === '/api/v1/security/mtls/certs' && method === 'GET') {
            const certDir = process.env.ADMIN_CERT_DIR || path.join(ADMIN_HOME, 'certs');
            fs.mkdirSync(certDir, { recursive: true });
            const files = fs.existsSync(certDir) ? fs.readdirSync(certDir) : [];
            const certs = files
                .filter((f) => f.endsWith('.crt') && f !== 'ca.crt')
                .map((f) => {
                    const certPath = path.join(certDir, f);
                    try {
                        const pem = fs.readFileSync(certPath, 'utf8');
                        const info = mtls.getCertInfo(pem);
                        return { file: f, ...info };
                    } catch (_) {
                        return { file: f, error: 'Could not read cert info' };
                    }
                });
            return sendJSON(res, 200, { certs, certDir });
        }

        if (pathname === '/api/v1/security/mtls/revoke' && method === 'POST') {
            const body = await parseBody(req);
            const { serialNumber } = body;
            if (!serialNumber) return sendError(res, 400, 'serialNumber is required');
            const certDir = process.env.ADMIN_CERT_DIR || path.join(ADMIN_HOME, 'certs');
            mtls.revokeCert(sanitize(serialNumber), certDir);
            return sendJSON(res, 200, { revoked: true, serialNumber });
        }

        // -----------------------------------------------------------------------
        // Incident management endpoints
        // -----------------------------------------------------------------------

        const incidentsFile = path.join(ADMIN_HOME, 'incidents.json');

        function readIncidents() {
            if (!fs.existsSync(incidentsFile)) return [];
            try { return JSON.parse(fs.readFileSync(incidentsFile, 'utf8')); } catch (_) { return []; }
        }

        function writeIncidents(list) {
            fs.mkdirSync(ADMIN_HOME, { recursive: true });
            fs.writeFileSync(incidentsFile, JSON.stringify(list, null, 2));
        }

        if (pathname === '/api/v1/incidents' && method === 'GET') {
            return sendJSON(res, 200, { incidents: readIncidents() });
        }

        if (pathname === '/api/v1/incidents' && method === 'POST') {
            const body = await parseBody(req);
            if (!body.title) return sendError(res, 400, 'title is required');
            const incidents = readIncidents();
            const incident = {
                id: `INC-${String(incidents.length + 1).padStart(4, '0')}`,
                title: sanitize(body.title),
                description: sanitize(body.description || ''),
                severity: body.severity || 'medium',
                status: 'open',
                affectedServices: Array.isArray(body.affectedServices) ? body.affectedServices.map(sanitize) : [],
                assignee: sanitize(body.assignee || ''),
                timeline: [{ timestamp: new Date().toISOString(), text: 'Incident created' }],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            incidents.push(incident);
            writeIncidents(incidents);
            return sendJSON(res, 201, { incident });
        }

        const incidentUpdateMatch = pathname.match(/^\/api\/v1\/incidents\/([^/]+)\/update$/);
        if (incidentUpdateMatch && method === 'POST') {
            const id = incidentUpdateMatch[1];
            const body = await parseBody(req);
            const incidents = readIncidents();
            const idx = incidents.findIndex((i) => i.id === id);
            if (idx === -1) return sendError(res, 404, `Incident ${id} not found`);
            incidents[idx].timeline.push({ timestamp: new Date().toISOString(), text: sanitize(body.text || '') });
            incidents[idx].updatedAt = new Date().toISOString();
            if (body.status) incidents[idx].status = body.status;
            writeIncidents(incidents);
            return sendJSON(res, 200, { incident: incidents[idx] });
        }

        const incidentResolveMatch = pathname.match(/^\/api\/v1\/incidents\/([^/]+)\/resolve$/);
        if (incidentResolveMatch && method === 'POST') {
            const id = incidentResolveMatch[1];
            const incidents = readIncidents();
            const idx = incidents.findIndex((i) => i.id === id);
            if (idx === -1) return sendError(res, 404, `Incident ${id} not found`);
            incidents[idx].status = 'resolved';
            incidents[idx].resolvedAt = new Date().toISOString();
            incidents[idx].updatedAt = new Date().toISOString();
            incidents[idx].timeline.push({ timestamp: new Date().toISOString(), text: 'Incident resolved' });
            writeIncidents(incidents);
            return sendJSON(res, 200, { incident: incidents[idx] });
        }

        // -----------------------------------------------------------------------
        // B1. OpenTelemetry (AdminTracer)
        // -----------------------------------------------------------------------

        if (pathname === '/api/v1/telemetry/traces' && method === 'GET') {
            const limit = parseInt(parsedUrl.searchParams.get('limit') || '100', 10);
            const filter = {};
            if (parsedUrl.searchParams.get('status')) filter.status = parsedUrl.searchParams.get('status');
            if (parsedUrl.searchParams.get('name')) filter.name = parsedUrl.searchParams.get('name');
            const traces = getTracer().getTraces(limit, filter);
            return sendJSON(res, 200, { traces });
        }

        if (pathname === '/api/v1/telemetry/spans' && method === 'GET') {
            const filter = {};
            if (parsedUrl.searchParams.get('name')) filter.name = parsedUrl.searchParams.get('name');
            if (parsedUrl.searchParams.get('status')) filter.status = parsedUrl.searchParams.get('status');
            if (parsedUrl.searchParams.get('traceId')) filter.traceId = parsedUrl.searchParams.get('traceId');
            if (parsedUrl.searchParams.get('dateFrom')) filter.dateFrom = parsedUrl.searchParams.get('dateFrom');
            if (parsedUrl.searchParams.get('dateTo')) filter.dateTo = parsedUrl.searchParams.get('dateTo');
            const spans = getTracer().getSpans(filter);
            return sendJSON(res, 200, { spans });
        }

        if (pathname === '/api/v1/telemetry/stats' && method === 'GET') {
            const stats = getTracer().getStats();
            return sendJSON(res, 200, stats);
        }

        if (pathname === '/api/v1/telemetry/spans' && method === 'POST') {
            const body = await parseBody(req);
            const { name, attributes, parentSpanId } = body;
            const span = getTracer().startSpan(sanitize(name || 'unnamed'), attributes || {}, parentSpanId || null);
            span.end();
            return sendJSON(res, 201, { span });
        }

        // -----------------------------------------------------------------------
        // B2. Runbooks (RunbookManager) — /executions before /:id
        // -----------------------------------------------------------------------

        if (pathname === '/api/v1/runbooks' && method === 'GET') {
            const filter = Object.fromEntries(parsedUrl.searchParams.entries());
            const runbooks = await getRunbookManager().listRunbooks(filter);
            return sendJSON(res, 200, { runbooks });
        }

        if (pathname === '/api/v1/runbooks' && method === 'POST') {
            const body = await parseBody(req);
            const runbook = await getRunbookManager().createRunbook(body);
            return sendJSON(res, 201, { runbook });
        }

        if (pathname === '/api/v1/runbooks/executions' && method === 'GET') {
            const limit = parseInt(parsedUrl.searchParams.get('limit') || '50', 10);
            const history = await getRunbookManager().getExecutionHistory(null, limit);
            return sendJSON(res, 200, { executions: history });
        }

        {
            const execIdMatch = pathname.match(/^\/api\/v1\/runbooks\/executions\/([^/]+)$/);
            if (execIdMatch && method === 'GET') {
                const exec = await getRunbookManager().getExecution(execIdMatch[1]);
                return sendJSON(res, 200, { execution: exec });
            }
        }

        {
            const rbMatch = pathname.match(/^\/api\/v1\/runbooks\/([^/]+)$/);
            if (rbMatch && method === 'GET') {
                const rb = await getRunbookManager().getRunbook(rbMatch[1]);
                return sendJSON(res, 200, { runbook: rb });
            }
            if (rbMatch && method === 'PUT') {
                const body = await parseBody(req);
                const rb = await getRunbookManager().updateRunbook(rbMatch[1], body);
                return sendJSON(res, 200, { runbook: rb });
            }
            if (rbMatch && method === 'DELETE') {
                await getRunbookManager().deleteRunbook(rbMatch[1]);
                return sendJSON(res, 200, { deleted: rbMatch[1] });
            }
        }

        {
            const rbExecMatch = pathname.match(/^\/api\/v1\/runbooks\/([^/]+)\/execute$/);
            if (rbExecMatch && method === 'POST') {
                const body = await parseBody(req);
                const { params } = body;
                const user = req.headers['x-admin-user'] || 'api';
                const result = await getRunbookManager().executeRunbook(rbExecMatch[1], params, user);
                return sendJSON(res, 200, { result });
            }
        }

        // -----------------------------------------------------------------------
        // B3. Change Log — /stats, /export, /timeline/:r before /:id
        // -----------------------------------------------------------------------

        if (pathname === '/api/v1/change-log' && method === 'GET') {
            const query = Object.fromEntries(parsedUrl.searchParams.entries());
            const entries = await getChangeLog().search(query);
            return sendJSON(res, 200, { entries });
        }

        if (pathname === '/api/v1/change-log' && method === 'POST') {
            const body = await parseBody(req);
            const entry = await getChangeLog().record(body);
            return sendJSON(res, 201, { entry });
        }

        if (pathname === '/api/v1/change-log/stats' && method === 'GET') {
            const stats = await getChangeLog().getStats();
            return sendJSON(res, 200, stats);
        }

        if (pathname === '/api/v1/change-log/export' && method === 'GET') {
            const csv = await getChangeLog().exportAsCSV();
            res.writeHead(200, {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="change-log.csv"',
                ...SECURITY_HEADERS,
            });
            res.end(csv);
            return;
        }

        {
            const tlMatch = pathname.match(/^\/api\/v1\/change-log\/timeline\/([^/]+)$/);
            if (tlMatch && method === 'GET') {
                const timeline = await getChangeLog().getTimeline(decodeURIComponent(tlMatch[1]));
                return sendJSON(res, 200, { timeline });
            }
        }

        {
            const clLinkMatch = pathname.match(/^\/api\/v1\/change-log\/([^/]+)\/link$/);
            if (clLinkMatch && method === 'POST') {
                const body = await parseBody(req);
                const entry = await getChangeLog().link(clLinkMatch[1], body.ticketRef);
                return sendJSON(res, 200, { entry });
            }
        }

        {
            const clApproveMatch = pathname.match(/^\/api\/v1\/change-log\/([^/]+)\/approve$/);
            if (clApproveMatch && method === 'POST') {
                const body = await parseBody(req);
                const entry = await getChangeLog().approve(clApproveMatch[1], body.approvedBy);
                return sendJSON(res, 200, { entry });
            }
        }

        // -----------------------------------------------------------------------
        // B4. Tenant Management — sub-routes before /:id generic
        // -----------------------------------------------------------------------

        if (pathname === '/api/v1/tenants' && method === 'GET') {
            const filter = Object.fromEntries(parsedUrl.searchParams.entries());
            const tenants = await getTenantManager().listTenants(filter);
            return sendJSON(res, 200, { tenants });
        }

        if (pathname === '/api/v1/tenants' && method === 'POST') {
            const body = await parseBody(req);
            const tenant = await getTenantManager().createTenant(body);
            return sendJSON(res, 201, { tenant });
        }

        {
            const tQuotaMatch = pathname.match(/^\/api\/v1\/tenants\/([^/]+)\/quota$/);
            if (tQuotaMatch && method === 'GET') {
                const quota = await getTenantManager().getQuota(tQuotaMatch[1]);
                return sendJSON(res, 200, { quota });
            }
            if (tQuotaMatch && method === 'PUT') {
                const body = await parseBody(req);
                const quota = await getTenantManager().setQuota(tQuotaMatch[1], body);
                return sendJSON(res, 200, { quota });
            }
        }

        {
            const tQuotaUsageMatch = pathname.match(/^\/api\/v1\/tenants\/([^/]+)\/quota\/usage$/);
            if (tQuotaUsageMatch && method === 'GET') {
                const usage = await getTenantManager().getQuotaUsage(tQuotaUsageMatch[1]);
                return sendJSON(res, 200, { usage });
            }
        }

        {
            const tBillingSummaryMatch = pathname.match(/^\/api\/v1\/tenants\/([^/]+)\/billing\/summary$/);
            if (tBillingSummaryMatch && method === 'GET') {
                const summary = await getTenantManager().getBillingSummary(tBillingSummaryMatch[1]);
                return sendJSON(res, 200, summary);
            }
        }

        {
            const tBillingMatch = pathname.match(/^\/api\/v1\/tenants\/([^/]+)\/billing$/);
            if (tBillingMatch && method === 'GET') {
                const from = parsedUrl.searchParams.get('from') || undefined;
                const to = parsedUrl.searchParams.get('to') || undefined;
                const history = await getTenantManager().getBillingHistory(tBillingMatch[1], from, to);
                return sendJSON(res, 200, { history });
            }
            if (tBillingMatch && method === 'POST') {
                const body = await parseBody(req);
                const event = await getTenantManager().recordBillingEvent(tBillingMatch[1], body);
                return sendJSON(res, 201, { event });
            }
        }

        {
            const tWlMatch = pathname.match(/^\/api\/v1\/tenants\/([^/]+)\/whitelabel$/);
            if (tWlMatch && method === 'GET') {
                const wl = await getTenantManager().getWhiteLabel(tWlMatch[1]);
                return sendJSON(res, 200, { whitelabel: wl });
            }
            if (tWlMatch && method === 'PUT') {
                const body = await parseBody(req);
                const wl = await getTenantManager().setWhiteLabel(tWlMatch[1], body);
                return sendJSON(res, 200, { whitelabel: wl });
            }
        }

        {
            const tSuspendMatch = pathname.match(/^\/api\/v1\/tenants\/([^/]+)\/suspend$/);
            if (tSuspendMatch && method === 'POST') {
                const body = await parseBody(req);
                const tenant = await getTenantManager().suspendTenant(tSuspendMatch[1], body.reason);
                return sendJSON(res, 200, { tenant });
            }
        }

        {
            const tActivateMatch = pathname.match(/^\/api\/v1\/tenants\/([^/]+)\/activate$/);
            if (tActivateMatch && method === 'POST') {
                const tenant = await getTenantManager().activateTenant(tActivateMatch[1]);
                return sendJSON(res, 200, { tenant });
            }
        }

        {
            const tIdMatch = pathname.match(/^\/api\/v1\/tenants\/([^/]+)$/);
            if (tIdMatch && method === 'GET') {
                const tenant = await getTenantManager().getTenant(tIdMatch[1]);
                return sendJSON(res, 200, { tenant });
            }
            if (tIdMatch && method === 'PUT') {
                const body = await parseBody(req);
                const tenant = await getTenantManager().updateTenant(tIdMatch[1], body);
                return sendJSON(res, 200, { tenant });
            }
            if (tIdMatch && method === 'DELETE') {
                await getTenantManager().deleteTenant(tIdMatch[1]);
                return sendJSON(res, 200, { deleted: tIdMatch[1] });
            }
        }

        // -----------------------------------------------------------------------
        // B5. Feature Flags — /stats, /evaluate before /:id
        // -----------------------------------------------------------------------

        if (pathname === '/api/v1/feature-flags' && method === 'GET') {
            const filter = Object.fromEntries(parsedUrl.searchParams.entries());
            const flags = await getFeatureFlagManager().listFlags(filter);
            return sendJSON(res, 200, { flags });
        }

        if (pathname === '/api/v1/feature-flags' && method === 'POST') {
            const body = await parseBody(req);
            const flag = await getFeatureFlagManager().createFlag(body);
            return sendJSON(res, 201, { flag });
        }

        if (pathname === '/api/v1/feature-flags/stats' && method === 'GET') {
            const stats = await getFeatureFlagManager().getStats();
            return sendJSON(res, 200, stats);
        }

        if (pathname === '/api/v1/feature-flags/evaluate' && method === 'POST') {
            const body = await parseBody(req);
            const { flagName, environment, userId } = body;
            const result = await getFeatureFlagManager().evaluateFlag(flagName, environment, userId);
            return sendJSON(res, 200, { result });
        }

        {
            const ffToggleMatch = pathname.match(/^\/api\/v1\/feature-flags\/([^/]+)\/toggle$/);
            if (ffToggleMatch && method === 'POST') {
                const body = await parseBody(req);
                const flag = await getFeatureFlagManager().toggleFlag(ffToggleMatch[1], body.environment, body.enabled, 'admin');
                return sendJSON(res, 200, { flag });
            }
        }

        {
            const ffRolloutMatch = pathname.match(/^\/api\/v1\/feature-flags\/([^/]+)\/rollout$/);
            if (ffRolloutMatch && method === 'POST') {
                const body = await parseBody(req);
                const flag = await getFeatureFlagManager().setRollout(ffRolloutMatch[1], body.environment, body.percent, 'admin');
                return sendJSON(res, 200, { flag });
            }
        }

        {
            const ffHistoryMatch = pathname.match(/^\/api\/v1\/feature-flags\/([^/]+)\/history$/);
            if (ffHistoryMatch && method === 'GET') {
                const history = await getFeatureFlagManager().getFlagHistory(ffHistoryMatch[1]);
                return sendJSON(res, 200, { history });
            }
        }

        {
            const ffIdMatch = pathname.match(/^\/api\/v1\/feature-flags\/([^/]+)$/);
            if (ffIdMatch && method === 'GET') {
                const flag = await getFeatureFlagManager().getFlag(ffIdMatch[1]);
                return sendJSON(res, 200, { flag });
            }
            if (ffIdMatch && method === 'PUT') {
                const body = await parseBody(req);
                const flag = await getFeatureFlagManager().updateFlag(ffIdMatch[1], body);
                return sendJSON(res, 200, { flag });
            }
            if (ffIdMatch && method === 'DELETE') {
                await getFeatureFlagManager().deleteFlag(ffIdMatch[1]);
                return sendJSON(res, 200, { deleted: ffIdMatch[1] });
            }
        }

        // -----------------------------------------------------------------------
        // B6. Developer Experience: Config, Deployments, Migrations, Logs
        // -----------------------------------------------------------------------

        // --- Config ---

        if (pathname === '/api/v1/config' && method === 'GET') {
            const configs = readJSONStore('service-configs.json', {});
            return sendJSON(res, 200, { configs });
        }

        {
            const cfgHistMatch = pathname.match(/^\/api\/v1\/config\/([^/]+)\/history$/);
            if (cfgHistMatch && method === 'GET') {
                const svc = sanitize(cfgHistMatch[1]);
                const timeline = await getChangeLog().getTimeline(`config:${svc}`);
                return sendJSON(res, 200, { timeline });
            }
        }

        {
            const cfgSvcMatch = pathname.match(/^\/api\/v1\/config\/([^/]+)$/);
            if (cfgSvcMatch && method === 'GET') {
                const svc = sanitize(cfgSvcMatch[1]);
                const configs = readJSONStore('service-configs.json', {});
                return sendJSON(res, 200, { service: svc, config: configs[svc] || {} });
            }
            if (cfgSvcMatch && method === 'PUT') {
                const body = await parseBody(req);
                const svc = sanitize(cfgSvcMatch[1]);
                const configs = readJSONStore('service-configs.json', {});
                if (!configs[svc]) configs[svc] = {};
                configs[svc][sanitize(body.key)] = body.value;
                writeJSONStore('service-configs.json', configs);
                await getChangeLog().record({
                    resource: `config:${svc}`,
                    action: 'update',
                    details: { key: body.key, value: body.value },
                    actor: req.headers['x-admin-user'] || 'api',
                });
                return sendJSON(res, 200, { service: svc, config: configs[svc] });
            }
        }

        // --- Deployments ---

        const DEPLOYMENT_SERVICES = ['api-gateway', 'user-service', 'messaging-service', 'notification-service', 'content-service'];

        const MOCK_PIPELINES = {
            'api-gateway':           [{ name: 'build', status: 'success', duration: 42 }, { name: 'test', status: 'success', duration: 61 }, { name: 'deploy', status: 'success', duration: 18 }],
            'user-service':          [{ name: 'build', status: 'success', duration: 38 }, { name: 'test', status: 'success', duration: 55 }, { name: 'deploy', status: 'success', duration: 22 }],
            'messaging-service':     [{ name: 'build', status: 'success', duration: 44 }, { name: 'test', status: 'success', duration: 70 }, { name: 'deploy', status: 'success', duration: 15 }],
            'notification-service':  [{ name: 'build', status: 'success', duration: 30 }, { name: 'test', status: 'success', duration: 48 }, { name: 'deploy', status: 'success', duration: 12 }],
            'content-service':       [{ name: 'build', status: 'success', duration: 50 }, { name: 'test', status: 'success', duration: 65 }, { name: 'deploy', status: 'success', duration: 20 }],
        };

        function mockDeployment(svc) {
            return {
                service: svc,
                stage: 'live',
                version: '1.0.0',
                lastDeploy: new Date(Date.now() - 3600000).toISOString(),
                pipeline: MOCK_PIPELINES[svc] || [],
            };
        }

        if (pathname === '/api/v1/deployments' && method === 'GET') {
            return sendJSON(res, 200, { deployments: DEPLOYMENT_SERVICES.map(mockDeployment) });
        }

        {
            const dplTriggerMatch = pathname.match(/^\/api\/v1\/deployments\/([^/]+)\/trigger$/);
            if (dplTriggerMatch && method === 'POST') {
                const svc = sanitize(dplTriggerMatch[1]);
                await getChangeLog().record({
                    resource: `deployment:${svc}`,
                    action: 'trigger',
                    actor: req.headers['x-admin-user'] || 'api',
                });
                return sendJSON(res, 200, { triggered: true, service: svc });
            }
        }

        {
            const dplSvcMatch = pathname.match(/^\/api\/v1\/deployments\/([^/]+)$/);
            if (dplSvcMatch && method === 'GET') {
                const svc = sanitize(dplSvcMatch[1]);
                return sendJSON(res, 200, { deployment: mockDeployment(svc) });
            }
        }

        // --- Migrations ---

        if (pathname === '/api/v1/migrations/status' && method === 'GET') {
            const migrations = readJSONStore('migrations.json', []);
            const summary = {
                total: migrations.length,
                pending: migrations.filter(m => m.status === 'pending').length,
                running: migrations.filter(m => m.status === 'running').length,
                completed: migrations.filter(m => m.status === 'completed').length,
                failed: migrations.filter(m => m.status === 'failed').length,
            };
            return sendJSON(res, 200, summary);
        }

        if (pathname === '/api/v1/migrations' && method === 'GET') {
            const migrations = readJSONStore('migrations.json', []);
            return sendJSON(res, 200, { migrations });
        }

        if (pathname === '/api/v1/migrations' && method === 'POST') {
            const body = await parseBody(req);
            const migrations = readJSONStore('migrations.json', []);
            const migration = {
                id: `mig_${Date.now()}`,
                ...body,
                status: 'pending',
                createdAt: new Date().toISOString(),
            };
            migrations.push(migration);
            writeJSONStore('migrations.json', migrations);
            return sendJSON(res, 201, { migration });
        }

        {
            const migRunMatch = pathname.match(/^\/api\/v1\/migrations\/([^/]+)\/run$/);
            if (migRunMatch && method === 'POST') {
                const id = migRunMatch[1];
                const migrations = readJSONStore('migrations.json', []);
                const idx = migrations.findIndex(m => m.id === id);
                if (idx === -1) return sendError(res, 404, `Migration ${id} not found`);
                migrations[idx].status = 'running';
                migrations[idx].startedAt = new Date().toISOString();
                writeJSONStore('migrations.json', migrations);
                migrations[idx].status = 'completed';
                migrations[idx].completedAt = new Date().toISOString();
                writeJSONStore('migrations.json', migrations);
                return sendJSON(res, 200, { migration: migrations[idx] });
            }
        }

        // --- Log Search / SSE Stream ---

        if (pathname === '/api/v1/logs/search' && method === 'POST') {
            const body = await parseBody(req);
            const { query, service, level, dateFrom, dateTo, limit = 100 } = body;
            const auditPath = path.join(ADMIN_HOME, 'audit.log');
            let lines = [];
            if (fs.existsSync(auditPath)) {
                lines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
            }
            let results = lines;
            if (query) results = results.filter(l => l.includes(query));
            if (service) results = results.filter(l => l.includes(service));
            if (level) results = results.filter(l => l.toLowerCase().includes(level.toLowerCase()));
            if (dateFrom) results = results.filter(l => l >= dateFrom);
            if (dateTo) results = results.filter(l => l <= dateTo);
            results = results.slice(-limit);
            return sendJSON(res, 200, { results, count: results.length });
        }

        if (pathname === '/api/v1/logs/stream' && method === 'GET') {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': process.env.ADMIN_CORS_ORIGIN || '*',
                ...SECURITY_HEADERS,
            });
            const auditPath = path.join(ADMIN_HOME, 'audit.log');
            let lines = [];
            if (fs.existsSync(auditPath)) {
                lines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean).slice(-20);
            }
            for (const line of lines) {
                res.write(`data: ${JSON.stringify({ line })}\n\n`);
            }
            res.end();
            return;
        }

        // -----------------------------------------------------------------------
        // B7. AI Integration (AIIntegrationBridge)
        // -----------------------------------------------------------------------

        if (pathname === '/api/v1/ai/integration/events' && method === 'GET') {
            const filter = Object.fromEntries(parsedUrl.searchParams.entries());
            const events = await getAIIntegration().subscribeEvents(filter);
            return sendJSON(res, 200, { events });
        }

        if (pathname === '/api/v1/ai/integration/events' && method === 'POST') {
            const body = await parseBody(req);
            const event = await getAIIntegration().publishEvent(body);
            return sendJSON(res, 201, { event });
        }

        if (pathname === '/api/v1/ai/integration/workflows' && method === 'GET') {
            const filter = Object.fromEntries(parsedUrl.searchParams.entries());
            const workflows = await getAIIntegration().listWorkflows(filter);
            return sendJSON(res, 200, { workflows });
        }

        if (pathname === '/api/v1/ai/integration/workflows' && method === 'POST') {
            const body = await parseBody(req);
            const workflow = await getAIIntegration().createWorkflow(body);
            return sendJSON(res, 201, { workflow });
        }

        if (pathname === '/api/v1/ai/integration/stats' && method === 'GET') {
            const stats = await getAIIntegration().getStats();
            return sendJSON(res, 200, stats);
        }

        if (pathname === '/api/v1/ai/integration/channels' && method === 'GET') {
            const channels = await getAIIntegration().getChannelStatus();
            return sendJSON(res, 200, { channels });
        }

        {
            const aiApproveMatch = pathname.match(/^\/api\/v1\/ai\/integration\/workflows\/([^/]+)\/approve$/);
            if (aiApproveMatch && method === 'POST') {
                const body = await parseBody(req);
                const wf = await getAIIntegration().approveWorkflow(aiApproveMatch[1], body.approvedBy, body.comment);
                return sendJSON(res, 200, { workflow: wf });
            }
        }

        {
            const aiDenyMatch = pathname.match(/^\/api\/v1\/ai\/integration\/workflows\/([^/]+)\/deny$/);
            if (aiDenyMatch && method === 'POST') {
                const body = await parseBody(req);
                const wf = await getAIIntegration().denyWorkflow(aiDenyMatch[1], body.deniedBy, body.reason);
                return sendJSON(res, 200, { workflow: wf });
            }
        }

        {
            const aiWfMatch = pathname.match(/^\/api\/v1\/ai\/integration\/workflows\/([^/]+)$/);
            if (aiWfMatch && method === 'GET') {
                const wf = await getAIIntegration().getWorkflow(aiWfMatch[1]);
                return sendJSON(res, 200, { workflow: wf });
            }
        }

        // -----------------------------------------------------------------------
        // B8. Grafana Dashboards
        // -----------------------------------------------------------------------

        const GRAFANA_DASHBOARDS = {
            'service-health': {
                title: 'Service Health',
                panels: [
                    { title: 'CPU Usage', type: 'graph', datasource: 'prometheus', targets: [{ expr: 'avg(rate(process_cpu_seconds_total[5m]))' }] },
                    { title: 'Memory Usage', type: 'graph', datasource: 'prometheus', targets: [{ expr: 'process_resident_memory_bytes' }] },
                    { title: 'Error Rate', type: 'graph', datasource: 'prometheus', targets: [{ expr: 'rate(http_requests_total{status=~"5.."}[5m])' }] },
                    { title: 'Latency p95', type: 'graph', datasource: 'prometheus', targets: [{ expr: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))' }] },
                ],
            },
            'sla-overview': {
                title: 'SLA Overview',
                panels: [
                    { title: 'SLA Compliance Timeline', type: 'graph', datasource: 'prometheus', targets: [{ expr: 'sla_compliance_ratio' }] },
                    { title: 'MTTR Gauge', type: 'gauge', datasource: 'prometheus', targets: [{ expr: 'avg(incident_resolution_duration_seconds)' }] },
                    { title: 'Breach Scatter', type: 'scatter', datasource: 'prometheus', targets: [{ expr: 'sla_breach_count' }] },
                ],
            },
            'cost-overview': {
                title: 'Cost Overview',
                panels: [
                    { title: 'Cost Per Service', type: 'bargauge', datasource: 'prometheus', targets: [{ expr: 'cost_per_service_dollars' }] },
                    { title: 'Budget vs Actual', type: 'graph', datasource: 'prometheus', targets: [{ expr: 'budget_total_dollars - cost_actual_dollars' }] },
                    { title: 'Cost Trend', type: 'graph', datasource: 'prometheus', targets: [{ expr: 'rate(cost_actual_dollars[24h])' }] },
                ],
            },
        };

        if (pathname === '/api/v1/grafana/dashboards' && method === 'GET') {
            const list = Object.entries(GRAFANA_DASHBOARDS).map(([name, d]) => ({ name, title: d.title, panelCount: d.panels.length }));
            return sendJSON(res, 200, { dashboards: list });
        }

        {
            const grafMatch = pathname.match(/^\/api\/v1\/grafana\/dashboards\/([^/]+)$/);
            if (grafMatch && method === 'GET') {
                const name = sanitize(grafMatch[1]);
                const dashboard = GRAFANA_DASHBOARDS[name];
                if (!dashboard) return sendError(res, 404, `Dashboard ${name} not found`);
                const body = JSON.stringify(dashboard, null, 2);
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="${name}.json"`,
                    'Content-Length': Buffer.byteLength(body),
                    ...SECURITY_HEADERS,
                });
                res.end(body);
                return;
            }
        }

        // -----------------------------------------------------------------------
        // B9. SLA Reports
        // -----------------------------------------------------------------------

        if (pathname === '/api/v1/sla/report/schedule' && method === 'GET') {
            const schedule = readJSONStore('sla-report-schedule.json', {});
            return sendJSON(res, 200, { schedule });
        }

        if (pathname === '/api/v1/sla/report/schedule' && method === 'POST') {
            const body = await parseBody(req);
            const schedule = {
                cronExpression: sanitize(body.cronExpression || '0 9 * * 1'),
                recipients: body.recipients || [],
                format: sanitize(body.format || 'html'),
                updatedAt: new Date().toISOString(),
            };
            writeJSONStore('sla-report-schedule.json', schedule);
            return sendJSON(res, 200, { schedule });
        }

        if (pathname === '/api/v1/sla/report/generate' && method === 'POST') {
            const slaManager = new SLAManager(ADMIN_HOME);
            const slaStatus = await slaManager.getStatus();
            const reportId = `sla_report_${Date.now()}`;
            const generatedAt = new Date().toISOString();
            const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>SLA Report</title>
<style>body{font-family:Arial,sans-serif;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f4f4f4}h1{color:#333}</style>
</head>
<body>
<h1>SLA Report — ${generatedAt}</h1>
<p>Generated by Milonexa Admin API</p>
<pre>${JSON.stringify(slaStatus, null, 2)}</pre>
</body>
</html>`;
            const history = readJSONStore('sla-report-history.json', []);
            history.push({ id: reportId, generatedAt, size: html.length });
            writeJSONStore('sla-report-history.json', history);
            res.writeHead(200, {
                'Content-Type': 'text/html',
                'Content-Length': Buffer.byteLength(html),
                ...SECURITY_HEADERS,
            });
            res.end(html);
            return;
        }

        if (pathname === '/api/v1/sla/report/history' && method === 'GET') {
            const history = readJSONStore('sla-report-history.json', []);
            return sendJSON(res, 200, { history });
        }

        return sendError(res, 404, `Not found: ${method} ${pathname}`);

    } catch (err) {
        log('error', `${method} ${pathname} — ${err.message}`);
        return sendError(res, 500, `Internal server error: ${err.message}`);
    }
}

// ---------------------------------------------------------------------------
// JSON store helpers
// ---------------------------------------------------------------------------

function readJSONStore(filename, defaultVal) {
    const p = path.join(ADMIN_HOME, filename);
    if (!fs.existsSync(p)) return typeof defaultVal === 'function' ? defaultVal() : defaultVal;
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return typeof defaultVal === 'function' ? defaultVal() : defaultVal; }
}

function writeJSONStore(filename, data) {
    if (!fs.existsSync(ADMIN_HOME)) fs.mkdirSync(ADMIN_HOME, { recursive: true });
    fs.writeFileSync(path.join(ADMIN_HOME, filename), JSON.stringify(data, null, 2), 'utf8');
}

// ---- Users ----
function getUsers() {
    return readJSONStore('users.json', () => {
        const mock = [
            { id: 'u1', name: 'Alice Johnson', email: 'alice@example.com', role: 'admin', status: 'active', createdAt: '2025-01-15T10:00:00Z', lastLogin: '2026-03-10T08:30:00Z' },
            { id: 'u2', name: 'Bob Smith', email: 'bob@example.com', role: 'moderator', status: 'active', createdAt: '2025-02-01T09:00:00Z', lastLogin: '2026-03-09T14:20:00Z' },
            { id: 'u3', name: 'Carol White', email: 'carol@example.com', role: 'user', status: 'active', createdAt: '2025-03-10T11:00:00Z', lastLogin: '2026-03-08T16:45:00Z' },
            { id: 'u4', name: 'Dave Brown', email: 'dave@example.com', role: 'user', status: 'suspended', createdAt: '2025-04-20T08:00:00Z', lastLogin: '2026-02-28T10:00:00Z' },
            { id: 'u5', name: 'Eve Davis', email: 'eve@example.com', role: 'viewer', status: 'active', createdAt: '2025-05-05T12:00:00Z', lastLogin: '2026-03-10T07:00:00Z' },
        ];
        writeJSONStore('users.json', mock);
        return mock;
    });
}
function saveUsers(data) { writeJSONStore('users.json', data); }

// ---- API Keys ----
function getApiKeys() { return readJSONStore('api-keys.json', []); }
function saveApiKeys(data) { writeJSONStore('api-keys.json', data); }

// ---- Rate Limits ----
function getRateLimits() {
    return readJSONStore('rate-limits.json', () => {
        const mock = [
            { ip: '192.168.1.100', userId: null, requestCount: 120, windowStart: new Date(Date.now() - 300000).toISOString(), blocked: false, violations: 0 },
            { ip: '10.0.0.55', userId: 'u3', requestCount: 450, windowStart: new Date(Date.now() - 60000).toISOString(), blocked: true, violations: 3 },
        ];
        writeJSONStore('rate-limits.json', mock);
        return mock;
    });
}
function saveRateLimits(data) { writeJSONStore('rate-limits.json', data); }

// ---- Alert Rules ----
function getAlertRules() {
    return readJSONStore('alert-rules.json', () => {
        const mock = [
            { id: 'rule_default1', name: 'High CPU', condition: 'cpu > threshold', threshold: 90, severity: 'critical', service: '*', enabled: true, createdAt: '2026-01-01T00:00:00Z' },
            { id: 'rule_default2', name: 'Memory Pressure', condition: 'memory > threshold', threshold: 85, severity: 'warning', service: '*', enabled: true, createdAt: '2026-01-01T00:00:00Z' },
        ];
        writeJSONStore('alert-rules.json', mock);
        return mock;
    });
}
function saveAlertRules(data) { writeJSONStore('alert-rules.json', data); }

// ---- AI Permissions ----
function getAIPermissions() {
    return readJSONStore('ai-permissions.json', () => {
        const mock = [
            { id: 'aip1', agent: 'ContentModerator', action: 'delete-post', resourceId: 'post_123', reason: 'Violates community guidelines', status: 'pending', requestedAt: new Date(Date.now() - 3600000).toISOString() },
            { id: 'aip2', agent: 'SpamDetector', action: 'suspend-user', resourceId: 'u99', reason: 'Automated spam detection threshold exceeded', status: 'pending', requestedAt: new Date(Date.now() - 7200000).toISOString() },
            { id: 'aip3', agent: 'DataCleaner', action: 'purge-records', resourceId: 'dataset_old', reason: 'Data retention policy: records older than 2 years', status: 'approved', requestedAt: new Date(Date.now() - 86400000).toISOString(), decidedAt: new Date(Date.now() - 82800000).toISOString() },
        ];
        writeJSONStore('ai-permissions.json', mock);
        return mock;
    });
}
function saveAIPermissions(data) { writeJSONStore('ai-permissions.json', data); }

// ---- Admin events ----
function getAdminEvents(limit) {
    const auditFile = path.join(ADMIN_HOME, 'audit.log');
    const eventsFile = path.join(ADMIN_HOME, 'admin-events.json');
    const events = [];
    if (fs.existsSync(auditFile)) {
        const lines = fs.readFileSync(auditFile, 'utf8').trim().split('\n').filter(Boolean);
        for (const l of lines.slice(-limit)) { try { events.push(JSON.parse(l)); } catch (_) { events.push({ raw: l, timestamp: new Date(0).toISOString() }); } }
    }
    if (fs.existsSync(eventsFile)) { try { events.push(...JSON.parse(fs.readFileSync(eventsFile, 'utf8'))); } catch (_) {} }
    events.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
    return events.slice(-limit);
}

function appendAuditEvent(evt) {
    const eventsFile = path.join(ADMIN_HOME, 'admin-events.json');
    const events = [];
    if (fs.existsSync(eventsFile)) { try { events.push(...JSON.parse(fs.readFileSync(eventsFile, 'utf8'))); } catch (_) {} }
    events.push({ ...evt, timestamp: new Date().toISOString() });
    if (!fs.existsSync(ADMIN_HOME)) fs.mkdirSync(ADMIN_HOME, { recursive: true });
    fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Minimal GraphQL parser and executor
// ---------------------------------------------------------------------------

function parseGraphQL(queryStr) {
    const q = queryStr.replace(/#[^\n]*/g, '').trim();
    const bodyMatch = q.match(/^(?:query|mutation)?\s*\w*\s*(?:\([^)]*\))?\s*\{([\s\S]+)\}\s*$/);
    const body = bodyMatch ? bodyMatch[1] : q.replace(/^\s*\{/, '').replace(/\}\s*$/, '');
    return { fields: extractGQLFields(body) };
}

function extractGQLFields(body) {
    const fields = {};
    const re = /(\w+)(\s*\([^)]*\))?\s*(?:\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\})?/g;
    let m;
    while ((m = re.exec(body)) !== null) {
        const [, name, argsRaw, subRaw] = m;
        if (!name) continue;
        fields[name] = { args: parseGQLArgs(argsRaw || ''), sub: subRaw ? extractGQLFields(subRaw) : null };
    }
    return fields;
}

function parseGQLArgs(argsStr) {
    const inner = argsStr.replace(/^\s*\(\s*/, '').replace(/\s*\)\s*$/, '');
    if (!inner) return {};
    const args = {};
    const re = /(\w+)\s*:\s*(?:"([^"]*)"|(\d+(?:\.\d+)?)|(true|false)|(\w+))/g;
    let m;
    while ((m = re.exec(inner)) !== null) {
        const [, key, strVal, numVal, boolVal, identVal] = m;
        if (strVal !== undefined) args[key] = strVal;
        else if (numVal !== undefined) args[key] = Number(numVal);
        else if (boolVal !== undefined) args[key] = boolVal === 'true';
        else args[key] = identVal;
    }
    return args;
}

async function executeGraphQL(fields) {
    const data = {};
    for (const [name, { args }] of Object.entries(fields)) {
        switch (name) {
            case 'metrics': {
                const filters = {};
                if (args.category) filters.category = args.category;
                if (args.service) filters.service = args.service;
                let list = new MetricsCollector(getDir('metrics')).query(filters);
                if (args.limit) list = list.slice(-Math.abs(args.limit));
                data.metrics = list;
                break;
            }
            case 'auditLog': {
                const limit = args.limit || 50;
                const auditFile = path.join(ADMIN_HOME, 'audit.log');
                let entries = [];
                if (fs.existsSync(auditFile)) {
                    const lines = fs.readFileSync(auditFile, 'utf8').trim().split('\n').filter(Boolean);
                    entries = lines.slice(-limit).map(l => { try { return JSON.parse(l); } catch (_) { return { raw: l }; } });
                }
                if (args.severity) entries = entries.filter(e => e.severity === args.severity);
                data.auditLog = entries;
                break;
            }
            case 'alerts': {
                const mgr = new AlertManager(getDir('alerts'));
                data.alerts = { rules: mgr.rules, stats: mgr.getStats() };
                break;
            }
            case 'sla': {
                const mgr = new SLAManager(getDir('sla'));
                data.sla = { summary: mgr.getSummary(), statuses: mgr.getStatus() };
                break;
            }
            case 'costs': {
                const analyzer = new CostAnalyzer(getDir('costs'));
                data.costs = { summary: analyzer.getSummary ? analyzer.getSummary() : {}, budget: analyzer.checkBudgetStatus() };
                break;
            }
            case 'dashboard': {
                const metrics = new MetricsCollector(getDir('metrics')).query();
                const alertStats = new AlertManager(getDir('alerts')).getStats();
                const slaSummary = new SLAManager(getDir('sla')).getSummary();
                data.dashboard = { timestamp: new Date().toISOString(), metrics: { count: metrics.length }, alerts: alertStats, sla: slaSummary };
                break;
            }
            default: break;
        }
    }
    return data;
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const server = http.createServer(handleRequest);

server.on('error', (err) => {
    log('error', `Server error: ${err.message}`);
    process.exit(1);
});

server.listen(PORT, HOST, () => {
    log('info', `Milonexa Admin REST API Server v6.0 started`);
    log('info', `Listening on http://${HOST}:${PORT}`);
    log('info', `Auth: ${API_KEY ? 'Bearer token enabled (ADMIN_API_KEY)' : HOST === '127.0.0.1' || HOST === 'localhost' ? 'Loopback-only (no ADMIN_API_KEY — set for non-loopback deployment)' : 'BLOCKED — set ADMIN_API_KEY to allow access from non-loopback host'}`);
    log('info', `Core: GET /health, /api/v1/dashboard, /api/v1/metrics, /api/v1/alerts, /api/v1/sla, /api/v1/webhooks, /api/v1/clusters, /api/v1/trends, /api/v1/compliance, /api/v1/costs, /api/v1/recommendations, /api/v1/audit`);
    log('info', `Q2-2026: POST /api/v1/graphql, /api/v1/users[/bulk|/export|/:id], /api/v1/api-keys, /api/v1/rate-limits, /api/v1/events[/replay|/stream], /api/v1/alerts/rules, /api/v1/ai/permissions, PUT|test|logs on /api/v1/webhooks/:id`);
    log('info', `Q3-2026: /api/v1/security/{rate-limits,ip-allowlist,sessions,anomalies,2fa,secrets,break-glass/{status,activate,revoke}}, /api/v1/ssh/{keys,keys/rotate,keys/:id,sessions}, /api/v1/gdpr/{export,erasure,consent,retention}, /api/v1/compliance/{report,soc2}`);
    if (!API_KEY) {
        if (HOST === '127.0.0.1' || HOST === 'localhost') {
            log('warn', 'WARNING: ADMIN_API_KEY is not set. API allows unauthenticated loopback access only.');
        } else {
            log('warn', 'WARNING: ADMIN_API_KEY is not set and server is not on loopback — all requests will be rejected with 401!');
            log('warn', 'Set ADMIN_API_KEY=<secret> to enable access.');
        }
    }
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
