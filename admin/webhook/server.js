/**
 * Milonexa Admin Webhook Server
 *
 * Standalone HTTP server that manages webhook configurations and fires
 * notifications to Slack, Teams, PagerDuty, Discord, and generic endpoints.
 *
 * Environment variables:
 *   ENABLE_ADMIN_WEBHOOK   - Must be 'true' to start (required)
 *   ADMIN_WEBHOOK_PORT     - Listening port (default: 8889)
 *   ADMIN_WEBHOOK_HOST     - Listening host (default: 0.0.0.0)
 *   ADMIN_WEBHOOK_SECRET   - Bearer token for API auth (required on non-loopback)
 *   ADMIN_HOME             - Base dir for data storage (default: <repo-root>/.admin-cli)
 *
 * @module milonexa-admin-webhook
 */

'use strict';

const http    = require('http');
const https   = require('https');
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');
const { URL } = require('url');
const os      = require('os');

// ---------------------------------------------------------------------------
// Guard: server must be explicitly enabled
// ---------------------------------------------------------------------------

if (process.env.ENABLE_ADMIN_WEBHOOK !== 'true') {
    console.log('Webhook server disabled (set ENABLE_ADMIN_WEBHOOK=true to enable)');
    process.exit(0);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PORT        = parseInt(process.env.ADMIN_WEBHOOK_PORT || '8889', 10);
const HOST        = process.env.ADMIN_WEBHOOK_HOST || '0.0.0.0';
const SECRET      = process.env.ADMIN_WEBHOOK_SECRET || '';
const REPO_ROOT_CANDIDATE = path.resolve(__dirname, '..', '..');
const ROOT_DIR = fs.existsSync(path.join(REPO_ROOT_CANDIDATE, 'docker-compose.yml'))
    ? REPO_ROOT_CANDIDATE
    : path.resolve(__dirname, '..');
const ADMIN_HOME  = process.env.ADMIN_HOME || path.join(ROOT_DIR, '.admin-cli');
const STORAGE_DIR = path.join(ADMIN_HOME, 'webhooks');
const WEBHOOKS_FILE = path.join(STORAGE_DIR, 'webhooks.json');
const HISTORY_FILE  = path.join(STORAGE_DIR, 'history.json');

const MAX_HISTORY    = 1000;
const HISTORY_LIMIT  = 100;   // default GET /history page size
const MAX_RETRIES    = 3;
const REQUEST_TIMEOUT_MS = 10_000;

/** Loopback addresses that do not require auth when SECRET is unset. */
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

// Severity → Slack/Discord colour hex
const COLOUR_MAP = {
    info:     '#36a64f',
    warning:  '#ffcc00',
    critical: '#ff0000',
};

// Severity → integer for Discord embed colour
const DISCORD_COLOUR_MAP = {
    info:     0x36a64f,
    warning:  0xffcc00,
    critical: 0xff0000,
};

// ---------------------------------------------------------------------------
// WebhookServer class
// ---------------------------------------------------------------------------

class WebhookServer {
    constructor() {
        /** @type {http.Server|null} */
        this.server = null;
        /** @type {Array<object>} */
        this.webhooks = [];
        /** @type {Array<object>} */
        this.history = [];

        this._ensureStorageDir();
        this.loadConfig();
        this.loadHistory();
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    /**
     * Start the HTTP server.
     * @returns {Promise<void>}
     */
    start() {
        return new Promise((resolve, reject) => {
            this._validateStartupConfig();

            this.server = http.createServer((req, res) => {
                this.handleRequest(req, res).catch(err => {
                    console.error('[webhook-server] Unhandled error:', err);
                    this.respondError(res, 500, 'Internal server error');
                });
            });

            this.server.on('error', reject);
            this.server.listen(PORT, HOST, () => {
                const addr = this.server.address();
                console.log(`[webhook-server] Listening on ${addr.address}:${addr.port}`);
                console.log(`[webhook-server] Auth: ${SECRET ? 'Bearer token required' : 'OPEN (loopback only)'}`);
                console.log(`[webhook-server] Storage: ${STORAGE_DIR}`);
                resolve();
            });
        });
    }

    /**
     * Gracefully stop the server.
     * @returns {Promise<void>}
     */
    stop() {
        return new Promise((resolve) => {
            if (!this.server) return resolve();
            this.server.close(() => {
                console.log('[webhook-server] Stopped');
                resolve();
            });
        });
    }

    // -------------------------------------------------------------------------
    // Request dispatch
    // -------------------------------------------------------------------------

    /**
     * Main request handler — parses URL, routes, enforces auth.
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse}  res
     * @returns {Promise<void>}
     */
    async handleRequest(req, res) {
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname  = parsedUrl.pathname.replace(/\/+$/, '') || '/';
        const method    = req.method.toUpperCase();

        // CORS pre-flight (permissive for admin use)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        if (method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        // Health check — no auth required
        if (pathname === '/health' && method === 'GET') {
            return this.handleHealth(req, res);
        }

        // All /api/* routes require authentication
        if (pathname.startsWith('/api/')) {
            const authErr = this.authenticate(req);
            if (authErr) {
                res.setHeader('WWW-Authenticate', 'Bearer realm="admin-webhook"');
                return this.respondError(res, 401, authErr);
            }
        }

        // ---- Route table ------------------------------------------------
        // GET  /api/v1/webhooks
        if (pathname === '/api/v1/webhooks' && method === 'GET') {
            return this.handleListWebhooks(req, res);
        }
        // POST /api/v1/webhooks
        if (pathname === '/api/v1/webhooks' && method === 'POST') {
            return this.handleAddWebhook(req, res);
        }
        // GET  /api/v1/webhooks/:id
        if (/^\/api\/v1\/webhooks\/[^/]+$/.test(pathname) && method === 'GET') {
            const id = pathname.split('/').pop();
            return this.handleGetWebhook(req, res, id);
        }
        // PUT  /api/v1/webhooks/:id
        if (/^\/api\/v1\/webhooks\/[^/]+$/.test(pathname) && method === 'PUT') {
            const id = pathname.split('/').pop();
            return this.handleUpdateWebhook(req, res, id);
        }
        // DELETE /api/v1/webhooks/:id
        if (/^\/api\/v1\/webhooks\/[^/]+$/.test(pathname) && method === 'DELETE') {
            const id = pathname.split('/').pop();
            return this.handleDeleteWebhook(req, res, id);
        }
        // POST /api/v1/fire
        if (pathname === '/api/v1/fire' && method === 'POST') {
            return this.handleFire(req, res);
        }
        // GET  /api/v1/history
        if (pathname === '/api/v1/history' && method === 'GET') {
            return this.handleHistory(req, res);
        }
        // GET  /api/v1/stats
        if (pathname === '/api/v1/stats' && method === 'GET') {
            return this.handleStats(req, res);
        }
        // POST /api/v1/retry/:id
        if (/^\/api\/v1\/retry\/[^/]+$/.test(pathname) && method === 'POST') {
            const id = pathname.split('/').pop();
            return this.handleRetry(req, res, id);
        }

        return this.respondError(res, 404, `Route not found: ${method} ${pathname}`);
    }

    // -------------------------------------------------------------------------
    // Authentication
    // -------------------------------------------------------------------------

    /**
     * Validate the Authorization: Bearer <token> header.
     *
     * When SECRET is empty the server is only safe on loopback; reject
     * requests from non-loopback addresses in that case.
     *
     * @param {http.IncomingMessage} req
     * @returns {string|null} Error message, or null if authenticated.
     */
    authenticate(req) {
        const remoteAddr = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
        const isLoopback = LOOPBACK_HOSTS.has(remoteAddr);

        if (!SECRET) {
            if (!isLoopback) {
                return 'No ADMIN_WEBHOOK_SECRET configured — API access is restricted to loopback';
            }
            // No secret and loopback → allow without a token
            return null;
        }

        const authHeader = req.headers['authorization'] || '';
        if (!authHeader.startsWith('Bearer ')) {
            return 'Missing or malformed Authorization header (expected: Bearer <token>)';
        }

        const provided = authHeader.slice('Bearer '.length).trim();
        // Constant-time comparison to prevent timing attacks
        if (!this._safeCompare(provided, SECRET)) {
            return 'Invalid bearer token';
        }

        return null;
    }

    /**
     * Constant-time string comparison.
     * @param {string} a
     * @param {string} b
     * @returns {boolean}
     */
    _safeCompare(a, b) {
        const bufA = Buffer.from(String(a));
        const bufB = Buffer.from(String(b));
        if (bufA.length !== bufB.length) {
            // Still run timingSafeEqual on equal-length buffers to avoid leaking length
            crypto.timingSafeEqual(bufA, bufA);
            return false;
        }
        return crypto.timingSafeEqual(bufA, bufB);
    }

    // -------------------------------------------------------------------------
    // Route handlers
    // -------------------------------------------------------------------------

    /** GET /health */
    handleHealth(_req, res) {
        this.respond(res, 200, {
            status:    'ok',
            service:   'milonexa-admin-webhook',
            uptime:    process.uptime(),
            timestamp: new Date().toISOString(),
            webhooks:  this.webhooks.length,
        });
    }

    /** GET /api/v1/webhooks */
    handleListWebhooks(_req, res) {
        this.respond(res, 200, { webhooks: this.webhooks });
    }

    /** GET /api/v1/webhooks/:id */
    handleGetWebhook(_req, res, id) {
        const hook = this.webhooks.find(w => w.id === id);
        if (!hook) return this.respondError(res, 404, `Webhook not found: ${id}`);
        this.respond(res, 200, { webhook: hook });
    }

    /**
     * POST /api/v1/webhooks
     * Body: { type, url, name, events }
     */
    async handleAddWebhook(req, res) {
        let body;
        try {
            body = await this._readBody(req);
        } catch (err) {
            return this.respondError(res, 400, `Bad request body: ${err.message}`);
        }

        const validTypes  = ['slack', 'teams', 'pagerduty', 'discord', 'generic'];
        const validEvents = ['alert', 'deploy', 'incident', 'system'];

        if (!body.type || !validTypes.includes(body.type)) {
            return this.respondError(res, 422, `Invalid type. Must be one of: ${validTypes.join(', ')}`);
        }
        if (!body.url || typeof body.url !== 'string') {
            return this.respondError(res, 422, 'url is required and must be a string');
        }
        if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
            return this.respondError(res, 422, 'name is required and must be a non-empty string');
        }
        if (body.events !== undefined) {
            if (!Array.isArray(body.events) || body.events.some(e => !validEvents.includes(e))) {
                return this.respondError(res, 422, `Invalid events. Each must be one of: ${validEvents.join(', ')}`);
            }
        }
        try {
            new URL(body.url); // validate URL syntax
        } catch (_) {
            return this.respondError(res, 422, `Invalid URL: ${body.url}`);
        }

        const hook = {
            id:        this.generateId(),
            type:      body.type,
            url:       body.url,
            name:      body.name.trim(),
            events:    body.events || validEvents,
            secret:    body.secret  || '',
            enabled:   body.enabled !== false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        this.webhooks.push(hook);
        this.saveConfig();

        console.log(`[webhook-server] Added webhook: ${hook.id} (${hook.type}) "${hook.name}"`);
        this.respond(res, 201, { webhook: hook });
    }

    /**
     * PUT /api/v1/webhooks/:id
     * Body: partial { type, url, name, events, secret, enabled }
     */
    async handleUpdateWebhook(req, res, id) {
        const hook = this.webhooks.find(w => w.id === id);
        if (!hook) return this.respondError(res, 404, `Webhook not found: ${id}`);

        let body;
        try {
            body = await this._readBody(req);
        } catch (err) {
            return this.respondError(res, 400, `Bad request body: ${err.message}`);
        }

        const validTypes  = ['slack', 'teams', 'pagerduty', 'discord', 'generic'];
        const validEvents = ['alert', 'deploy', 'incident', 'system'];

        if (body.type !== undefined && !validTypes.includes(body.type)) {
            return this.respondError(res, 422, `Invalid type. Must be one of: ${validTypes.join(', ')}`);
        }
        if (body.url !== undefined) {
            try { new URL(body.url); } catch (_) {
                return this.respondError(res, 422, `Invalid URL: ${body.url}`);
            }
        }
        if (body.events !== undefined) {
            if (!Array.isArray(body.events) || body.events.some(e => !validEvents.includes(e))) {
                return this.respondError(res, 422, `Invalid events. Each must be one of: ${validEvents.join(', ')}`);
            }
        }
        if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
            return this.respondError(res, 422, 'name must be a non-empty string');
        }

        if (body.type    !== undefined) hook.type    = body.type;
        if (body.url     !== undefined) hook.url     = body.url;
        if (body.name    !== undefined) hook.name    = body.name.trim();
        if (body.events  !== undefined) hook.events  = body.events;
        if (body.secret  !== undefined) hook.secret  = body.secret;
        if (body.enabled !== undefined) hook.enabled = Boolean(body.enabled);
        hook.updatedAt = new Date().toISOString();

        this.saveConfig();
        console.log(`[webhook-server] Updated webhook: ${hook.id}`);
        this.respond(res, 200, { webhook: hook });
    }

    /** DELETE /api/v1/webhooks/:id */
    handleDeleteWebhook(_req, res, id) {
        const idx = this.webhooks.findIndex(w => w.id === id);
        if (idx === -1) return this.respondError(res, 404, `Webhook not found: ${id}`);

        const [removed] = this.webhooks.splice(idx, 1);
        this.saveConfig();

        console.log(`[webhook-server] Deleted webhook: ${removed.id} "${removed.name}"`);
        this.respond(res, 200, { deleted: removed.id });
    }

    /**
     * POST /api/v1/fire
     * Body: { event, title, message, severity, targets }
     */
    async handleFire(req, res) {
        let body;
        try {
            body = await this._readBody(req);
        } catch (err) {
            return this.respondError(res, 400, `Bad request body: ${err.message}`);
        }

        const validEvents     = ['alert', 'deploy', 'incident', 'system'];
        const validSeverities = ['info', 'warning', 'critical'];

        if (!body.event || !validEvents.includes(body.event)) {
            return this.respondError(res, 422, `event is required. Must be one of: ${validEvents.join(', ')}`);
        }
        if (!body.message || typeof body.message !== 'string') {
            return this.respondError(res, 422, 'message is required and must be a string');
        }
        const severity = validSeverities.includes(body.severity) ? body.severity : 'info';
        const title    = body.title || `[${body.event.toUpperCase()}] Milonexa notification`;

        // Resolve target webhooks
        let targets;
        if (body.targets === 'all' || body.targets === undefined) {
            targets = this.webhooks.filter(w => w.enabled && w.events.includes(body.event));
        } else if (Array.isArray(body.targets)) {
            targets = this.webhooks.filter(
                w => body.targets.includes(w.id) && w.enabled
            );
        } else {
            return this.respondError(res, 422, 'targets must be "all" or an array of webhook IDs');
        }

        if (targets.length === 0) {
            return this.respond(res, 200, { fired: 0, results: [], message: 'No matching enabled webhooks' });
        }

        const payload = {
            event:    body.event,
            title,
            message:  body.message,
            severity,
            firedAt:  new Date().toISOString(),
        };

        const results = await Promise.allSettled(
            targets.map(hook => this._fireWithRetry(hook, payload))
        );

        const summary = results.map((r, i) => {
            if (r.status === 'fulfilled') return r.value;
            return {
                id:      targets[i].id,
                name:    targets[i].name,
                type:    targets[i].type,
                success: false,
                error:   r.reason?.message || String(r.reason),
            };
        });

        const histEntry = {
            id:       this.generateId(),
            firedAt:  payload.firedAt,
            event:    body.event,
            title,
            message:  body.message,
            severity,
            results:  summary,
            payload,  // stored for retry
        };
        this.saveHistory(histEntry);

        const successCount = summary.filter(r => r.success).length;
        console.log(`[webhook-server] Fired event "${body.event}": ${successCount}/${summary.length} succeeded`);
        this.respond(res, 200, { fired: summary.length, succeeded: successCount, results: summary });
    }

    /** GET /api/v1/history */
    handleHistory(req, res) {
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const limit = Math.min(
            parseInt(parsedUrl.searchParams.get('limit') || String(HISTORY_LIMIT), 10),
            MAX_HISTORY
        );
        const entries = this.history.slice(-limit).reverse();
        this.respond(res, 200, { total: this.history.length, entries });
    }

    /** GET /api/v1/stats */
    handleStats(_req, res) {
        const byType = {};
        for (const hook of this.webhooks) {
            byType[hook.type] = (byType[hook.type] || 0) + 1;
        }

        let totalDeliveries = 0;
        let successCount    = 0;
        let failedCount     = 0;

        for (const entry of this.history) {
            for (const r of (entry.results || [])) {
                totalDeliveries++;
                if (r.success) successCount++;
                else failedCount++;
            }
        }

        this.respond(res, 200, {
            webhooks: {
                total:   this.webhooks.length,
                enabled: this.webhooks.filter(w => w.enabled).length,
                byType,
            },
            deliveries: {
                total:   totalDeliveries,
                success: successCount,
                failed:  failedCount,
                history: this.history.length,
            },
        });
    }

    /**
     * POST /api/v1/retry/:id
     * Retry a failed delivery record from history.
     */
    async handleRetry(req, res, id) {
        const entry = this.history.find(h => h.id === id);
        if (!entry) return this.respondError(res, 404, `History entry not found: ${id}`);

        // Re-fire only the failed targets from this history entry
        const failedIds = (entry.results || [])
            .filter(r => !r.success)
            .map(r => r.id);

        if (failedIds.length === 0) {
            return this.respond(res, 200, { message: 'All deliveries in this entry already succeeded', retried: 0 });
        }

        const targets = this.webhooks.filter(w => failedIds.includes(w.id));
        if (targets.length === 0) {
            return this.respondError(res, 404, 'None of the failed target webhooks still exist');
        }

        const payload = entry.payload || {
            event:   entry.event,
            title:   entry.title,
            message: entry.message,
            severity: entry.severity,
            firedAt: new Date().toISOString(),
        };
        payload.retriedAt = new Date().toISOString();

        const results = await Promise.allSettled(
            targets.map(hook => this._fireWithRetry(hook, payload))
        );

        const summary = results.map((r, i) => {
            if (r.status === 'fulfilled') return r.value;
            return {
                id:      targets[i].id,
                name:    targets[i].name,
                type:    targets[i].type,
                success: false,
                error:   r.reason?.message || String(r.reason),
            };
        });

        // Append a new history entry for the retry
        const retryEntry = {
            id:       this.generateId(),
            firedAt:  new Date().toISOString(),
            event:    entry.event,
            title:    entry.title,
            message:  entry.message,
            severity: entry.severity,
            isRetry:  true,
            originalId: id,
            results:  summary,
            payload,
        };
        this.saveHistory(retryEntry);

        const successCount = summary.filter(r => r.success).length;
        console.log(`[webhook-server] Retry of ${id}: ${successCount}/${summary.length} succeeded`);
        this.respond(res, 200, { retried: summary.length, succeeded: successCount, results: summary });
    }

    // -------------------------------------------------------------------------
    // Webhook firing
    // -------------------------------------------------------------------------

    /**
     * Fire a single webhook with up to MAX_RETRIES retries.
     * @param {object} hook    Webhook config
     * @param {object} payload Event payload
     * @returns {Promise<object>} Result record
     */
    async _fireWithRetry(hook, payload) {
        const attempts = [];

        const attempt = async () => {
            const start = Date.now();
            try {
                const statusCode = await this.fireWebhook(hook, payload);
                attempts.push({ success: true, statusCode, duration: Date.now() - start });
                return true;
            } catch (err) {
                attempts.push({ success: false, error: err.message, duration: Date.now() - start });
                throw err;
            }
        };

        let lastError;
        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                await this.retryWithBackoff(attempt, 1);
                return {
                    id:       hook.id,
                    name:     hook.name,
                    type:     hook.type,
                    success:  true,
                    attempts,
                };
            } catch (err) {
                lastError = err;
                if (i < MAX_RETRIES - 1) {
                    const delay = Math.pow(2, i) * 500; // 500ms, 1000ms, 2000ms
                    await this._sleep(delay);
                }
            }
        }

        return {
            id:       hook.id,
            name:     hook.name,
            type:     hook.type,
            success:  false,
            error:    lastError?.message || 'Unknown error',
            attempts,
        };
    }

    /**
     * Dispatch to the correct sender based on webhook type.
     * @param {object} hook    Webhook config
     * @param {object} payload Event payload
     * @returns {Promise<number>} HTTP status code
     */
    async fireWebhook(hook, payload) {
        switch (hook.type) {
            case 'slack':      return this._fireSlack(hook, payload);
            case 'teams':      return this._fireTeams(hook, payload);
            case 'pagerduty':  return this._firePagerDuty(hook, payload);
            case 'discord':    return this._fireDiscord(hook, payload);
            case 'generic':    return this._fireGeneric(hook, payload);
            default:
                throw new Error(`Unsupported webhook type: ${hook.type}`);
        }
    }

    /**
     * Execute `fn` once; this wrapper exists so callers can substitute their
     * own retry logic. The actual retry loop lives in `_fireWithRetry`.
     * @param {Function} fn
     * @param {number}   _maxRetries  (unused — kept for API compatibility)
     * @returns {Promise<*>}
     */
    async retryWithBackoff(fn, _maxRetries) {
        return fn();
    }

    // ---- Type-specific senders ------------------------------------------

    /** @param {object} hook  @param {object} payload  @returns {Promise<number>} */
    _fireSlack(hook, payload) {
        const colour = COLOUR_MAP[payload.severity] || COLOUR_MAP.info;
        const body = JSON.stringify({
            username:    'Milonexa Admin',
            icon_emoji:  ':robot_face:',
            attachments: [{
                color:    colour,
                title:    payload.title,
                text:     payload.message,
                fields:   [
                    { title: 'Event',    value: payload.event,    short: true },
                    { title: 'Severity', value: payload.severity, short: true },
                ],
                footer: 'Milonexa Admin Webhook',
                ts:     Math.floor(Date.now() / 1000),
            }],
        });
        return this._httpPost(hook.url, body, { 'Content-Type': 'application/json' });
    }

    /** @param {object} hook  @param {object} payload  @returns {Promise<number>} */
    _fireTeams(hook, payload) {
        const themeMap = { info: '0078D4', warning: 'FFC107', critical: 'D32F2F' };
        const body = JSON.stringify({
            '@type':    'MessageCard',
            '@context': 'http://schema.org/extensions',
            themeColor: themeMap[payload.severity] || '0078D4',
            summary:    payload.title,
            sections:   [{
                activityTitle: `**${payload.title}**`,
                activityText:  payload.message,
                facts: [
                    { name: 'Event',    value: payload.event },
                    { name: 'Severity', value: payload.severity },
                    { name: 'Time',     value: payload.firedAt },
                ],
            }],
        });
        return this._httpPost(hook.url, body, { 'Content-Type': 'application/json' });
    }

    /**
     * PagerDuty Events API v2.
     * The `url` field on the webhook config holds the routing/integration key.
     * @param {object} hook  @param {object} payload  @returns {Promise<number>}
     */
    _firePagerDuty(hook, payload) {
        const sevMap = { info: 'info', warning: 'warning', critical: 'critical' };
        const body = JSON.stringify({
            routing_key:   hook.url,          // integration key stored in url field
            event_action:  'trigger',
            payload: {
                summary:   `${payload.title}: ${payload.message}`,
                timestamp:  payload.firedAt || new Date().toISOString(),
                severity:   sevMap[payload.severity] || 'info',
                source:     'milonexa-admin-webhook',
                custom_details: {
                    event:   payload.event,
                    message: payload.message,
                },
            },
        });
        return this._httpPost(
            'https://events.pagerduty.com/v2/enqueue',
            body,
            { 'Content-Type': 'application/json' }
        );
    }

    /** @param {object} hook  @param {object} payload  @returns {Promise<number>} */
    _fireDiscord(hook, payload) {
        const colour = DISCORD_COLOUR_MAP[payload.severity] || DISCORD_COLOUR_MAP.info;
        const body = JSON.stringify({
            embeds: [{
                title:       payload.title,
                description: payload.message,
                color:       colour,
                fields: [
                    { name: 'Event',    value: payload.event,    inline: true },
                    { name: 'Severity', value: payload.severity, inline: true },
                ],
                footer:    { text: 'Milonexa Admin Webhook' },
                timestamp: payload.firedAt || new Date().toISOString(),
            }],
        });
        return this._httpPost(hook.url, body, { 'Content-Type': 'application/json' });
    }

    /**
     * Generic webhook: POST full payload JSON; add Authorization header when
     * the hook has a `secret` field.
     * @param {object} hook  @param {object} payload  @returns {Promise<number>}
     */
    _fireGeneric(hook, payload) {
        const body = JSON.stringify({
            event:     payload.event,
            title:     payload.title,
            message:   payload.message,
            severity:  payload.severity,
            firedAt:   payload.firedAt || new Date().toISOString(),
            source:    'milonexa-admin-webhook',
        });
        const headers = { 'Content-Type': 'application/json' };
        if (hook.secret) {
            headers['Authorization'] = `Bearer ${hook.secret}`;
        }
        return this._httpPost(hook.url, body, headers);
    }

    // -------------------------------------------------------------------------
    // Low-level HTTP helper
    // -------------------------------------------------------------------------

    /**
     * Make an HTTP/HTTPS POST request.
     * @param {string} urlStr
     * @param {string} body
     * @param {object} headers
     * @returns {Promise<number>} HTTP status code
     */
    _httpPost(urlStr, body, headers = {}) {
        return new Promise((resolve, reject) => {
            let parsedUrl;
            try {
                parsedUrl = new URL(urlStr);
            } catch (_) {
                return reject(new Error(`Invalid URL: ${urlStr}`));
            }

            const options = {
                hostname: parsedUrl.hostname,
                port:     parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path:     parsedUrl.pathname + (parsedUrl.search || ''),
                method:   'POST',
                headers:  {
                    ...headers,
                    'Content-Length': Buffer.byteLength(body),
                    'User-Agent':     'milonexa-admin-webhook/1.0.0',
                },
                timeout: REQUEST_TIMEOUT_MS,
            };

            const lib = parsedUrl.protocol === 'https:' ? https : http;
            const reqObj = lib.request(options, (response) => {
                // Drain response body to free socket
                response.resume();
                response.on('end', () => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        resolve(response.statusCode);
                    } else {
                        reject(new Error(`HTTP ${response.statusCode} from ${parsedUrl.hostname}`));
                    }
                });
            });

            reqObj.on('error', reject);
            reqObj.on('timeout', () => {
                reqObj.destroy();
                reject(new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms: ${parsedUrl.hostname}`));
            });

            reqObj.write(body);
            reqObj.end();
        });
    }

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    /** Ensure the storage directory exists. */
    _ensureStorageDir() {
        if (!fs.existsSync(STORAGE_DIR)) {
            fs.mkdirSync(STORAGE_DIR, { recursive: true });
        }
    }

    /** Persist webhook configs to disk. */
    saveConfig() {
        fs.writeFileSync(WEBHOOKS_FILE, JSON.stringify(this.webhooks, null, 2), 'utf8');
    }

    /**
     * Append an entry to the delivery history and persist (capped at MAX_HISTORY).
     * @param {object} entry
     */
    saveHistory(entry) {
        this.history.push(entry);
        if (this.history.length > MAX_HISTORY) {
            this.history = this.history.slice(-MAX_HISTORY);
        }
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(this.history, null, 2), 'utf8');
    }

    /** Load webhook configs from disk (or initialise empty). */
    loadConfig() {
        if (fs.existsSync(WEBHOOKS_FILE)) {
            try {
                this.webhooks = JSON.parse(fs.readFileSync(WEBHOOKS_FILE, 'utf8')) || [];
            } catch (err) {
                console.warn(`[webhook-server] Could not parse ${WEBHOOKS_FILE}: ${err.message}`);
                this.webhooks = [];
            }
        } else {
            this.webhooks = [];
        }
    }

    /** Load delivery history from disk (or initialise empty). */
    loadHistory() {
        if (fs.existsSync(HISTORY_FILE)) {
            try {
                this.history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')) || [];
            } catch (err) {
                console.warn(`[webhook-server] Could not parse ${HISTORY_FILE}: ${err.message}`);
                this.history = [];
            }
        } else {
            this.history = [];
        }
    }

    // -------------------------------------------------------------------------
    // Utilities
    // -------------------------------------------------------------------------

    /**
     * Generate a short, unique, URL-safe ID.
     * @returns {string}
     */
    generateId() {
        return crypto.randomBytes(8).toString('hex');
    }

    /**
     * Read and parse the JSON request body.
     * @param {http.IncomingMessage} req
     * @returns {Promise<object>}
     */
    _readBody(req) {
        return new Promise((resolve, reject) => {
            let raw = '';
            req.on('data', chunk => {
                raw += chunk;
                if (raw.length > 1_048_576) { // 1 MiB guard
                    req.destroy();
                    reject(new Error('Request body too large (max 1 MiB)'));
                }
            });
            req.on('end', () => {
                if (!raw.trim()) {
                    return reject(new Error('Empty request body; expected JSON'));
                }
                try {
                    resolve(JSON.parse(raw));
                } catch (_) {
                    reject(new Error('Invalid JSON body'));
                }
            });
            req.on('error', reject);
        });
    }

    /**
     * Send a JSON success response.
     * @param {http.ServerResponse} res
     * @param {number}              status
     * @param {object}              data
     */
    respond(res, status, data) {
        const body = JSON.stringify(data);
        res.writeHead(status, {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(body),
        });
        res.end(body);
    }

    /**
     * Send a JSON error response.
     * @param {http.ServerResponse} res
     * @param {number}              status
     * @param {string}              message
     */
    respondError(res, status, message) {
        this.respond(res, status, { error: message });
    }

    /** @param {number} ms @returns {Promise<void>} */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /** Validate startup configuration and emit warnings. */
    _validateStartupConfig() {
        if (!SECRET) {
            console.warn('[webhook-server] WARNING: ADMIN_WEBHOOK_SECRET is not set.');
            console.warn('[webhook-server] API access will be restricted to loopback (127.0.0.1 / ::1).');
        }
        if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
            throw new Error(`Invalid ADMIN_WEBHOOK_PORT: ${process.env.ADMIN_WEBHOOK_PORT}`);
        }
    }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const server = new WebhookServer();

server.start().catch(err => {
    console.error('[webhook-server] Fatal startup error:', err.message);
    process.exit(1);
});

// Graceful shutdown on SIGTERM / SIGINT
async function shutdown(signal) {
    console.log(`\n[webhook-server] Received ${signal} — shutting down...`);
    await server.stop();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = { WebhookServer }; // allow require() in tests
