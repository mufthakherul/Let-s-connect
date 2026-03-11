'use strict';
/**
 * feature-flags.js — Feature flag management
 *
 * Features:
 *  - Create, update, and delete feature flags with environment-level control
 *  - Percentage-based rollout with deterministic hash bucketing per user
 *  - Full change history per flag (toggle, rollout events)
 *  - Rich filtering by environment, tags, and name
 *  - Statistics across all flags and recent change feed
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class FeatureFlagManager {
    constructor(storeDir) {
        this.storeDir = storeDir;
        this.flagsFile = path.join(storeDir, 'feature-flags.json');
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

    createFlag({ name, description, environments, rolloutPercent, tags, owner }) {
        const flags = this._readJSON(this.flagsFile, []);
        const now = new Date().toISOString();
        const flag = {
            flagId: 'flag_' + crypto.randomBytes(8).toString('hex'),
            name,
            description: description || '',
            environments: environments || { production: false, staging: true, development: true },
            rolloutPercent: rolloutPercent !== undefined ? rolloutPercent : 100,
            tags: tags || [],
            owner: owner || null,
            created: now,
            updated: now,
            history: [],
        };
        flags.push(flag);
        this._writeJSON(this.flagsFile, flags);
        return flag;
    }

    updateFlag(flagId, changes) {
        const flags = this._readJSON(this.flagsFile, []);
        const idx = flags.findIndex(f => f.flagId === flagId);
        if (idx === -1) throw new Error(`Flag ${flagId} not found`);
        Object.assign(flags[idx], changes, { updated: new Date().toISOString() });
        this._writeJSON(this.flagsFile, flags);
        return flags[idx];
    }

    deleteFlag(flagId) {
        const flags = this._readJSON(this.flagsFile, []);
        const idx = flags.findIndex(f => f.flagId === flagId);
        if (idx === -1) return false;
        flags.splice(idx, 1);
        this._writeJSON(this.flagsFile, flags);
        return true;
    }

    toggleFlag(flagId, environment, enabled, changedBy) {
        const flags = this._readJSON(this.flagsFile, []);
        const idx = flags.findIndex(f => f.flagId === flagId);
        if (idx === -1) throw new Error(`Flag ${flagId} not found`);
        const oldValue = flags[idx].environments[environment];
        flags[idx].environments[environment] = enabled;
        flags[idx].updated = new Date().toISOString();
        flags[idx].history.push({
            ts: new Date().toISOString(),
            changedBy,
            environment,
            change: 'toggle',
            oldValue,
            newValue: enabled,
        });
        this._writeJSON(this.flagsFile, flags);
        return flags[idx];
    }

    setRollout(flagId, environment, percent, changedBy) {
        const clamped = Math.min(100, Math.max(0, percent));
        const flags = this._readJSON(this.flagsFile, []);
        const idx = flags.findIndex(f => f.flagId === flagId);
        if (idx === -1) throw new Error(`Flag ${flagId} not found`);
        const oldValue = flags[idx].rolloutPercent;
        flags[idx].rolloutPercent = clamped;
        flags[idx].updated = new Date().toISOString();
        flags[idx].history.push({
            ts: new Date().toISOString(),
            changedBy,
            environment,
            change: 'rollout',
            oldValue,
            newValue: clamped,
        });
        this._writeJSON(this.flagsFile, flags);
        return flags[idx];
    }

    evaluateFlag(flagName, environment, userId) {
        const flags = this._readJSON(this.flagsFile, []);
        const flag = flags.find(f => f.name === flagName);
        if (!flag) return { enabled: false, rolloutPercent: 0 };

        const envEnabled = !!(flag.environments && flag.environments[environment]);
        const rolloutPercent = flag.rolloutPercent !== undefined ? flag.rolloutPercent : 100;

        if (!envEnabled) return { enabled: false, rolloutPercent };

        if (rolloutPercent >= 100) return { enabled: true, rolloutPercent };
        if (rolloutPercent <= 0) return { enabled: false, rolloutPercent };

        if (userId) {
            const hash = parseInt(
                crypto.createHash('md5').update(flagName + '|' + userId).digest('hex').slice(0, 8),
                16
            );
            return { enabled: (hash % 100) < rolloutPercent, rolloutPercent };
        }

        return { enabled: false, rolloutPercent };
    }

    listFlags(filter = {}) {
        let flags = this._readJSON(this.flagsFile, []);
        if (filter.environment !== undefined) {
            flags = flags.filter(f => f.environments && f.environments[filter.environment]);
        }
        if (filter.tags && filter.tags.length) {
            flags = flags.filter(f => filter.tags.some(t => (f.tags || []).includes(t)));
        }
        if (filter.name) {
            flags = flags.filter(f => f.name.includes(filter.name));
        }
        return flags;
    }

    getFlag(flagId) {
        return this._readJSON(this.flagsFile, []).find(f => f.flagId === flagId) || null;
    }

    getFlagHistory(flagId) {
        const flag = this.getFlag(flagId);
        if (!flag) throw new Error(`Flag ${flagId} not found`);
        return flag.history || [];
    }

    getStats() {
        const flags = this._readJSON(this.flagsFile, []);
        const byEnvironment = { production: 0, staging: 0, development: 0 };

        for (const f of flags) {
            for (const env of Object.keys(byEnvironment)) {
                if (f.environments && f.environments[env]) byEnvironment[env]++;
            }
        }

        const allHistory = flags.flatMap(f =>
            (f.history || []).map(h => Object.assign({ flagId: f.flagId, flagName: f.name }, h))
        );
        const recentChanges = allHistory
            .sort((a, b) => new Date(b.ts) - new Date(a.ts))
            .slice(0, 10);

        return {
            totalFlags: flags.length,
            byEnvironment,
            recentChanges,
        };
    }
}

module.exports = { FeatureFlagManager };
