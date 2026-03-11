'use strict';

/**
 * @fileoverview A/B feature flagging and canary deployment manager (v3.0).
 *
 * Capabilities:
 *  - Feature flag registry: create, evaluate, and manage percentage-based rollouts.
 *    Flags are persisted to `.admin-cli/ai/canary/flags.json`.
 *  - Canary deployment tracking: register a canary deployment with a baseline
 *    service, track error-rate metrics over time.
 *  - Rollback trigger: compares canary error rate against baseline; if the delta
 *    exceeds `CANARY_ERROR_RATE_THRESHOLD` (default: 2×) for N consecutive samples,
 *    it requests an admin-approved rollback via PermissionGate, or auto-executes
 *    if `CANARY_AUTO_ROLLBACK=true`.
 *  - Provides HTTP-friendly API: `/canary/flags`, `/canary/flags/:name`,
 *    `/canary/deployments`, `/canary/rollback/:deploymentId`.
 *
 * Configuration (environment variables):
 *   CANARY_ERROR_RATE_THRESHOLD   Ratio above which canary triggers rollback (default: 2.0 = 2×)
 *   CANARY_CONSECUTIVE_SAMPLES    N consecutive high-error samples before trigger (default: 3)
 *   CANARY_AUTO_ROLLBACK          If 'true', auto-rollback without human approval (default: false)
 *
 * All I/O uses ONLY Node.js built-in modules.
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

const ADMIN_HOME   = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const AI_STATE_DIR = path.join(ADMIN_HOME, 'ai');
const CANARY_DIR   = path.join(AI_STATE_DIR, 'canary');

const ERROR_RATE_THRESHOLD  = parseFloat(process.env.CANARY_ERROR_RATE_THRESHOLD  || '2.0');
const CONSECUTIVE_SAMPLES   = parseInt(process.env.CANARY_CONSECUTIVE_SAMPLES     || '3',  10);
const AUTO_ROLLBACK         = process.env.CANARY_AUTO_ROLLBACK === 'true';

// ---------------------------------------------------------------------------
// CanaryManager
// ---------------------------------------------------------------------------

class CanaryManager {
    constructor() {
        this._ensureDirs();
        /** @type {Map<string, object>} name → flag */
        this._flags       = new Map(Object.entries(this._loadJSON('flags.json') || {}));
        /** @type {Map<string, object>} id → deployment */
        this._deployments = new Map(Object.entries(this._loadJSON('deployments.json') || {}));
        /** @type {object[]} Rollback events */
        this._rollbacks   = this._loadJSON('rollbacks.json') || [];
        this._lastRunAt   = null;
    }

    // -----------------------------------------------------------------------
    // Feature flags
    // -----------------------------------------------------------------------

    /**
     * Create or update a feature flag.
     *
     * @param {object} params
     *   @param {string} params.name         Unique flag name (e.g. "new-chat-ui")
     *   @param {string} params.description  Human-readable description.
     *   @param {number} [params.rolloutPct] 0–100 percentage rollout (default: 0).
     *   @param {boolean} [params.enabled]   Master on/off switch (default: true).
     *   @param {object}  [params.metadata]  Arbitrary key/value metadata.
     * @returns {object} Created/updated flag.
     */
    createFlag(params) {
        const { name, description, rolloutPct = 0, enabled = true, metadata = {} } = params;
        if (!name || typeof name !== 'string') throw new Error('Flag name is required.');

        const existing = this._flags.get(name);
        const flag = {
            name,
            description:   description || '',
            rolloutPct:    Math.min(100, Math.max(0, rolloutPct)),
            enabled,
            metadata,
            createdAt:     existing ? existing.createdAt : new Date().toISOString(),
            updatedAt:     new Date().toISOString(),
            evaluations:   existing ? existing.evaluations : 0,
            enabledCount:  existing ? existing.enabledCount : 0,
        };

        this._flags.set(name, flag);
        this._saveFlags();

        console.log(`[canary-manager] Flag "${name}" ${existing ? 'updated' : 'created'} (rollout=${rolloutPct}%, enabled=${enabled})`);
        return flag;
    }

    /**
     * Evaluate a feature flag for a given context.
     * Uses a deterministic hash of `context.userId` (or random if absent) to
     * produce a stable per-user decision — the same user always gets the same
     * result for a given flag + rollout percentage.
     *
     * @param {string} flagName
     * @param {object} [context]  { userId?, sessionId?, metadata? }
     * @returns {boolean} Whether the feature is enabled for this context.
     */
    evaluateFlag(flagName, context = {}) {
        const flag = this._flags.get(flagName);
        if (!flag || !flag.enabled) return false;
        if (flag.rolloutPct >= 100) {
            flag.evaluations++;
            flag.enabledCount++;
            this._saveFlags();
            return true;
        }
        if (flag.rolloutPct <= 0) {
            flag.evaluations++;
            this._saveFlags();
            return false;
        }

        // Deterministic bucket assignment: hash(flagName + userId) % 100.
        const seed    = `${flagName}:${context.userId || context.sessionId || crypto.randomUUID()}`;
        const hash    = crypto.createHash('sha256').update(seed).digest('hex');
        const bucket  = parseInt(hash.slice(0, 4), 16) % 100;
        const enabled = bucket < flag.rolloutPct;

        flag.evaluations++;
        if (enabled) flag.enabledCount++;
        this._saveFlags();

        return enabled;
    }

    /**
     * Delete a feature flag.
     * @param {string} flagName
     * @returns {boolean} True if deleted, false if not found.
     */
    deleteFlag(flagName) {
        const existed = this._flags.has(flagName);
        this._flags.delete(flagName);
        if (existed) this._saveFlags();
        return existed;
    }

    /**
     * List all flags.
     * @returns {object[]}
     */
    listFlags() {
        return [...this._flags.values()];
    }

    /**
     * Get a single flag.
     * @param {string} flagName
     * @returns {object|null}
     */
    getFlag(flagName) {
        return this._flags.get(flagName) || null;
    }

    // -----------------------------------------------------------------------
    // Canary deployments
    // -----------------------------------------------------------------------

    /**
     * Register a new canary deployment.
     *
     * @param {object} params
     *   @param {string} params.service       Service name (e.g. "user-service")
     *   @param {string} params.version       Canary version being deployed.
     *   @param {string} params.baselineVersion Baseline version to compare against.
     *   @param {string} [params.description]  Description of the change.
     * @returns {object} Deployment record.
     */
    registerDeployment(params) {
        const { service, version, baselineVersion, description = '' } = params;
        if (!service || !version) throw new Error('service and version are required.');

        const id = crypto.randomUUID();
        const deployment = {
            id,
            service,
            version,
            baselineVersion:     baselineVersion || 'unknown',
            description,
            status:              'active',
            consecutiveHighErrors: 0,
            samples:             [],
            rollbackAt:          null,
            createdAt:           new Date().toISOString(),
            updatedAt:           new Date().toISOString(),
        };

        this._deployments.set(id, deployment);
        this._saveDeployments();

        console.log(`[canary-manager] Canary deployment registered: ${service} v${version} (id=${id})`);
        return deployment;
    }

    /**
     * Record a metric sample for a canary deployment.
     *
     * @param {string} deploymentId
     * @param {object} sample  { canaryErrorRate: number (0–1), baselineErrorRate: number (0–1), timestamp?: string }
     * @returns {object} Updated deployment.
     */
    recordSample(deploymentId, sample) {
        const dep = this._deployments.get(deploymentId);
        if (!dep) throw new Error(`Deployment ${deploymentId} not found.`);
        if (dep.status !== 'active') return dep; // Already rolled back or completed.

        dep.samples.push({
            canaryErrorRate:   sample.canaryErrorRate   || 0,
            baselineErrorRate: sample.baselineErrorRate || 0,
            timestamp:         sample.timestamp         || new Date().toISOString(),
        });
        if (dep.samples.length > 100) dep.samples.splice(0, dep.samples.length - 100);
        dep.updatedAt = new Date().toISOString();

        // Check rollback trigger.
        const baseline = sample.baselineErrorRate;
        const canary   = sample.canaryErrorRate;
        const ratio    = baseline > 0 ? canary / baseline : (canary > 0.01 ? 999 : 0);

        if (ratio >= ERROR_RATE_THRESHOLD) {
            dep.consecutiveHighErrors++;
        } else {
            dep.consecutiveHighErrors = 0;
        }

        this._deployments.set(deploymentId, dep);
        this._saveDeployments();

        return dep;
    }

    /**
     * Check all active deployments for rollback triggers.
     *
     * @param {object} [permGate]  PermissionGate instance for gated rollbacks.
     * @returns {Promise<object[]>} Triggered rollbacks.
     */
    async checkRollbackTriggers(permGate) {
        this._lastRunAt = new Date().toISOString();
        const triggered = [];

        for (const [id, dep] of this._deployments) {
            if (dep.status !== 'active') continue;
            if (dep.consecutiveHighErrors < CONSECUTIVE_SAMPLES) continue;

            const lastSamples = dep.samples.slice(-CONSECUTIVE_SAMPLES);
            const avgCanary   = lastSamples.reduce((s, x) => s + x.canaryErrorRate, 0) / lastSamples.length;
            const avgBaseline = lastSamples.reduce((s, x) => s + x.baselineErrorRate, 0) / lastSamples.length;

            console.warn(`[canary-manager] Rollback trigger for ${dep.service}: canary=${(avgCanary * 100).toFixed(1)}% baseline=${(avgBaseline * 100).toFixed(1)}% (${dep.consecutiveHighErrors} consecutive samples)`);

            if (AUTO_ROLLBACK) {
                dep.status    = 'rolled_back';
                dep.rollbackAt = new Date().toISOString();
                this._rollbacks.push({ deploymentId: id, service: dep.service, reason: 'auto_rollback', at: dep.rollbackAt });
                this._saveDeployments();
                this._saveRollbacks();
                triggered.push({ deploymentId: id, service: dep.service, status: 'auto_rolled_back' });
                console.log(`[canary-manager] Auto-rollback executed for ${dep.service} (id=${id})`);
            } else if (permGate) {
                await permGate.requestPermission(
                    'rollback_canary',
                    `Canary rollback needed for ${dep.service}: error rate ${(avgCanary * 100).toFixed(1)}% vs baseline ${(avgBaseline * 100).toFixed(1)}%`,
                    { deploymentId: id, service: dep.service, version: dep.version, avgCanary, avgBaseline },
                    'critical'
                ).catch(() => {});
                dep.status = 'rollback_pending';
                this._deployments.set(id, dep);
                this._saveDeployments();
                triggered.push({ deploymentId: id, service: dep.service, status: 'rollback_pending' });
            }
        }

        return triggered;
    }

    /**
     * Execute an admin-approved rollback.
     * @param {object} permRecord
     * @returns {Promise<object>}
     */
    async executeApprovedRollback(permRecord) {
        const { data } = permRecord;
        if (!data || !data.deploymentId) {
            return { status: 'skipped', reason: 'Missing deploymentId in permission data.' };
        }

        const dep = this._deployments.get(data.deploymentId);
        if (!dep) return { status: 'skipped', reason: `Deployment ${data.deploymentId} not found.` };

        dep.status    = 'rolled_back';
        dep.rollbackAt = new Date().toISOString();
        this._deployments.set(data.deploymentId, dep);
        this._rollbacks.push({
            deploymentId: data.deploymentId,
            service:      dep.service,
            reason:       'admin_approved',
            at:           dep.rollbackAt,
        });
        this._saveDeployments();
        this._saveRollbacks();

        console.log(`[canary-manager] Admin-approved rollback executed: ${dep.service} v${dep.version} → v${dep.baselineVersion}`);
        return { status: 'rolled_back', service: dep.service, from: dep.version, to: dep.baselineVersion };
    }

    /**
     * Complete a successful canary deployment.
     * @param {string} deploymentId
     * @returns {object|null}
     */
    completeDeployment(deploymentId) {
        const dep = this._deployments.get(deploymentId);
        if (!dep) return null;
        dep.status    = 'completed';
        dep.completedAt = new Date().toISOString();
        this._deployments.set(deploymentId, dep);
        this._saveDeployments();
        console.log(`[canary-manager] Canary deployment completed: ${dep.service} v${dep.version}`);
        return dep;
    }

    /** @returns {object[]} All deployments. */
    listDeployments() {
        return [...this._deployments.values()];
    }

    /** @returns {object|null} Single deployment. */
    getDeployment(id) {
        return this._deployments.get(id) || null;
    }

    /** @returns {object[]} Rollback events. */
    getRollbacks(limit = 20) {
        return this._rollbacks.slice(-limit);
    }

    /** @returns {object} Summary. */
    getSummary() {
        const deps = [...this._deployments.values()];
        return {
            lastRunAt:   this._lastRunAt,
            totalFlags:  this._flags.size,
            totalDeployments: deps.length,
            activeDeployments: deps.filter(d => d.status === 'active').length,
            rolledBack:  deps.filter(d => d.status === 'rolled_back').length,
            rollbackEvents: this._rollbacks.length,
        };
    }

    // -----------------------------------------------------------------------
    // Persistence
    // -----------------------------------------------------------------------

    /** @private */
    _saveFlags() {
        const obj = {};
        for (const [k, v] of this._flags) obj[k] = v;
        try { fs.writeFileSync(path.join(CANARY_DIR, 'flags.json'), JSON.stringify(obj, null, 2), 'utf8'); } catch (_) {}
    }

    /** @private */
    _saveDeployments() {
        const obj = {};
        for (const [k, v] of this._deployments) obj[k] = v;
        try { fs.writeFileSync(path.join(CANARY_DIR, 'deployments.json'), JSON.stringify(obj, null, 2), 'utf8'); } catch (_) {}
    }

    /** @private */
    _saveRollbacks() {
        try { fs.writeFileSync(path.join(CANARY_DIR, 'rollbacks.json'), JSON.stringify(this._rollbacks, null, 2), 'utf8'); } catch (_) {}
    }

    /** @private */
    _loadJSON(filename) {
        const file = path.join(CANARY_DIR, filename);
        try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
    }

    /** @private */
    _ensureDirs() {
        [AI_STATE_DIR, CANARY_DIR].forEach(d => {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        });
    }
}

module.exports = { CanaryManager };
