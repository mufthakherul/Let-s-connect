'use strict';

/**
 * @fileoverview AI auto-healer for the Milonexa admin agent.
 *
 * Assesses platform health from metrics and alerts, then attempts autonomous
 * healing actions (restarts, cache clearing, rollbacks) with or without human
 * approval depending on severity and environment.
 *
 * All I/O uses ONLY Node.js built-in modules.
 */

const fs            = require('fs');
const path          = require('path');
const { execFile }  = require('child_process');
const { promisify } = require('util');
const os            = require('os');

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

const ADMIN_HOME   = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const AI_STATE_DIR = path.join(ADMIN_HOME, 'ai');
const CLI_PATH     = path.resolve(__dirname, '..', '..', 'cli', 'index.js');

/** Thresholds for health issue detection. */
const THRESHOLDS = {
    cpu:         { warning: 75, critical: 90 },
    memory:      { warning: 80, critical: 92 },
    errorRate:   { warning: 3,  critical: 10 },
    restarts:    { warning: 3,  critical: 8  },
    latencyMs:   { warning: 500, critical: 1500 },
};

/** Issue severity ordering. */
const SEVERITY_RANK = { low: 0, medium: 1, high: 2, critical: 3 };

// ---------------------------------------------------------------------------
// AutoHealer
// ---------------------------------------------------------------------------

class AutoHealer {
    constructor() {
        this._ensureDir();
        /** @type {object[]} History of healing actions. */
        this._healLog = [];
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Assess health of the platform from current metrics and alerts.
     *
     * @param {object}   metrics  Output of MetricsCollector or a snapshot object.
     * @param {object[]} alerts   Active alert list.
     * @returns {Promise<{healthy: boolean, score: number, issues: object[]}>}
     */
    async assessHealth(metrics, alerts) {
        const issues = [];

        issues.push(...this._checkServiceMetrics(metrics));
        issues.push(...this._checkAlerts(alerts));

        // Deduplicate issues by service+type.
        const seen = new Set();
        const uniqueIssues = issues.filter(i => {
            const key = `${i.type}:${i.service}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Score: 100 - weighted penalty per severity.
        const penaltyMap = { low: 2, medium: 8, high: 20, critical: 35 };
        const totalPenalty = uniqueIssues.reduce(
            (sum, i) => sum + (penaltyMap[i.severity] || 0),
            0
        );
        const score = Math.max(0, 100 - totalPenalty);

        return {
            healthy:     uniqueIssues.length === 0,
            score,
            issues:      uniqueIssues,
            assessedAt:  new Date().toISOString(),
        };
    }

    /**
     * Attempt to heal a list of health issues.
     *
     * @param {object[]}       healthIssues  Issues from assessHealth().
     * @param {PermissionGate} permGate
     * @param {Notifier}       notifier
     * @returns {Promise<object[]>}  Results for each issue.
     */
    async heal(healthIssues, permGate, notifier) {
        const results = [];

        // Sort by severity descending.
        const sorted = [...healthIssues].sort(
            (a, b) => (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0)
        );

        for (const issue of sorted) {
            const result = await this._healIssue(issue, permGate, notifier);
            results.push(result);
            this._healLog.push({ ...result, healedAt: new Date().toISOString(), issue });
        }

        // Bound log.
        if (this._healLog.length > 1000) this._healLog = this._healLog.slice(-1000);

        return results;
    }

    /**
     * Execute a previously approved healing action.
     *
     * @param {object} permRecord  Approved permission record containing `action` and `data`.
     * @returns {Promise<object>}
     */
    async executeApprovedAction(permRecord) {
        const { action, data } = permRecord;
        const svc = data && data.service;

        switch (action) {
            case 'restart_service':
                return this._restartService(svc);

            case 'stop_service':
                return this._stopService(svc);

            case 'rollback_service':
                return this._rollback(svc, data && data.reason);

            default:
                return { action, status: 'unknown_action' };
        }
    }

    /**
     * Return healing log entries.
     * @param {number} [limit=50]
     * @returns {object[]}
     */
    getHealLog(limit = 50) {
        return this._healLog.slice(-limit);
    }

    // -----------------------------------------------------------------------
    // Health detection helpers
    // -----------------------------------------------------------------------

    /** @private */
    _checkServiceMetrics(metrics) {
        const issues = [];
        if (!metrics) return issues;

        const services = metrics.services || [];

        for (const svc of services) {
            const name = svc.name || 'unknown';

            if (typeof svc.cpu === 'number') {
                if (svc.cpu >= THRESHOLDS.cpu.critical) {
                    issues.push({ type: 'high_cpu', service: name, value: svc.cpu, severity: 'critical',
                        description: `${name} CPU at ${svc.cpu.toFixed(1)}%` });
                } else if (svc.cpu >= THRESHOLDS.cpu.warning) {
                    issues.push({ type: 'high_cpu', service: name, value: svc.cpu, severity: 'high',
                        description: `${name} CPU at ${svc.cpu.toFixed(1)}%` });
                }
            }

            if (typeof svc.memory === 'number') {
                if (svc.memory >= THRESHOLDS.memory.critical) {
                    issues.push({ type: 'high_memory', service: name, value: svc.memory, severity: 'critical',
                        description: `${name} memory at ${svc.memory.toFixed(1)}%` });
                } else if (svc.memory >= THRESHOLDS.memory.warning) {
                    issues.push({ type: 'high_memory', service: name, value: svc.memory, severity: 'high',
                        description: `${name} memory at ${svc.memory.toFixed(1)}%` });
                }
            }

            if (typeof svc.errorRatePct === 'number') {
                if (svc.errorRatePct >= THRESHOLDS.errorRate.critical) {
                    issues.push({ type: 'high_error_rate', service: name, value: svc.errorRatePct, severity: 'critical',
                        description: `${name} error rate ${svc.errorRatePct.toFixed(1)}%` });
                } else if (svc.errorRatePct >= THRESHOLDS.errorRate.warning) {
                    issues.push({ type: 'high_error_rate', service: name, value: svc.errorRatePct, severity: 'high',
                        description: `${name} error rate ${svc.errorRatePct.toFixed(1)}%` });
                }
            }

            if (typeof svc.restarts === 'number') {
                if (svc.restarts >= THRESHOLDS.restarts.critical) {
                    issues.push({ type: 'crash_loop', service: name, value: svc.restarts, severity: 'critical',
                        description: `${name} has restarted ${svc.restarts} times — possible crash loop` });
                } else if (svc.restarts >= THRESHOLDS.restarts.warning) {
                    issues.push({ type: 'crash_loop', service: name, value: svc.restarts, severity: 'high',
                        description: `${name} has restarted ${svc.restarts} times` });
                }
            }

            if (svc.status === 'unhealthy' || svc.status === 'down') {
                issues.push({ type: 'service_down', service: name, severity: 'critical',
                    description: `${name} is ${svc.status}` });
            }
        }

        return issues;
    }

    /** @private */
    _checkAlerts(alerts) {
        const issues = [];
        if (!Array.isArray(alerts)) return issues;

        for (const alert of alerts) {
            if (alert.severity !== 'critical' && alert.severity !== 'warning') continue;

            issues.push({
                type:        `alert_${alert.category || 'generic'}`,
                service:     alert.service || 'platform',
                severity:    alert.severity === 'critical' ? 'critical' : 'medium',
                alertId:     alert.id,
                description: alert.name || 'Active alert',
            });
        }

        return issues;
    }

    // -----------------------------------------------------------------------
    // Healing strategy dispatcher
    // -----------------------------------------------------------------------

    /** @private */
    async _healIssue(issue, permGate, notifier) {
        const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
        const autoHeal     = (process.env.AI_AUTO_HEAL || 'true') === 'true';

        switch (issue.type) {
            case 'service_down':
            case 'crash_loop':
                return this._requestOrExecute(
                    'restart_service',
                    `Restart ${issue.service} due to ${issue.type}`,
                    { service: issue.service, reason: issue.type },
                    issue,
                    // Require permission in prod or for critical.
                    isProduction || issue.severity === 'critical',
                    permGate,
                    notifier
                );

            case 'high_error_rate':
                if (issue.severity === 'critical') {
                    return this._requestOrExecute(
                        'rollback_service',
                        `Rollback ${issue.service} due to high error rate (${issue.value}%)`,
                        { service: issue.service, reason: 'high_error_rate' },
                        issue,
                        true, // always require permission for rollback
                        permGate,
                        notifier
                    );
                }
                return this._requestOrExecute(
                    'restart_service',
                    `Restart ${issue.service} due to elevated error rate`,
                    { service: issue.service, reason: 'high_error_rate' },
                    issue,
                    isProduction,
                    permGate,
                    notifier
                );

            case 'high_memory':
                if (issue.severity === 'critical') {
                    return this._requestOrExecute(
                        'restart_service',
                        `Restart ${issue.service} due to critical memory (${issue.value}%)`,
                        { service: issue.service, reason: 'high_memory' },
                        issue,
                        isProduction,
                        permGate,
                        notifier
                    );
                }
                // Non-critical memory: just log and notify.
                console.log(`[healer] Suggest clearing Redis cache to relieve memory on ${issue.service}.`);
                await notifier.notify('warning', 'High Memory', issue.description, { service: issue.service }).catch(() => {});
                return { action: 'suggest_cache_clear', status: 'notified', service: issue.service };

            case 'high_cpu':
                // Suggest scaling up; auto-execute if non-prod.
                if (!isProduction && autoHeal) {
                    console.log(`[healer] Auto-scale ${issue.service} (non-prod CPU spike).`);
                    return { action: 'scale_up', status: 'logged', service: issue.service };
                }
                return this._requestOrExecute(
                    'scale_up_service',
                    `Scale up ${issue.service} due to CPU ${issue.value}%`,
                    { service: issue.service },
                    issue,
                    true,
                    permGate,
                    notifier
                );

            default:
                await notifier.notify('info', 'Health Issue', issue.description, { service: issue.service }).catch(() => {});
                return { action: 'notify_only', status: 'notified', issue };
        }
    }

    /**
     * Either execute an action immediately or gate it through PermissionGate.
     * @private
     */
    async _requestOrExecute(action, description, data, issue, requirePermission, permGate, notifier) {
        if (!requirePermission) {
            // Execute directly.
            const result = await this._executeLocal(action, data);
            await notifier.notify(
                issue.severity === 'critical' ? 'critical' : 'warning',
                `Auto-healed: ${action}`,
                description,
                { service: data.service || 'unknown', status: result.status }
            ).catch(() => {});
            return result;
        }

        // Gate through PermissionGate.
        const { id } = await permGate.requestPermission(
            action,
            description,
            data,
            issue.severity === 'critical' ? 'critical' : 'high'
        );

        return {
            action,
            status:       'pending_permission',
            permissionId: id,
            service:      data.service,
        };
    }

    // -----------------------------------------------------------------------
    // Action executors
    // -----------------------------------------------------------------------

    /** @private */
    async _executeLocal(action, data) {
        switch (action) {
            case 'restart_service':
                return this._restartService(data.service);
            case 'stop_service':
                return this._stopService(data.service);
            case 'rollback_service':
                return this._rollback(data.service, data.reason);
            case 'scale_up_service':
                console.log(`[healer] Scale-up ${data.service} (stub — integrate with k8s/docker).`);
                return { action, status: 'logged', service: data.service };
            default:
                return { action, status: 'unknown' };
        }
    }

    /** @private */
    async _restartService(service) {
        if (!service) return { action: 'restart_service', status: 'skipped', reason: 'no service' };
        try {
            const { stdout } = await execFileAsync(
                'node',
                [CLI_PATH, 'restart', '--service', service],
                { timeout: 30_000 }
            );
            console.log(`[healer] Restarted ${service}: ${stdout.trim()}`);
            return { action: 'restart_service', status: 'executed', service, output: stdout.trim() };
        } catch (err) {
            console.error(`[healer] Restart failed for ${service}: ${err.message}`);
            return { action: 'restart_service', status: 'failed', service, error: err.message };
        }
    }

    /** @private */
    async _stopService(service) {
        if (!service) return { action: 'stop_service', status: 'skipped', reason: 'no service' };
        try {
            const { stdout } = await execFileAsync(
                'node',
                [CLI_PATH, 'stop', '--service', service],
                { timeout: 30_000 }
            );
            return { action: 'stop_service', status: 'executed', service, output: stdout.trim() };
        } catch (err) {
            return { action: 'stop_service', status: 'failed', service, error: err.message };
        }
    }

    /** @private */
    async _rollback(service, reason) {
        if (!service) return { action: 'rollback_service', status: 'skipped', reason: 'no service' };
        try {
            const { stdout } = await execFileAsync(
                'node',
                [CLI_PATH, 'rollout', '--strategy', 'undo', '--service', service],
                { timeout: 60_000 }
            );
            console.log(`[healer] Rolled back ${service}: ${stdout.trim()}`);
            return { action: 'rollback_service', status: 'executed', service, output: stdout.trim() };
        } catch (err) {
            return { action: 'rollback_service', status: 'failed', service, error: err.message };
        }
    }

    // -----------------------------------------------------------------------
    // Utilities
    // -----------------------------------------------------------------------

    /** @private */
    _ensureDir() {
        if (!fs.existsSync(AI_STATE_DIR)) {
            fs.mkdirSync(AI_STATE_DIR, { recursive: true });
        }
    }
}

module.exports = { AutoHealer };
