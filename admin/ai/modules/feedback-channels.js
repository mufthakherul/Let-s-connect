'use strict';

/**
 * @fileoverview Multi-channel feedback ingestion for the Milonexa AI Admin Agent.
 *
 * Capabilities (v2.2):
 *  - Email channel: reads feedback from `.admin-cli/feedback-channels/email/` (parsed .eml/.json).
 *  - In-app widget channel: accepts structured POST payloads (same schema as existing /feedback).
 *  - GitHub Issues channel: polls a configured GitHub repository for open issues tagged with
 *    a configurable label (default: "user-feedback") using Node.js built-in https.
 *  - All ingested items are normalised to the standard feedback schema and saved to
 *    `.admin-cli/feedback/` for FeedbackProcessor to consume.
 *  - `ingestAll()` runs all enabled channels and returns a count of new items per channel.
 *
 * Configuration (environment variables):
 *   FEEDBACK_EMAIL_DIR         Path to email drop folder (default: .admin-cli/feedback-channels/email)
 *   FEEDBACK_GITHUB_OWNER      GitHub owner/org (e.g. "milonexa")
 *   FEEDBACK_GITHUB_REPO       GitHub repo name (e.g. "platform")
 *   FEEDBACK_GITHUB_LABEL      GitHub issue label to filter (default: "user-feedback")
 *   FEEDBACK_GITHUB_TOKEN      GitHub personal access token (optional — raises rate limit)
 *   FEEDBACK_CHANNELS          Comma-separated enabled channels: email,github (default: "")
 *
 * All I/O uses ONLY Node.js built-in modules.
 */

const fs            = require('fs');
const path          = require('path');
const https         = require('https');
const crypto        = require('crypto');
const { promisify } = require('util');

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

const ADMIN_HOME     = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const FEEDBACK_DIR   = path.join(ADMIN_HOME, 'feedback');
const CHANNELS_DIR   = path.join(ADMIN_HOME, 'feedback-channels');
const EMAIL_DIR      = process.env.FEEDBACK_EMAIL_DIR || path.join(CHANNELS_DIR, 'email');
const CURSOR_FILE    = path.join(CHANNELS_DIR, 'github-cursor.json');

const GH_OWNER = process.env.FEEDBACK_GITHUB_OWNER || '';
const GH_REPO  = process.env.FEEDBACK_GITHUB_REPO  || '';
const GH_LABEL = process.env.FEEDBACK_GITHUB_LABEL || 'user-feedback';
const GH_TOKEN = process.env.FEEDBACK_GITHUB_TOKEN || '';

/** Enabled channels: parse FEEDBACK_CHANNELS=email,github */
function enabledChannels() {
    const raw = (process.env.FEEDBACK_CHANNELS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    return new Set(raw);
}

// ---------------------------------------------------------------------------
// FeedbackChannels
// ---------------------------------------------------------------------------

class FeedbackChannels {
    constructor() {
        this._ensureDirs();
        /** @type {{ email: number, github: number, widget: number, total: number }} */
        this._lastIngestStats = { email: 0, github: 0, widget: 0, total: 0 };
        this._lastRunAt = null;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Run all enabled channels and save new feedback entries.
     * @returns {Promise<{ email: number, github: number, total: number }>}
     */
    async ingestAll() {
        console.log('[feedback-channels] Starting multi-channel ingestion…');
        this._lastRunAt = new Date().toISOString();

        const channels = enabledChannels();
        const stats    = { email: 0, github: 0, total: 0 };

        if (channels.has('email')) {
            try {
                stats.email = await this._ingestEmail();
                console.log(`[feedback-channels] Email: ${stats.email} new item(s)`);
            } catch (e) {
                console.error('[feedback-channels] Email ingest error:', e.message);
            }
        }

        if (channels.has('github') && GH_OWNER && GH_REPO) {
            try {
                stats.github = await this._ingestGitHub();
                console.log(`[feedback-channels] GitHub: ${stats.github} new item(s)`);
            } catch (e) {
                console.error('[feedback-channels] GitHub ingest error:', e.message);
            }
        }

        stats.total = stats.email + stats.github;
        this._lastIngestStats = stats;

        if (stats.total > 0) {
            console.log(`[feedback-channels] Ingested ${stats.total} new feedback item(s) from ${channels.size} channel(s)`);
        }

        return stats;
    }

    /** @returns {{ lastRunAt: string|null, stats: object, channels: string[] }} */
    getStatus() {
        return {
            lastRunAt:  this._lastRunAt,
            stats:      this._lastIngestStats,
            channels:   [...enabledChannels()],
            githubConfigured: Boolean(GH_OWNER && GH_REPO),
        };
    }

    // -----------------------------------------------------------------------
    // Email channel — reads .json files from email drop folder
    // -----------------------------------------------------------------------

    /**
     * Read JSON files dropped into the email feedback folder by an external
     * email-to-JSON adapter (e.g. a mail filter, procmail, or email webhook).
     * Each file must be a JSON object with at least a `content`/`body`/`text` field.
     * @private
     */
    async _ingestEmail() {
        if (!fs.existsSync(EMAIL_DIR)) return 0;

        const files = fs.readdirSync(EMAIL_DIR).filter(f => f.endsWith('.json') || f.endsWith('.eml'));
        let count = 0;

        for (const file of files) {
            const filePath = path.join(EMAIL_DIR, file);
            try {
                let content = '';
                let metadata = {};

                if (file.endsWith('.json')) {
                    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    content  = raw.content || raw.body || raw.text || raw.message || '';
                    metadata = { from: raw.from || raw.sender || '', subject: raw.subject || '', channel: 'email' };
                } else if (file.endsWith('.eml')) {
                    // Basic EML extraction: grab Subject + plain-text body.
                    const raw   = fs.readFileSync(filePath, 'utf8');
                    const subj  = (raw.match(/^Subject:\s*(.+)/mi) || [])[1] || '';
                    const body  = raw.split(/\r?\n\r?\n/)[1] || '';
                    const from  = (raw.match(/^From:\s*(.+)/mi) || [])[1] || '';
                    content   = `${subj}\n${body}`.trim().slice(0, 4000);
                    metadata  = { from, subject: subj, channel: 'email' };
                }

                if (!content.trim()) {
                    // Move to processed to avoid reprocessing empty files.
                    this._archiveChannelFile(filePath, 'email');
                    continue;
                }

                this._saveFeedbackEntry({
                    userId:   metadata.from || 'email-user',
                    content,
                    source:   'email',
                    metadata,
                });

                this._archiveChannelFile(filePath, 'email');
                count++;
            } catch (_) {
                // Skip malformed files.
            }
        }

        return count;
    }

    // -----------------------------------------------------------------------
    // GitHub Issues channel
    // -----------------------------------------------------------------------

    /**
     * Fetch open GitHub issues tagged with GH_LABEL that have not been ingested yet.
     * Uses a cursor (last seen issue number) stored in CURSOR_FILE to avoid duplicates.
     * @private
     */
    async _ingestGitHub() {
        const cursor = this._loadGitHubCursor();
        let newCursor = cursor;

        const issues = await this._fetchGitHubIssues(cursor);
        let count = 0;

        for (const issue of issues) {
            const content = `[GitHub Issue #${issue.number}] ${issue.title}\n\n${issue.body || ''}`.slice(0, 4000);
            this._saveFeedbackEntry({
                userId:  issue.user && issue.user.login ? `github:${issue.user.login}` : 'github-user',
                content,
                source:  'github',
                metadata: {
                    issueNumber: issue.number,
                    issueUrl:    issue.html_url || '',
                    labels:      (issue.labels || []).map(l => l.name),
                    channel:     'github',
                },
            });
            if (issue.number > newCursor) newCursor = issue.number;
            count++;
        }

        if (newCursor > cursor) this._saveGitHubCursor(newCursor);

        return count;
    }

    /**
     * Fetch GitHub issues via the REST API.
     * @param {number} sinceNumber  Only return issues with number > sinceNumber.
     * @private
     */
    async _fetchGitHubIssues(sinceNumber) {
        const perPage = 30;
        const labelEncoded = encodeURIComponent(GH_LABEL);
        const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/issues?state=open&labels=${labelEncoded}&per_page=${perPage}&sort=created&direction=asc`;

        const headers = {
            'User-Agent': 'Milonexa-AI-Agent/2.2',
            'Accept': 'application/vnd.github+json',
        };
        if (GH_TOKEN) headers['Authorization'] = `Bearer ${GH_TOKEN}`;

        let body = '';
        try {
            body = await this._httpGet(url, headers);
        } catch (e) {
            console.error('[feedback-channels] GitHub API error:', e.message);
            return [];
        }

        let issues = [];
        try {
            issues = JSON.parse(body);
        } catch (_) {
            return [];
        }

        if (!Array.isArray(issues)) return [];

        // Filter out pull requests (GitHub API returns both).
        return issues
            .filter(i => !i.pull_request)
            .filter(i => i.number > sinceNumber);
    }

    // -----------------------------------------------------------------------
    // Utilities
    // -----------------------------------------------------------------------

    /** @private */
    _saveFeedbackEntry({ userId, content, source, metadata }) {
        const id    = crypto.randomUUID();
        const entry = {
            id,
            userId,
            content:   String(content || '').slice(0, 4000),
            source,
            metadata:  metadata || {},
            createdAt: new Date().toISOString(),
            processed: false,
        };
        try {
            fs.writeFileSync(path.join(FEEDBACK_DIR, `${id}.json`), JSON.stringify(entry, null, 2), 'utf8');
        } catch (_) {}
    }

    /** @private */
    _archiveChannelFile(filePath, channel) {
        const archiveDir = path.join(CHANNELS_DIR, channel, 'processed');
        if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
        try {
            fs.renameSync(filePath, path.join(archiveDir, path.basename(filePath)));
        } catch (_) {
            try { fs.unlinkSync(filePath); } catch (_2) {}
        }
    }

    /** @private */
    _loadGitHubCursor() {
        try {
            if (!fs.existsSync(CURSOR_FILE)) return 0;
            const data = JSON.parse(fs.readFileSync(CURSOR_FILE, 'utf8'));
            return typeof data.lastIssueNumber === 'number' ? data.lastIssueNumber : 0;
        } catch (_) { return 0; }
    }

    /** @private */
    _saveGitHubCursor(issueNumber) {
        try {
            fs.writeFileSync(CURSOR_FILE, JSON.stringify({ lastIssueNumber: issueNumber, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
        } catch (_) {}
    }

    /**
     * Simple HTTPS GET helper.
     * @private
     */
    _httpGet(url, headers = {}) {
        return new Promise((resolve, reject) => {
            const req = https.get(url, { headers, timeout: 15000 }, (res) => {
                let data = '';
                res.on('data', c => { data += c; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
                    else reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
                });
            });
            req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
            req.on('error', reject);
        });
    }

    /** @private */
    _ensureDirs() {
        [FEEDBACK_DIR, CHANNELS_DIR, EMAIL_DIR].forEach(d => {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        });
    }
}

module.exports = { FeedbackChannels };
