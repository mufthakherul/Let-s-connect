'use strict';
/**
 * Opsgenie Alert API integration for Milonexa Admin
 *
 * Manages alerts via Opsgenie REST API v2.
 * Requires: OPSGENIE_API_KEY env var
 *
 * Usage (CLI):
 *   OPSGENIE_API_KEY=<key> node admin/bot/opsgenie/index.js test
 *   OPSGENIE_API_KEY=<key> node admin/bot/opsgenie/index.js create --message "Disk full" --priority P2
 *   OPSGENIE_API_KEY=<key> node admin/bot/opsgenie/index.js list --status open
 */

const https = require('https');

const OPSGENIE_API_HOST = 'api.opsgenie.com';
const OPSGENIE_API_BASE = '/v2/alerts';

class OpsgenieClient {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.OPSGENIE_API_KEY;
        if (!this.apiKey) {
            throw new Error('OPSGENIE_API_KEY is required');
        }
    }

    _request(method, path, body) {
        return new Promise((resolve, reject) => {
            const payload = body ? JSON.stringify(body) : undefined;
            const options = {
                hostname: OPSGENIE_API_HOST,
                port: 443,
                path,
                method,
                headers: {
                    Authorization: `GenieKey ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
                },
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const parsed = data ? JSON.parse(data) : {};
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(parsed);
                        } else {
                            reject(new Error(`Opsgenie API ${res.statusCode}: ${parsed.message || data}`));
                        }
                    } catch (e) {
                        reject(new Error(`Opsgenie parse error: ${e.message}`));
                    }
                });
            });

            req.on('error', reject);
            if (payload) req.write(payload);
            req.end();
        });
    }

    /**
     * Create a new alert.
     *
     * @param {{ message: string, description?: string, priority?: string, tags?: string[], details?: object }}
     * @returns {Promise<string>} requestId from Opsgenie
     */
    async createAlert({ message, description, priority = 'P3', tags = [], details = {} }) {
        const body = {
            message,
            description,
            priority,
            tags,
            details,
            source: 'milonexa-admin',
        };
        const result = await this._request('POST', OPSGENIE_API_BASE, body);
        return result.requestId || result.data?.requestId;
    }

    /**
     * Acknowledge an alert by its Opsgenie alert ID.
     * @param {string} alertId
     */
    async acknowledgeAlert(alertId) {
        return this._request('POST', `${OPSGENIE_API_BASE}/${encodeURIComponent(alertId)}/acknowledge`, {
            note: 'Acknowledged by Milonexa Admin',
        });
    }

    /**
     * Resolve an alert by its Opsgenie alert ID.
     * @param {string} alertId
     */
    async resolveAlert(alertId) {
        return this._request('POST', `${OPSGENIE_API_BASE}/${encodeURIComponent(alertId)}/resolve`, {
            note: 'Resolved by Milonexa Admin',
        });
    }

    /**
     * Close an alert by its Opsgenie alert ID.
     * @param {string} alertId
     */
    async closeAlert(alertId) {
        return this._request('POST', `${OPSGENIE_API_BASE}/${encodeURIComponent(alertId)}/close`, {
            note: 'Closed by Milonexa Admin',
        });
    }

    /**
     * List alerts, optionally filtered by status.
     * @param {string} [status]  'open' | 'acknowledged' | 'resolved' | 'closed'
     * @returns {Promise<object[]>}
     */
    async listAlerts(status) {
        const query = status ? `?query=status:${encodeURIComponent(status)}&limit=50` : '?limit=50';
        const result = await this._request('GET', `${OPSGENIE_API_BASE}${query}`);
        return result.data || [];
    }

    /**
     * Send a test alert to verify connectivity.
     */
    async test() {
        const requestId = await this.createAlert({
            message: 'Milonexa Admin — Opsgenie Integration Test',
            description: 'If you see this alert, the Opsgenie integration is configured correctly.',
            priority: 'P5',
            tags: ['test', 'milonexa'],
            details: { timestamp: new Date().toISOString() },
        });
        return { success: true, requestId };
    }
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

if (require.main === module) {
    const [, , command, ...rest] = process.argv;

    const parseArgs = (args) => {
        const out = {};
        for (let i = 0; i < args.length; i += 2) {
            out[args[i].replace(/^--/, '')] = args[i + 1];
        }
        return out;
    };

    (async () => {
        let client;
        try {
            client = new OpsgenieClient();
        } catch (err) {
            console.error('❌', err.message);
            process.exit(1);
        }

        try {
            if (command === 'test') {
                const result = await client.test();
                console.log('✅ Test alert created:', result.requestId);
            } else if (command === 'create') {
                const opts = parseArgs(rest);
                const id = await client.createAlert({
                    message: opts.message || 'Admin alert',
                    description: opts.description,
                    priority: opts.priority || 'P3',
                    tags: opts.tags ? opts.tags.split(',') : [],
                });
                console.log('✅ Alert created, requestId:', id);
            } else if (command === 'ack') {
                const opts = parseArgs(rest);
                await client.acknowledgeAlert(opts.id);
                console.log('✅ Alert acknowledged');
            } else if (command === 'resolve') {
                const opts = parseArgs(rest);
                await client.resolveAlert(opts.id);
                console.log('✅ Alert resolved');
            } else if (command === 'close') {
                const opts = parseArgs(rest);
                await client.closeAlert(opts.id);
                console.log('✅ Alert closed');
            } else if (command === 'list') {
                const opts = parseArgs(rest);
                const alerts = await client.listAlerts(opts.status);
                console.log(JSON.stringify(alerts, null, 2));
            } else {
                console.error('Usage: node index.js <test|create|ack|resolve|close|list> [--key value ...]');
                process.exit(1);
            }
        } catch (err) {
            console.error('❌ Opsgenie error:', err.message);
            process.exit(1);
        }
    })();
}

module.exports = { OpsgenieClient };
