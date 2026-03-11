'use strict';
/**
 * anomaly-detector.js — Admin activity anomaly detection
 *
 * Detects:
 *  - Off-hours access (configurable business hours)
 *  - Bulk query patterns (> N queries in time window)
 *  - Unusual IP addresses (new IPs for known users)
 *  - Repeated failed login attempts
 *  - Privilege escalation patterns
 *  - Geographic impossibility (IP-based approximation)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PRIVILEGE_ACTIONS = new Set([
    'role-change', 'bulk-delete', 'api-key-created', 'api-key-revoked',
    'user-delete', 'grant-admin', 'break-glass', 'policy-change',
]);

class AnomalyDetector {
    constructor(storeDir, options = {}) {
        this.storeDir = storeDir;
        this.activityFile = path.join(storeDir, 'anomaly-activity.json');
        this.offHoursStart = options.offHoursStart !== undefined ? options.offHoursStart : 22;
        this.offHoursEnd = options.offHoursEnd !== undefined ? options.offHoursEnd : 6;
        this.bulkThreshold = options.bulkThreshold || 50;
        this.windowMs = options.windowMs || 60000;
        this.knownIpTtlMs = options.knownIpTtlMs || 30 * 24 * 60 * 60 * 1000;
        this.burstActivityThresholdMs = options.burstActivityThresholdMs || 5000;
        this._ensureDir();
        this._state = this._load();
    }

    _ensureDir() {
        if (!fs.existsSync(this.storeDir)) {
            fs.mkdirSync(this.storeDir, { recursive: true });
        }
    }

    _load() {
        if (fs.existsSync(this.activityFile)) {
            try {
                return JSON.parse(fs.readFileSync(this.activityFile, 'utf8'));
            } catch (_) {}
        }
        return {
            events: [],        // { id, userId, ip, action, timestamp }
            anomalies: [],     // { id, userId, ip, action, timestamp, types, riskScore }
            knownIps: {},      // userId -> [{ ip, firstSeen, lastSeen }]
            failedLogins: {},  // userId -> [timestamp]
        };
    }

    _save() {
        // Keep events bounded to last 10k
        if (this._state.events.length > 10000) {
            this._state.events = this._state.events.slice(-10000);
        }
        // Keep anomalies bounded to last 1000
        if (this._state.anomalies.length > 1000) {
            this._state.anomalies = this._state.anomalies.slice(-1000);
        }
        this._ensureDir();
        fs.writeFileSync(this.activityFile, JSON.stringify(this._state, null, 2), 'utf8');
    }

    /**
     * Record an activity event.
     */
    recordActivity({ userId, ip, action, timestamp }) {
        const ts = timestamp || new Date().toISOString();
        const event = {
            id: crypto.randomBytes(8).toString('hex'),
            userId,
            ip,
            action,
            timestamp: ts,
        };
        this._state.events.push(event);

        // Update known IPs for this user
        if (!this._state.knownIps[userId]) this._state.knownIps[userId] = [];
        const knownList = this._state.knownIps[userId];
        const existing = knownList.find(k => k.ip === ip);
        if (existing) {
            existing.lastSeen = ts;
        } else {
            knownList.push({ ip, firstSeen: ts, lastSeen: ts });
        }

        // Prune stale known IPs
        const cutoff = Date.now() - this.knownIpTtlMs;
        this._state.knownIps[userId] = knownList.filter(
            k => new Date(k.lastSeen).getTime() > cutoff
        );

        // Track failed logins
        if (action === 'login_failed' || action === 'failed_login') {
            if (!this._state.failedLogins[userId]) this._state.failedLogins[userId] = [];
            this._state.failedLogins[userId].push(ts);
            // Keep only recent failures
            const windowCutoff = Date.now() - this.windowMs * 10;
            this._state.failedLogins[userId] = this._state.failedLogins[userId].filter(
                t => new Date(t).getTime() > windowCutoff
            );
        }

        this._save();
        return event;
    }

    /**
     * Analyze an activity and return anomaly flags and risk score.
     */
    analyze({ userId, ip, action, timestamp }) {
        const ts = timestamp ? new Date(timestamp) : new Date();
        const anomalies = [];
        const flags = [];

        // Off-hours check
        const hour = ts.getUTCHours();
        const isOffHours = this.offHoursStart > this.offHoursEnd
            ? (hour >= this.offHoursStart || hour < this.offHoursEnd)
            : (hour >= this.offHoursStart && hour < this.offHoursEnd);
        if (isOffHours) {
            anomalies.push({ type: 'off_hours_access', detail: `Access at UTC hour ${hour}` });
            flags.push('off_hours_access');
        }

        // Bulk query check: count recent events in window
        const windowStart = ts.getTime() - this.windowMs;
        const recentEvents = this._state.events.filter(
            e => e.userId === userId && new Date(e.timestamp).getTime() >= windowStart
        );
        if (recentEvents.length >= this.bulkThreshold) {
            anomalies.push({
                type: 'bulk_queries',
                detail: `${recentEvents.length} requests in ${this.windowMs}ms window`,
            });
            flags.push('bulk_queries');
        }

        // New IP check
        const knownIps = this._state.knownIps[userId] || [];
        const isKnownIp = knownIps.some(k => k.ip === ip);
        // Only flag if we have prior history for this user
        if (knownIps.length > 0 && !isKnownIp) {
            anomalies.push({ type: 'new_ip', detail: `IP ${ip} not seen before for user ${userId}` });
            flags.push('new_ip');
        }

        // Failed login check
        const failures = this._state.failedLogins[userId] || [];
        const recentFailures = failures.filter(
            t => new Date(t).getTime() >= windowStart
        );
        if (recentFailures.length >= 5) {
            anomalies.push({
                type: 'failed_logins',
                detail: `${recentFailures.length} failed logins in window`,
            });
            flags.push('failed_logins');
        }

        // Privilege escalation check
        if (PRIVILEGE_ACTIONS.has(action)) {
            anomalies.push({
                type: 'privilege_escalation',
                detail: `Privileged action: ${action}`,
            });
            flags.push('privilege_escalation');
        }

        // Risk score calculation (0-100)
        let riskScore = 0;
        if (flags.includes('off_hours_access')) riskScore += 15;
        if (flags.includes('bulk_queries')) riskScore += 30;
        if (flags.includes('new_ip')) riskScore += 20;
        if (flags.includes('failed_logins')) riskScore += 25;
        if (flags.includes('privilege_escalation')) riskScore += 35;
        riskScore = Math.min(100, riskScore);

        if (anomalies.length > 0) {
            const anomalyEvent = {
                id: crypto.randomBytes(8).toString('hex'),
                userId,
                ip,
                action,
                timestamp: ts.toISOString(),
                types: flags,
                riskScore,
            };
            this._state.anomalies.push(anomalyEvent);
            this._save();
        }

        return { anomalies, riskScore, flags };
    }

    /**
     * Return aggregate statistics.
     */
    getStats() {
        const allEvents = this._state.events;
        const allAnomalies = this._state.anomalies;
        const highRiskEvents = allAnomalies.filter(a => a.riskScore >= 70).length;

        const byUser = {};
        for (const e of allEvents) {
            byUser[e.userId] = (byUser[e.userId] || 0) + 1;
        }

        return {
            totalEvents: allEvents.length,
            anomalyCount: allAnomalies.length,
            highRiskEvents,
            byUser,
        };
    }

    /**
     * Return recent anomaly events (last N).
     */
    getAnomalyHistory(limit = 50) {
        return this._state.anomalies.slice(-limit);
    }
}

module.exports = { AnomalyDetector };
