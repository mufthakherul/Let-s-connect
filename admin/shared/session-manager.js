'use strict';
/**
 * session-manager.js — Concurrent session tracking & forced logout
 *
 * Features:
 *  - Track active sessions by userId/IP with creation and last-activity timestamps
 *  - Enforce MAX_CONCURRENT_SESSIONS limit (default 3) — reject or evict oldest session
 *  - Idle session expiry (configurable, default 30 min)
 *  - Force-logout: immediately invalidate sessions by userId or session ID
 *  - Activity anomaly detection: flag off-hours logins, burst queries, unusual IPs
 *  - Persists session index to .admin-cli/sessions.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SessionManager {
    constructor(storeDir, options = {}) {
        this.storeDir = storeDir;
        this.sessionsFile = path.join(storeDir, 'sessions.json');
        this.maxConcurrent = options.maxConcurrent || 3;
        this.idleTimeoutMs = options.idleTimeoutMs || 30 * 60 * 1000;
        this.evictOldest = options.evictOldest !== undefined ? options.evictOldest : false;
        this.offHoursStart = options.offHoursStart !== undefined ? options.offHoursStart : 22;
        this.offHoursEnd = options.offHoursEnd !== undefined ? options.offHoursEnd : 6;
        this._ensureDir();
        this.sessions = this._load();
    }

    _ensureDir() {
        if (!fs.existsSync(this.storeDir)) {
            fs.mkdirSync(this.storeDir, { recursive: true });
        }
    }

    _load() {
        if (fs.existsSync(this.sessionsFile)) {
            try {
                return JSON.parse(fs.readFileSync(this.sessionsFile, 'utf8')) || {};
            } catch (_) {
                return {};
            }
        }
        return {};
    }

    _save() {
        this._ensureDir();
        fs.writeFileSync(this.sessionsFile, JSON.stringify(this.sessions, null, 2), 'utf8');
    }

    _userSessions(userId) {
        return Object.values(this.sessions).filter(s => s.userId === userId);
    }

    _isIdle(session) {
        return (Date.now() - new Date(session.lastActivity).getTime()) > this.idleTimeoutMs;
    }

    /**
     * Create a new session for the given user.
     * Throws if max concurrent sessions reached (unless evictOldest=true).
     */
    createSession({ userId, ip, userAgent }) {
        this.pruneExpired();
        const userSessions = this._userSessions(userId);

        if (userSessions.length >= this.maxConcurrent) {
            if (this.evictOldest) {
                // Evict the oldest session
                const oldest = userSessions.sort(
                    (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
                )[0];
                delete this.sessions[oldest.sessionId];
            } else {
                throw new Error(
                    `Max concurrent sessions (${this.maxConcurrent}) reached for user ${userId}`
                );
            }
        }

        const sessionId = crypto.randomBytes(16).toString('hex');
        const token = crypto.randomBytes(32).toString('hex');
        const now = new Date().toISOString();

        const session = {
            sessionId,
            token,
            userId,
            ip,
            userAgent: userAgent || '',
            created: now,
            lastActivity: now,
        };

        this.sessions[sessionId] = session;
        this._save();

        return { sessionId, token, created: now, ip };
    }

    /**
     * Validate a session by ID — updates lastActivity, checks idle timeout.
     * Returns session object or null if invalid/expired.
     */
    validateSession(sessionId) {
        const session = this.sessions[sessionId];
        if (!session) return null;
        if (this._isIdle(session)) {
            delete this.sessions[sessionId];
            this._save();
            return null;
        }
        session.lastActivity = new Date().toISOString();
        this._save();
        return session;
    }

    /**
     * List all active sessions, optionally filtered by userId.
     */
    listSessions(userId) {
        this.pruneExpired();
        const all = Object.values(this.sessions);
        return userId ? all.filter(s => s.userId === userId) : all;
    }

    /**
     * Force-logout a single session by sessionId.
     * Returns true if found and removed.
     */
    forceLogout(sessionId) {
        if (!this.sessions[sessionId]) return false;
        delete this.sessions[sessionId];
        this._save();
        return true;
    }

    /**
     * Force-logout all sessions for a given userId.
     * Returns the count of sessions removed.
     */
    forceLogoutUser(userId) {
        const toRemove = Object.keys(this.sessions).filter(
            id => this.sessions[id].userId === userId
        );
        for (const id of toRemove) {
            delete this.sessions[id];
        }
        if (toRemove.length > 0) this._save();
        return toRemove.length;
    }

    /**
     * Detect anomalies for a session.
     * Returns { offHours, unusualIp, burstActivity } flags.
     */
    detectAnomalies(sessionId) {
        const session = this.sessions[sessionId];
        if (!session) return { offHours: false, unusualIp: false, burstActivity: false };

        const createdHour = new Date(session.created).getUTCHours();
        const offHours = this.offHoursStart > this.offHoursEnd
            ? (createdHour >= this.offHoursStart || createdHour < this.offHoursEnd)
            : (createdHour >= this.offHoursStart && createdHour < this.offHoursEnd);

        // Check if IP is new for this user (not seen in other sessions)
        const userSessions = this._userSessions(session.userId).filter(
            s => s.sessionId !== sessionId
        );
        const knownIps = new Set(userSessions.map(s => s.ip));
        const unusualIp = knownIps.size > 0 && !knownIps.has(session.ip);

        // Burst activity: last activity updated too recently after creation
        const activityDelta =
            new Date(session.lastActivity).getTime() - new Date(session.created).getTime();
        const burstActivity = activityDelta < 5000 && activityDelta >= 0;

        return { offHours, unusualIp, burstActivity };
    }

    /**
     * Remove all idle/expired sessions.
     * Returns the count of pruned sessions.
     */
    pruneExpired() {
        const before = Object.keys(this.sessions).length;
        for (const [id, session] of Object.entries(this.sessions)) {
            if (this._isIdle(session)) {
                delete this.sessions[id];
            }
        }
        const pruned = before - Object.keys(this.sessions).length;
        if (pruned > 0) this._save();
        return pruned;
    }

    /**
     * Return aggregate statistics about active sessions.
     */
    getStats() {
        this.pruneExpired();
        const all = Object.values(this.sessions);
        const now = Date.now();
        const recent24h = all.filter(
            s => now - new Date(s.created).getTime() < 24 * 60 * 60 * 1000
        ).length;

        const byUser = {};
        for (const s of all) {
            byUser[s.userId] = (byUser[s.userId] || 0) + 1;
        }

        return { total: all.length, byUser, recent24h };
    }
}

module.exports = { SessionManager };
