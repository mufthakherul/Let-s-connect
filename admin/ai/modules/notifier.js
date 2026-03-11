'use strict';

/**
 * @fileoverview Notification dispatcher for the Milonexa AI admin agent.
 *
 * Dispatches admin notifications via multiple channels (console, webhook,
 * Telegram) using ONLY Node.js built-in modules.  Rate-limiting prevents
 * notification spam: at most one notification per topic per 5 minutes.
 *
 * Environment variables consumed:
 *   TELEGRAM_BOT_TOKEN          — Telegram bot API token
 *   TELEGRAM_ADMIN_CHAT_IDS     — comma-separated chat IDs
 *   ADMIN_WEBHOOK_SLACK_URLS    — comma-separated Slack incoming-webhook URLs
 *   ADMIN_WEBHOOK_DISCORD_URLS  — comma-separated Discord webhook URLs
 */

const https = require('https');
const http  = require('http');
const { URL } = require('url');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

/** Maps notification level to a numeric severity for comparisons. */
const LEVEL_RANK = { info: 0, warning: 1, critical: 2, emergency: 3 };

/** Slack color sidebars per level. */
const SLACK_COLORS = {
    info:      '#36a64f',
    warning:   '#ffcc00',
    critical:  '#e01e1e',
    emergency: '#8b0000',
};

/** Discord embed colours (decimal). */
const DISCORD_COLORS = {
    info:      3066993,
    warning:   16776960,
    critical:  15158332,
    emergency: 9109504,
};

/** Telegram HTML level tags. */
const TELEGRAM_EMOJI = {
    info:      'ℹ️',
    warning:   '⚠️',
    critical:  '🚨',
    emergency: '🆘',
};

// ---------------------------------------------------------------------------
// Notifier
// ---------------------------------------------------------------------------

class Notifier {
    /**
     * @param {object} [opts]
     * @param {boolean} [opts.silent=false]  Suppress console output (useful in tests).
     */
    constructor(opts = {}) {
        this._silent = Boolean(opts.silent);

        /** @type {Map<string, number>} topic → last-sent epoch ms */
        this._rateLimitMap = new Map();

        // Parse env config once.
        this._telegramToken    = process.env.TELEGRAM_BOT_TOKEN || '';
        this._telegramChatIds  = this._splitEnv('TELEGRAM_ADMIN_CHAT_IDS');
        this._slackUrls        = this._splitEnv('ADMIN_WEBHOOK_SLACK_URLS');
        this._discordUrls      = this._splitEnv('ADMIN_WEBHOOK_DISCORD_URLS');
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Send a notification on all configured channels.
     *
     * @param {'info'|'warning'|'critical'|'emergency'} level
     * @param {string} title
     * @param {string} message
     * @param {object} [data={}]  Extra key/value pairs appended to the body.
     * @returns {Promise<void>}
     */
    async notify(level, title, message, data = {}) {
        const topic = `${level}:${title}`;

        if (!this.canNotify(topic)) {
            this._log(`[notifier] rate-limited: ${topic}`);
            return;
        }

        this._rateLimitMap.set(topic, Date.now());

        const text = this._formatText(level, title, message, data);

        // Always log to console.
        this._consoleLog(level, title, message);

        const jobs = [];

        if (this._telegramToken && this._telegramChatIds.length > 0) {
            jobs.push(this.notifyTelegram(text).catch(e => this._warn('Telegram error', e)));
        }

        for (const url of this._slackUrls) {
            jobs.push(this.notifySlack(text, level, url).catch(e => this._warn('Slack error', e)));
        }

        for (const url of this._discordUrls) {
            jobs.push(
                this.notifyDiscord(title, message, level, url).catch(e =>
                    this._warn('Discord error', e)
                )
            );
        }

        await Promise.allSettled(jobs);
    }

    /**
     * Send a plain-text message to all configured Telegram chats.
     *
     * @param {string} text  HTML-formatted text (Telegram parse_mode=HTML).
     * @returns {Promise<void>}
     */
    async notifyTelegram(text) {
        if (!this._telegramToken) return;

        const jobs = this._telegramChatIds.map(chatId => {
            const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
            return this._post(
                `https://api.telegram.org/bot${this._telegramToken}/sendMessage`,
                body,
                { 'Content-Type': 'application/json' }
            );
        });

        await Promise.all(jobs);
    }

    /**
     * Send a Slack notification to a specific incoming-webhook URL.
     *
     * @param {string} text
     * @param {'info'|'warning'|'critical'|'emergency'} level
     * @param {string} webhookUrl
     * @returns {Promise<void>}
     */
    async notifySlack(text, level, webhookUrl) {
        if (!webhookUrl) return;

        const payload = {
            attachments: [
                {
                    color: SLACK_COLORS[level] || SLACK_COLORS.info,
                    text,
                    footer: 'Milonexa AI Admin Agent',
                    ts: Math.floor(Date.now() / 1000),
                },
            ],
        };

        await this._post(webhookUrl, JSON.stringify(payload), {
            'Content-Type': 'application/json',
        });
    }

    /**
     * Send a Discord embed notification to a specific webhook URL.
     *
     * @param {string} title
     * @param {string} description
     * @param {'info'|'warning'|'critical'|'emergency'} level
     * @param {string} webhookUrl
     * @returns {Promise<void>}
     */
    async notifyDiscord(title, description, level, webhookUrl) {
        if (!webhookUrl) return;

        const payload = {
            username: 'Milonexa AI Admin',
            embeds: [
                {
                    title:       `${TELEGRAM_EMOJI[level] || ''} ${title}`,
                    description: description.slice(0, 4096),
                    color:       DISCORD_COLORS[level] || DISCORD_COLORS.info,
                    timestamp:   new Date().toISOString(),
                    footer:      { text: 'Milonexa Admin AI' },
                },
            ],
        };

        await this._post(webhookUrl, JSON.stringify(payload), {
            'Content-Type': 'application/json',
        });
    }

    /**
     * Check whether a notification for this topic is permitted by rate-limit.
     *
     * @param {string} topic
     * @returns {boolean}
     */
    canNotify(topic) {
        const last = this._rateLimitMap.get(topic);
        if (last === undefined) return true;
        return Date.now() - last >= RATE_LIMIT_MS;
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /**
     * Format notification body as a single plain-text string.
     * @private
     */
    _formatText(level, title, message, data) {
        const emoji = TELEGRAM_EMOJI[level] || 'ℹ️';
        let text = `${emoji} <b>[${level.toUpperCase()}] ${this._escHtml(title)}</b>\n${this._escHtml(message)}`;

        if (data && Object.keys(data).length > 0) {
            const lines = Object.entries(data)
                .map(([k, v]) => `  <b>${this._escHtml(String(k))}:</b> ${this._escHtml(String(v))}`)
                .join('\n');
            text += `\n\n<i>Details:</i>\n${lines}`;
        }

        return text;
    }

    /** @private */
    _consoleLog(level, title, message) {
        if (this._silent) return;
        const ts = new Date().toISOString();
        const prefix = {
            info:      '\x1b[36m[INFO]\x1b[0m',
            warning:   '\x1b[33m[WARN]\x1b[0m',
            critical:  '\x1b[31m[CRIT]\x1b[0m',
            emergency: '\x1b[35m[EMER]\x1b[0m',
        }[level] || '[LOG]';
        console.log(`${ts} ${prefix} ${title}: ${message}`);
    }

    /** @private */
    _warn(context, err) {
        if (!this._silent) {
            console.error(`[notifier] ${context}: ${err && err.message ? err.message : err}`);
        }
    }

    /** @private */
    _log(msg) {
        if (!this._silent) console.log(msg);
    }

    /**
     * Parse a comma-separated environment variable into an array of strings.
     * @private
     */
    _splitEnv(envKey) {
        const val = process.env[envKey] || '';
        return val
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
    }

    /** Escape HTML special characters for Telegram HTML mode. @private */
    _escHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Generic HTTPS/HTTP POST helper using only built-in modules.
     *
     * @param {string} urlStr
     * @param {string} body      Serialised request body.
     * @param {object} [headers]
     * @returns {Promise<{statusCode: number, body: string}>}
     * @private
     */
    _post(urlStr, body, headers = {}) {
        return new Promise((resolve, reject) => {
            let parsed;
            try {
                parsed = new URL(urlStr);
            } catch (_) {
                return reject(new Error(`Invalid URL: ${urlStr}`));
            }

            const lib = parsed.protocol === 'https:' ? https : http;
            const options = {
                hostname: parsed.hostname,
                port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
                path:     parsed.pathname + (parsed.search || ''),
                method:   'POST',
                headers:  {
                    ...headers,
                    'Content-Length': Buffer.byteLength(body),
                },
                timeout: 15000,
            };

            const req = lib.request(options, res => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`POST timeout: ${urlStr}`));
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }
}

module.exports = { Notifier };
