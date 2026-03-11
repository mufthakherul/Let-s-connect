'use strict';

/**
 * @fileoverview AI security monitor for the Milonexa admin agent.
 *
 * Analyses metrics, alerts, and audit logs to detect security threats in real
 * time.  Detected threats are acted upon either automatically (for low-risk
 * responses) or after human approval via the PermissionGate.
 *
 * All I/O uses ONLY Node.js built-in modules.
 *
 * Blocked IPs are persisted to: .admin-cli/ai/blocked-ips.json
 */

const fs            = require('fs');
const path          = require('path');
const http          = require('http');
const https         = require('https');
const crypto        = require('crypto');
const os            = require('os');
const { execFile }  = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ADMIN_HOME       = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const AI_STATE_DIR     = path.join(ADMIN_HOME, 'ai');
const BLOCKED_IPS_FILE = path.join(AI_STATE_DIR, 'blocked-ips.json');
const CLI_PATH         = path.resolve(__dirname, '..', '..', 'cli', 'index.js');

// ---------------------------------------------------------------------------
// Threat detection thresholds
// ---------------------------------------------------------------------------

const THRESHOLDS = {
    brute_force:          { failedAuthPerMin: 10,  windowMs: 60_000 },
    dos_attack:           { reqSpike: 5,            windowMs: 60_000 },  // 5× baseline
    data_exfiltration:    { bytesPerMin: 100 * 1024 * 1024 },             // 100 MB/min
    compromised_service:  { errorRatePct: 30 },
    config_drift:         { changesInWindow: 3,     windowMs: 5 * 60_000 },
};

// ---------------------------------------------------------------------------
// SecurityMonitor
// ---------------------------------------------------------------------------

class SecurityMonitor {
    constructor() {
        this._ensureDir();
        /** @type {object[]} Detected threat history. */
        this._threatHistory = [];
        /** @type {Set<string>} */
        this._blockedIps = new Set(this._loadBlockedIps());
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Scan for security threats given the latest platform telemetry.
     *
     * @param {object} metrics   Output of MetricsCollector.getLatest() or similar.
     * @param {object[]} alerts  Current active alerts.
     * @param {object[]} auditLog Recent audit log entries.
     * @returns {Promise<object[]>} Array of threat objects.
     */
    async scanSecurityThreats(metrics, alerts, auditLog) {
        const threats = [];

        threats.push(...this._detectBruteForce(auditLog));
        threats.push(...this._detectDosAttack(metrics));
        threats.push(...this._detectDataExfiltration(metrics));
        threats.push(...this._detectCompromisedService(metrics, alerts));
        threats.push(...this._detectConfigDrift(auditLog));
        threats.push(...this._detectVulnerabilities(alerts));

        // Record in history.
        for (const t of threats) {
            t.detectedAt = t.detectedAt || new Date().toISOString();
            t.id = t.id || this._uuid();
            this._threatHistory.push(t);
        }

        // Keep history bounded.
        if (this._threatHistory.length > 500) {
            this._threatHistory = this._threatHistory.slice(-500);
        }

        return threats;
    }

    /**
     * Respond to a detected threat.  Low-severity actions are taken immediately;
     * higher-severity actions are gated through the PermissionGate.
     *
     * @param {object}         threat
     * @param {PermissionGate} permGate
     * @param {Notifier}       notifier
     * @returns {Promise<{action: string, status: string, permissionId?: string}>}
     */
    async respondToThreat(threat, permGate, notifier) {
        const { type, severity, service, ip, description } = threat;

        // Always notify.
        const notifyLevel = severity === 'critical' || severity === 'emergency' ? severity : 'warning';
        await notifier.notify(
            notifyLevel,
            `Security Threat: ${type}`,
            description || `Threat type ${type} detected`,
            { service: service || 'unknown', ip: ip || 'n/a', severity }
        ).catch(() => {});

        // Decide action strategy.
        switch (type) {
            case 'brute_force':
            case 'dos_attack':
                return this._blockIpAction(ip, threat, permGate, notifier);

            case 'compromised_service':
                return this._emergencyShutdownAction(service, threat, permGate, notifier);

            case 'data_exfiltration':
                return this._rateLimitAction(service, threat, permGate, notifier);

            case 'vulnerability_detected':
            case 'config_drift':
                // Alert only — no automated remediation for these.
                return { action: 'alert_admin', status: 'notified' };

            default:
                return { action: 'none', status: 'unknown_threat_type' };
        }
    }

    /**
     * Return all detected threats (history).
     * @returns {object[]}
     */
    getThreatHistory() {
        return [...this._threatHistory];
    }

    // -----------------------------------------------------------------------
    // Threat detection helpers
    // -----------------------------------------------------------------------

    /** @private */
    _detectBruteForce(auditLog) {
        const threats = [];
        if (!Array.isArray(auditLog) || auditLog.length === 0) return threats;

        const windowStart = Date.now() - THRESHOLDS.brute_force.windowMs;
        const failMap = new Map(); // ip → count

        for (const entry of auditLog) {
            if (entry.outcome !== 'failure') continue;
            if (new Date(entry.timestamp).getTime() < windowStart) continue;

            const ip = entry.ip || entry.host || 'unknown';
            failMap.set(ip, (failMap.get(ip) || 0) + 1);
        }

        for (const [ip, count] of failMap) {
            if (count >= THRESHOLDS.brute_force.failedAuthPerMin) {
                threats.push({
                    type:        'brute_force',
                    severity:    count > 30 ? 'critical' : 'high',
                    ip,
                    count,
                    description: `Brute-force detected: ${count} failed auth attempts from ${ip} in 1 min`,
                });
            }
        }

        return threats;
    }

    /** @private */
    _detectDosAttack(metrics) {
        const threats = [];
        if (!metrics || !metrics.requestRate) return threats;

        const { current, baseline } = metrics.requestRate;
        if (typeof current !== 'number' || typeof baseline !== 'number') return threats;

        if (baseline > 0 && current / baseline >= THRESHOLDS.dos_attack.reqSpike) {
            threats.push({
                type:        'dos_attack',
                severity:    current / baseline >= 10 ? 'critical' : 'high',
                description: `DoS spike: request rate is ${(current / baseline).toFixed(1)}× baseline (${current} req/s vs ${baseline} req/s)`,
                service:     metrics.service || 'api-gateway',
            });
        }

        return threats;
    }

    /** @private */
    _detectDataExfiltration(metrics) {
        const threats = [];
        if (!metrics || !metrics.outboundBytesPerMin) return threats;

        const { value, service } = metrics.outboundBytesPerMin;
        if (typeof value === 'number' && value > THRESHOLDS.data_exfiltration.bytesPerMin) {
            threats.push({
                type:        'data_exfiltration',
                severity:    'critical',
                service:     service || 'unknown',
                bytesPerMin: value,
                description: `Unusual outbound data: ${(value / 1024 / 1024).toFixed(1)} MB/min from ${service}`,
            });
        }

        return threats;
    }

    /** @private */
    _detectCompromisedService(metrics, alerts) {
        const threats = [];
        const threshold = THRESHOLDS.compromised_service.errorRatePct;

        // From metrics.
        if (metrics && Array.isArray(metrics.services)) {
            for (const svc of metrics.services) {
                if (typeof svc.errorRatePct === 'number' && svc.errorRatePct >= threshold) {
                    threats.push({
                        type:         'compromised_service',
                        severity:     svc.errorRatePct >= 60 ? 'critical' : 'high',
                        service:      svc.name,
                        errorRatePct: svc.errorRatePct,
                        description:  `Service ${svc.name} has ${svc.errorRatePct.toFixed(1)}% 5xx error rate — possible compromise`,
                    });
                }
            }
        }

        // From alerts with relevant category.
        if (Array.isArray(alerts)) {
            for (const alert of alerts) {
                if (
                    alert.category === 'incident' &&
                    alert.severity === 'critical' &&
                    !threats.find(t => t.service === alert.service)
                ) {
                    threats.push({
                        type:        'compromised_service',
                        severity:    'high',
                        service:     alert.service || 'unknown',
                        description: `Critical incident alert on ${alert.service}: ${alert.name}`,
                    });
                }
            }
        }

        return threats;
    }

    /** @private */
    _detectConfigDrift(auditLog) {
        const threats = [];
        if (!Array.isArray(auditLog)) return threats;

        const windowStart = Date.now() - THRESHOLDS.config_drift.windowMs;
        const configChanges = auditLog.filter(e =>
            new Date(e.timestamp).getTime() >= windowStart &&
            e.command && /config|deploy|scale|env/i.test(e.command)
        );

        if (configChanges.length >= THRESHOLDS.config_drift.changesInWindow) {
            threats.push({
                type:        'config_drift',
                severity:    'medium',
                count:       configChanges.length,
                description: `Config drift: ${configChanges.length} configuration changes detected in last 5 minutes`,
                actors:      [...new Set(configChanges.map(e => e.actor || 'unknown'))],
            });
        }

        return threats;
    }

    /** @private */
    _detectVulnerabilities(alerts) {
        const threats = [];
        if (!Array.isArray(alerts)) return threats;

        for (const alert of alerts) {
            if (alert.name && /CVE-\d{4}-\d+/i.test(alert.name)) {
                threats.push({
                    type:        'vulnerability_detected',
                    severity:    alert.severity || 'high',
                    cve:         alert.name,
                    description: `CVE reference found in alert: ${alert.name}`,
                    service:     alert.service || 'unknown',
                });
            }
        }

        return threats;
    }

    // -----------------------------------------------------------------------
    // Response action helpers
    // -----------------------------------------------------------------------

    /** @private */
    async _blockIpAction(ip, threat, permGate, notifier) {
        if (!ip || ip === 'unknown') {
            return { action: 'block_ip', status: 'skipped', reason: 'ip unknown' };
        }

        // Low-severity brute-force: auto-block.
        if (threat.severity === 'high') {
            this._blockedIps.add(ip);
            this._saveBlockedIps();
            return { action: 'block_ip', status: 'executed', ip };
        }

        // Critical: request permission.
        const { id } = await permGate.requestPermission(
            'block_ip',
            `Block IP ${ip} due to ${threat.type} (${threat.severity})`,
            { ip, threat },
            threat.severity
        );
        return { action: 'block_ip', status: 'pending_permission', permissionId: id, ip };
    }

    /** @private */
    async _emergencyShutdownAction(service, threat, permGate, notifier) {
        if (!service) return { action: 'emergency_shutdown', status: 'skipped', reason: 'service unknown' };

        const { id } = await permGate.requestPermission(
            'emergency_shutdown',
            `Emergency shutdown of ${service} due to ${threat.type}`,
            { service, threat },
            'emergency'
        );

        return {
            action:       'emergency_shutdown',
            status:       'pending_permission',
            permissionId: id,
            service,
        };
    }

    /** @private */
    async _rateLimitAction(service, threat, permGate, notifier) {
        if (!service) return { action: 'rate_limit', status: 'skipped', reason: 'service unknown' };

        const { id } = await permGate.requestPermission(
            'rate_limit_service',
            `Apply rate limiting to ${service} due to ${threat.type}`,
            { service, threat },
            'high'
        );

        return {
            action:       'rate_limit_service',
            status:       'pending_permission',
            permissionId: id,
            service,
        };
    }

    /**
     * Execute a previously approved action.
     *
     * @param {object} permRecord  Approved permission record.
     * @returns {Promise<{action: string, status: string, output?: string}>}
     */
    async executeApprovedAction(permRecord) {
        const { action, data } = permRecord;

        switch (action) {
            case 'block_ip': {
                const ip = data && data.ip;
                if (ip) {
                    this._blockedIps.add(ip);
                    this._saveBlockedIps();
                }
                return { action, status: 'executed', ip };
            }

            case 'emergency_shutdown': {
                const svc = data && data.service;
                if (!svc) return { action, status: 'skipped', reason: 'no service' };
                try {
                    const { stdout } = await execFileAsync(
                        'node',
                        [CLI_PATH, 'stop', '--service', svc],
                        { timeout: 30_000 }
                    );
                    return { action, status: 'executed', service: svc, output: stdout.trim() };
                } catch (err) {
                    return { action, status: 'failed', service: svc, error: err.message };
                }
            }

            case 'rate_limit_service': {
                const svc = data && data.service;
                console.log(`[security] Rate limiting applied to ${svc} (simulated).`);
                return { action, status: 'executed', service: svc };
            }

            default:
                return { action, status: 'unknown_action' };
        }
    }

    // -----------------------------------------------------------------------
    // Persistence helpers
    // -----------------------------------------------------------------------

    /** @private */
    _loadBlockedIps() {
        if (fs.existsSync(BLOCKED_IPS_FILE)) {
            try {
                return JSON.parse(fs.readFileSync(BLOCKED_IPS_FILE, 'utf8')) || [];
            } catch (_) { return []; }
        }
        return [];
    }

    /** @private */
    _saveBlockedIps() {
        try {
            fs.writeFileSync(
                BLOCKED_IPS_FILE,
                JSON.stringify([...this._blockedIps], null, 2),
                'utf8'
            );
        } catch (e) {
            console.error('[security] Failed to save blocked IPs:', e.message);
        }
    }

    /** @private */
    _ensureDir() {
        if (!fs.existsSync(AI_STATE_DIR)) {
            fs.mkdirSync(AI_STATE_DIR, { recursive: true });
        }
    }

    /** @private */
    _uuid() {
        return crypto.randomBytes(16).toString('hex').replace(
            /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
            '$1-$2-$3-$4-$5'
        );
    }
}

module.exports = { SecurityMonitor };
