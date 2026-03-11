'use strict';
/**
 * change-log.js — Change Management Log
 *
 * Features:
 *  - Immutable audit records for all admin changes
 *  - Ticket reference linking and multi-party approval tracking
 *  - Rich search/filter across actor, action, resource, environment, date range
 *  - Per-resource timeline and aggregate statistics
 *  - CSV export for compliance reporting
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ChangeLog {
    constructor(storeDir) {
        this.storeDir = storeDir;
        this.changeLogFile = path.join(storeDir, 'change-log.json');
        this._ensureDir();
    }

    _ensureDir() {
        if (!fs.existsSync(this.storeDir)) {
            fs.mkdirSync(this.storeDir, { recursive: true });
        }
    }

    _readJSON(file, defaultVal) {
        if (!fs.existsSync(file)) return defaultVal;
        try {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (_) {
            return defaultVal;
        }
    }

    _writeJSON(file, data) {
        this._ensureDir();
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    }

    record({ actor, action, resource, before, after, ticketRef, reason, environment, approved_by }) {
        const records = this._readJSON(this.changeLogFile, []);
        const entry = {
            changeId: 'chg_' + crypto.randomBytes(8).toString('hex'),
            actor,
            action,
            resource,
            before: before !== undefined ? before : null,
            after: after !== undefined ? after : null,
            ticketRef: ticketRef || null,
            reason: reason || '',
            environment: environment || 'production',
            approved_by: approved_by || [],
            timestamp: new Date().toISOString(),
        };
        records.push(entry);
        this._writeJSON(this.changeLogFile, records);
        return entry;
    }

    link(changeId, ticketRef) {
        const records = this._readJSON(this.changeLogFile, []);
        const idx = records.findIndex(r => r.changeId === changeId);
        if (idx === -1) throw new Error(`Change ${changeId} not found`);
        records[idx].ticketRef = ticketRef;
        this._writeJSON(this.changeLogFile, records);
        return records[idx];
    }

    approve(changeId, approvedBy) {
        const records = this._readJSON(this.changeLogFile, []);
        const idx = records.findIndex(r => r.changeId === changeId);
        if (idx === -1) throw new Error(`Change ${changeId} not found`);
        if (!records[idx].approved_by.includes(approvedBy)) {
            records[idx].approved_by.push(approvedBy);
        }
        this._writeJSON(this.changeLogFile, records);
        return records[idx];
    }

    search({ actor, action, resource, ticketRef, dateFrom, dateTo, environment } = {}) {
        let records = this._readJSON(this.changeLogFile, []);
        if (actor) records = records.filter(r => r.actor === actor);
        if (action) records = records.filter(r => r.action === action);
        if (resource) records = records.filter(r => r.resource === resource);
        if (ticketRef) records = records.filter(r => r.ticketRef === ticketRef);
        if (environment) records = records.filter(r => r.environment === environment);
        if (dateFrom) records = records.filter(r => new Date(r.timestamp) >= new Date(dateFrom));
        if (dateTo) records = records.filter(r => new Date(r.timestamp) <= new Date(dateTo));
        return records;
    }

    getTimeline(resource, limit = 20) {
        return this._readJSON(this.changeLogFile, [])
            .filter(r => r.resource === resource)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    getStats() {
        const records = this._readJSON(this.changeLogFile, []);
        const byActor = {};
        const byEnvironment = {};
        const byResource = {};

        for (const r of records) {
            byActor[r.actor] = (byActor[r.actor] || 0) + 1;
            byEnvironment[r.environment] = (byEnvironment[r.environment] || 0) + 1;
            byResource[r.resource] = (byResource[r.resource] || 0) + 1;
        }

        return {
            totalChanges: records.length,
            byActor,
            byEnvironment,
            byResource,
            pendingApprovals: records.filter(r => !r.approved_by || r.approved_by.length === 0).length,
        };
    }

    exportAsCSV() {
        const records = this._readJSON(this.changeLogFile, []);
        const header = 'changeId,actor,action,resource,ticketRef,environment,timestamp';
        const rows = records.map(r => [
            r.changeId,
            r.actor,
            r.action,
            r.resource,
            r.ticketRef || '',
            r.environment,
            r.timestamp,
        ].map(v => `"${String(v).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`).join(','));
        return [header, ...rows].join('\n');
    }
}

module.exports = { ChangeLog };
