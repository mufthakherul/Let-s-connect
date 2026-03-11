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

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ROOT_DIR = path.resolve(__dirname, '../..');
const ADMIN_HOME = path.join(ROOT_DIR, '.admin-cli');

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

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

function log(level, msg) {
    const ts = new Date().toISOString();
    process.stdout.write(`[${ts}] [${level}] ${msg}\n`);
}

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
        });
        res.end();
        return;
    }

    log('info', `${method} ${pathname}`);

    // Health — no auth required
    if (pathname === '/health' && method === 'GET') {
        return sendJSON(res, 200, { status: 'ok', timestamp: new Date().toISOString(), version: '5.0' });
    }

    // Auth check for all other routes
    if (!authenticate(req)) {
        return sendError(res, 401, 'Unauthorized. Provide a valid Bearer token via Authorization header.');
    }

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

        return sendError(res, 404, `Not found: ${method} ${pathname}`);

    } catch (err) {
        log('error', `${method} ${pathname} — ${err.message}`);
        return sendError(res, 500, `Internal server error: ${err.message}`);
    }
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
    log('info', `Milonexa Admin REST API Server v5.0 started`);
    log('info', `Listening on http://${HOST}:${PORT}`);
    log('info', `Auth: ${API_KEY ? 'Bearer token enabled (ADMIN_API_KEY)' : HOST === '127.0.0.1' || HOST === 'localhost' ? 'Loopback-only (no ADMIN_API_KEY — set for non-loopback deployment)' : 'BLOCKED — set ADMIN_API_KEY to allow access from non-loopback host'}`);
    log('info', `Endpoints: GET /health, /api/v1/dashboard, /api/v1/metrics, /api/v1/alerts, /api/v1/sla, /api/v1/webhooks, /api/v1/clusters, /api/v1/trends, /api/v1/compliance, /api/v1/costs, /api/v1/recommendations, /api/v1/audit`);
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
