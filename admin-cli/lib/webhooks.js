/**
 * Webhook Integrations Module (Phase E)
 *
 * Sends notifications to Slack, Microsoft Teams, PagerDuty, and GitHub.
 * Uses Node.js built-in https module — no external dependencies required.
 *
 * Webhook config is stored in .admin-cli/webhooks/config.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// ---------------------------------------------------------------------------
// WebhookManager
// ---------------------------------------------------------------------------

class WebhookManager {
    constructor(webhooksDir) {
        this.webhooksDir = webhooksDir;
        this.configFile = path.join(webhooksDir, 'config.json');
        this.historyFile = path.join(webhooksDir, 'history.json');
        this.ensureDir();
        this.config = this.loadConfig();
        this.history = this.loadHistory();
    }

    ensureDir() {
        if (!fs.existsSync(this.webhooksDir)) {
            fs.mkdirSync(this.webhooksDir, { recursive: true });
        }
    }

    loadConfig() {
        if (fs.existsSync(this.configFile)) {
            try {
                return JSON.parse(fs.readFileSync(this.configFile, 'utf8')) || {};
            } catch (_) { return {}; }
        }
        return {
            slack: [],
            teams: [],
            pagerduty: [],
            github: [],
        };
    }

    loadHistory() {
        if (fs.existsSync(this.historyFile)) {
            try {
                return JSON.parse(fs.readFileSync(this.historyFile, 'utf8')) || [];
            } catch (_) { return []; }
        }
        return [];
    }

    saveConfig() {
        fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2), 'utf8');
    }

    saveHistory() {
        const trimmed = this.history.slice(-500);
        fs.writeFileSync(this.historyFile, JSON.stringify(trimmed, null, 2), 'utf8');
    }

    /**
     * Add a webhook endpoint.
     * @param {string} type  slack|teams|pagerduty|github
     * @param {object} cfg   { name, url, [token], [channel], [severity] }
     */
    addWebhook(type, cfg) {
        const validTypes = ['slack', 'teams', 'pagerduty', 'github'];
        if (!validTypes.includes(type)) throw new Error(`Unknown webhook type: ${type}`);
        if (!cfg.url && type !== 'pagerduty') throw new Error('url is required');
        if (!cfg.name) throw new Error('name is required');

        if (!this.config[type]) this.config[type] = [];
        const entry = {
            id: Date.now().toString(36),
            name: cfg.name,
            url: cfg.url || '',
            token: cfg.token || '',
            channel: cfg.channel || '',
            severity: cfg.severity || 'all',
            enabled: true,
            createdAt: new Date().toISOString(),
        };
        this.config[type].push(entry);
        this.saveConfig();
        return entry;
    }

    /**
     * Remove a webhook by id.
     */
    removeWebhook(type, id) {
        if (!this.config[type]) return false;
        const before = this.config[type].length;
        this.config[type] = this.config[type].filter(w => w.id !== id);
        if (this.config[type].length < before) {
            this.saveConfig();
            return true;
        }
        return false;
    }

    /**
     * Toggle enabled state.
     */
    toggleWebhook(type, id, enabled) {
        if (!this.config[type]) return false;
        const entry = this.config[type].find(w => w.id === id);
        if (!entry) return false;
        entry.enabled = enabled;
        this.saveConfig();
        return true;
    }

    /**
     * List all webhooks, optionally filtered by type.
     */
    listWebhooks(type = null) {
        if (type) return this.config[type] || [];
        const all = [];
        for (const [t, entries] of Object.entries(this.config)) {
            for (const e of entries) all.push({ ...e, type: t });
        }
        return all;
    }

    /**
     * Fire all webhooks matching the severity level.
     * @param {string} eventType   alert|incident|deploy|sla|compliance
     * @param {object} payload     Event data
     * @param {string} severity    info|warning|critical
     * @returns {Promise<Array>}   Results array
     */
    async fire(eventType, payload, severity = 'info') {
        const results = [];
        const promises = [];

        for (const type of ['slack', 'teams', 'pagerduty', 'github']) {
            for (const hook of (this.config[type] || [])) {
                if (!hook.enabled) continue;
                if (hook.severity !== 'all' && hook.severity !== severity) continue;
                const p = this._send(type, hook, eventType, payload, severity)
                    .then(res => {
                        const entry = { id: hook.id, type, name: hook.name, status: 'ok', ...res };
                        results.push(entry);
                        return entry;
                    })
                    .catch(err => {
                        const entry = { id: hook.id, type, name: hook.name, status: 'error', error: err.message };
                        results.push(entry);
                        return entry;
                    });
                promises.push(p);
            }
        }

        await Promise.allSettled(promises);

        // Record history
        this.history.push({
            ts: new Date().toISOString(),
            eventType,
            severity,
            results,
        });
        this.saveHistory();

        return results;
    }

    /**
     * Send to a specific webhook.
     */
    async _send(type, hook, eventType, payload, severity) {
        switch (type) {
            case 'slack':    return this._sendSlack(hook, eventType, payload, severity);
            case 'teams':    return this._sendTeams(hook, eventType, payload, severity);
            case 'pagerduty':return this._sendPagerDuty(hook, eventType, payload, severity);
            case 'github':   return this._sendGitHub(hook, eventType, payload, severity);
            default:         throw new Error(`Unsupported type: ${type}`);
        }
    }

    _sendSlack(hook, eventType, payload, severity) {
        const colorMap = { info: '#36a64f', warning: '#ffcc00', critical: '#ff0000' };
        const body = JSON.stringify({
            username: 'Milonexa Admin',
            icon_emoji: ':robot_face:',
            channel: hook.channel || undefined,
            attachments: [{
                color: colorMap[severity] || '#36a64f',
                title: `[${severity.toUpperCase()}] ${eventType}`,
                text: payload.message || JSON.stringify(payload),
                fields: Object.entries(payload)
                    .filter(([k]) => k !== 'message')
                    .slice(0, 5)
                    .map(([k, v]) => ({ title: k, value: String(v), short: true })),
                footer: 'Milonexa Admin',
                ts: Math.floor(Date.now() / 1000),
            }],
        });
        return this._post(hook.url, body, { 'Content-Type': 'application/json' });
    }

    _sendTeams(hook, eventType, payload, severity) {
        const themeMap = { info: '0078D4', warning: 'FFC107', critical: 'D32F2F' };
        const body = JSON.stringify({
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            themeColor: themeMap[severity] || '0078D4',
            summary: `Milonexa Admin: ${eventType}`,
            sections: [{
                activityTitle: `**[${severity.toUpperCase()}] ${eventType}**`,
                activityText: payload.message || JSON.stringify(payload),
                facts: Object.entries(payload)
                    .filter(([k]) => k !== 'message')
                    .slice(0, 5)
                    .map(([k, v]) => ({ name: k, value: String(v) })),
            }],
        });
        return this._post(hook.url, body, { 'Content-Type': 'application/json' });
    }

    _sendPagerDuty(hook, eventType, payload, severity) {
        const sevMap = { info: 'info', warning: 'warning', critical: 'critical' };
        const body = JSON.stringify({
            routing_key: hook.token,
            event_action: 'trigger',
            payload: {
                summary: `[Milonexa] ${eventType}: ${payload.message || ''}`,
                timestamp: new Date().toISOString(),
                severity: sevMap[severity] || 'info',
                source: 'milonexa-admin-cli',
                custom_details: payload,
            },
        });
        const url = hook.url || 'https://events.pagerduty.com/v2/enqueue';
        return this._post(url, body, { 'Content-Type': 'application/json' });
    }

    _sendGitHub(hook, eventType, payload, severity) {
        const body = JSON.stringify({
            event_type: eventType.replace(/\s+/g, '_').toLowerCase(),
            client_payload: { severity, ...payload },
        });
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'milonexa-admin-cli/5.0',
        };
        if (hook.token) headers['Authorization'] = `token ${hook.token}`;
        return this._post(hook.url, body, headers);
    }

    _post(urlStr, body, headers = {}) {
        return new Promise((resolve, reject) => {
            let parsedUrl;
            try { parsedUrl = new URL(urlStr); } catch (_) {
                return reject(new Error(`Invalid webhook URL: ${urlStr}`));
            }

            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + (parsedUrl.search || ''),
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Length': Buffer.byteLength(body),
                },
                timeout: 8000,
            };

            const lib = parsedUrl.protocol === 'https:' ? https : http;
            const req = lib.request(options, (res) => {
                let data = '';
                res.on('data', d => { data += d; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ statusCode: res.statusCode });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
            req.write(body);
            req.end();
        });
    }

    /**
     * Test a webhook by sending a test payload.
     */
    testWebhook(type, id) {
        const hook = (this.config[type] || []).find(w => w.id === id);
        if (!hook) throw new Error(`Webhook not found: ${type}/${id}`);
        return this.fire('test', { message: 'Milonexa Admin webhook test — connection verified.' }, 'info');
    }

    /**
     * Get delivery history, optionally filtered.
     */
    getHistory(limit = 50) {
        return this.history.slice(-limit).reverse();
    }

    /**
     * Return webhook stats summary.
     */
    getStats() {
        const all = this.listWebhooks();
        return {
            total: all.length,
            enabled: all.filter(w => w.enabled).length,
            byType: {
                slack: (this.config.slack || []).length,
                teams: (this.config.teams || []).length,
                pagerduty: (this.config.pagerduty || []).length,
                github: (this.config.github || []).length,
            },
            deliveries: this.history.length,
        };
    }
}

module.exports = { WebhookManager };
