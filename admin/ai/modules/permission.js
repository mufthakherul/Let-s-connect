'use strict';

/**
 * @fileoverview Permission gate for the Milonexa AI admin agent.
 *
 * Holds actions that require human approval before the agent may execute them.
 * State is persisted in the ADMIN_HOME directory so that a human operator can
 * approve or deny requests via the CLI or the agent's HTTP status endpoint
 * without restarting the agent.
 *
 * Files managed:
 *   .admin-cli/ai/pending-permissions.json  — open requests
 *   .admin-cli/ai/permission-history.json   — decided records
 *
 * Environment variables consumed:
 *   AI_PERMISSION_TIMEOUT_MINUTES (default 30) — auto-expire pending requests
 */

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const os   = require('os');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ADMIN_HOME    = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const AI_STATE_DIR  = path.join(ADMIN_HOME, 'ai');
const PENDING_FILE  = path.join(AI_STATE_DIR, 'pending-permissions.json');
const HISTORY_FILE  = path.join(AI_STATE_DIR, 'permission-history.json');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MIN   = 30;
const EMERGENCY_TIMEOUT_MIN = 5;

// ---------------------------------------------------------------------------
// PermissionGate
// ---------------------------------------------------------------------------

class PermissionGate {
    constructor() {
        this._ensureDir();
        /** @type {object[]} */
        this._pending = this._load(PENDING_FILE, []);
        /** @type {object[]} */
        this._history = this._load(HISTORY_FILE, []);
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Create a new permission request that must be approved before the action
     * is executed.
     *
     * @param {string} action       Short machine-readable action name.
     * @param {string} description  Human-readable description.
     * @param {object} [data={}]    Arbitrary context attached to the request.
     * @param {'low'|'medium'|'high'|'critical'|'emergency'} [severity='medium']
     * @returns {Promise<{id: string, status: 'pending'}>}
     */
    async requestPermission(action, description, data = {}, severity = 'medium') {
        const id = crypto.randomUUID ? crypto.randomUUID() : this._uuid();
        const record = {
            id,
            action,
            description,
            data,
            severity,
            status:      'pending',
            requestedAt: new Date().toISOString(),
            requestedBy: os.hostname(),
            expiresAt:   this._expiresAt(severity),
        };

        this._pending.push(record);
        this._savePending();

        return { id, status: 'pending' };
    }

    /**
     * Check the current status of a permission request.
     *
     * @param {string} id
     * @returns {Promise<{status: string, decidedAt?: string, decidedBy?: string}>}
     */
    async checkPermission(id) {
        // First check pending list (it may have been auto-expired).
        this._expirePending();

        const pending = this._pending.find(r => r.id === id);
        if (pending) {
            return { id, status: pending.status };
        }

        const decided = this._history.find(r => r.id === id);
        if (decided) {
            return {
                id,
                status:     decided.status,
                decidedAt:  decided.decidedAt,
                decidedBy:  decided.decidedBy,
            };
        }

        return { id, status: 'not_found' };
    }

    /**
     * Approve a pending permission request.
     *
     * @param {string} id
     * @param {string} [by='human-operator']
     * @returns {Promise<boolean>}  `true` if found and approved; `false` otherwise.
     */
    async approvePermission(id, by = 'human-operator') {
        return this._decide(id, 'approved', by);
    }

    /**
     * Deny a pending permission request.
     *
     * @param {string} id
     * @param {string} [by='human-operator']
     * @returns {Promise<boolean>}
     */
    async denyPermission(id, by = 'human-operator') {
        return this._decide(id, 'denied', by);
    }

    /**
     * List all currently pending permission requests (non-expired).
     *
     * @returns {object[]}
     */
    listPending() {
        this._expirePending();
        return [...this._pending];
    }

    /**
     * AI self-approves a request for a low-risk action.
     *
     * @param {string} id
     * @param {string} [reason='auto-approved: low-risk action']
     * @returns {Promise<boolean>}
     */
    async autoApprove(id, reason = 'auto-approved: low-risk action') {
        return this._decide(id, 'approved', `ai-agent (${reason})`);
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /**
     * Scan pending requests and expire (or auto-approve emergency) timed-out
     * entries.
     * @private
     */
    _expirePending() {
        const now = Date.now();
        const still = [];

        for (const record of this._pending) {
            const exp = new Date(record.expiresAt).getTime();
            if (now < exp) {
                still.push(record);
                continue;
            }

            // Emergency actions: auto-approve on timeout.
            if (record.severity === 'emergency') {
                record.status     = 'approved';
                record.decidedAt  = new Date().toISOString();
                record.decidedBy  = 'ai-agent (emergency timeout auto-approval)';
            } else {
                record.status    = 'expired';
                record.decidedAt = new Date().toISOString();
                record.decidedBy = 'system';
            }

            this._history.push(record);
        }

        this._pending = still;
        this._savePending();
        this._saveHistory();
    }

    /**
     * Move a pending record to history with the given decision.
     * @private
     */
    _decide(id, status, by) {
        const idx = this._pending.findIndex(r => r.id === id);
        if (idx === -1) return false;

        const record = this._pending.splice(idx, 1)[0];
        record.status    = status;
        record.decidedAt = new Date().toISOString();
        record.decidedBy = by;

        this._history.push(record);
        this._savePending();
        this._saveHistory();
        return true;
    }

    /**
     * Compute the expiry date for a new request.
     * @private
     */
    _expiresAt(severity) {
        const timeoutMin = severity === 'emergency'
            ? EMERGENCY_TIMEOUT_MIN
            : parseInt(process.env.AI_PERMISSION_TIMEOUT_MINUTES, 10) || DEFAULT_TIMEOUT_MIN;
        return new Date(Date.now() + timeoutMin * 60 * 1000).toISOString();
    }

    /** @private */
    _ensureDir() {
        if (!fs.existsSync(AI_STATE_DIR)) {
            fs.mkdirSync(AI_STATE_DIR, { recursive: true });
        }
    }

    /** @private */
    _load(file, fallback) {
        if (fs.existsSync(file)) {
            try {
                return JSON.parse(fs.readFileSync(file, 'utf8')) || fallback;
            } catch (_) {
                return fallback;
            }
        }
        return fallback;
    }

    /** @private */
    _savePending() {
        try {
            fs.writeFileSync(PENDING_FILE, JSON.stringify(this._pending, null, 2), 'utf8');
        } catch (e) {
            console.error('[permission] Failed to save pending:', e.message);
        }
    }

    /** @private */
    _saveHistory() {
        try {
            fs.writeFileSync(HISTORY_FILE, JSON.stringify(this._history, null, 2), 'utf8');
        } catch (e) {
            console.error('[permission] Failed to save history:', e.message);
        }
    }

    /**
     * Fallback UUID generator for Node < 14.17.
     * @private
     */
    _uuid() {
        return crypto.randomBytes(16).toString('hex').replace(
            /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
            '$1-$2-$3-$4-$5'
        );
    }
}

module.exports = { PermissionGate };
