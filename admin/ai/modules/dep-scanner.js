'use strict';

/**
 * @fileoverview Dependency vulnerability scanner for the Milonexa AI Admin Agent.
 *
 * Capabilities (v2.1):
 *  - Runs `npm audit --json` in each service directory using Node.js built-in child_process.
 *  - Parses the npm audit JSON report and normalises findings to a standard schema.
 *  - Assigns severity levels aligned with npm audit levels (critical, high, moderate→medium, low, info→low).
 *  - Writes scan reports to .admin-cli/ai/dep-scan/YYYY-MM-DD.json.
 *  - Exposes last scan summary and findings via getLastRunSummary() / getFindings().
 *
 * All I/O uses ONLY Node.js built-in modules.
 */

const fs            = require('fs');
const path          = require('path');
const { execFile }  = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

const ADMIN_HOME   = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const AI_STATE_DIR = path.join(ADMIN_HOME, 'ai');
const SCAN_DIR     = path.join(AI_STATE_DIR, 'dep-scan');
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

/** Service directories to scan. */
const SERVICE_DIRS = [
    'services/api-gateway',
    'services/user-service',
    'services/content-service',
    'services/media-service',
    'services/messaging-service',
    'services/collaboration-service',
    'services/streaming-service',
    'services/shop-service',
    'frontend',
    'admin',
];

/** npm audit severity → internal severity mapping. */
const SEVERITY_MAP = {
    critical: 'critical',
    high:     'high',
    moderate: 'medium',
    low:      'low',
    info:     'low',
};

// ---------------------------------------------------------------------------
// DepScanner
// ---------------------------------------------------------------------------

class DepScanner {
    constructor() {
        this._ensureDirs();
        /** @type {object[]} */
        this._lastFindings = [];
        this._lastRunAt = null;
        /** @type {object} */
        this._lastSummary = null;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Run npm audit across all service directories.
     * @returns {Promise<{ findings: object[], summary: object }>}
     */
    async scan() {
        console.log('[dep-scanner] Starting dependency vulnerability scan…');
        this._lastRunAt = new Date().toISOString();
        const findings = [];

        for (const relDir of SERVICE_DIRS) {
            const absDir = path.join(PROJECT_ROOT, relDir);
            if (!fs.existsSync(path.join(absDir, 'package.json'))) continue;
            try {
                const svcFindings = await this._auditDir(absDir, relDir);
                findings.push(...svcFindings);
                if (svcFindings.length > 0) {
                    console.log(`[dep-scanner] ${relDir}: ${svcFindings.length} vulnerability(ies)`);
                }
            } catch (e) {
                console.error(`[dep-scanner] ${relDir} audit error: ${e.message}`);
            }
        }

        this._lastFindings = findings;

        const summary = this._buildSummary(findings);
        this._lastSummary = summary;
        this._saveReport(findings, summary);

        console.log(`[dep-scanner] Scan complete. ${findings.length} total vulnerabilities found.`);
        return { findings, summary };
    }

    /** @returns {{ lastRunAt: string|null, total: number, bySeverity: object }} */
    getLastRunSummary() {
        return {
            lastRunAt: this._lastRunAt,
            total:     this._lastFindings.length,
            bySeverity: this._lastSummary ? this._lastSummary.bySeverity : { critical: 0, high: 0, medium: 0, low: 0 },
        };
    }

    /**
     * @param {number} [limit]
     * @returns {object[]}
     */
    getFindings(limit = 100) {
        return this._lastFindings.slice(0, limit);
    }

    // -----------------------------------------------------------------------
    // Private
    // -----------------------------------------------------------------------

    /** @private */
    async _auditDir(absDir, relDir) {
        let stdout = '';
        try {
            const result = await execFileAsync(
                'npm',
                // `--package-lock-only` audits the lock file without installing,
                // which is fast and safe for CI. Trade-off: may miss advisories for
                // un-locked transitive deps. For a full audit, omit this flag and
                // run with a populated node_modules directory.
                ['audit', '--json', '--package-lock-only'],
                { cwd: absDir, timeout: 60000, maxBuffer: 10 * 1024 * 1024 }
            );
            stdout = result.stdout;
        } catch (err) {
            // npm audit exits with non-zero when vulnerabilities are found — that's expected.
            stdout = err.stdout || '';
            if (!stdout) {
                // Real error (npm not found, etc.)
                return [];
            }
        }

        if (!stdout.trim()) return [];

        let auditData;
        try {
            auditData = JSON.parse(stdout);
        } catch (_) {
            return [];
        }

        // npm audit v7+ uses `vulnerabilities` key; older versions use `advisories`.
        const findings = [];

        if (auditData.vulnerabilities) {
            // npm ≥ 7 format
            for (const [pkgName, vuln] of Object.entries(auditData.vulnerabilities)) {
                if (!vuln || !vuln.severity) continue;
                const severity = SEVERITY_MAP[vuln.severity] || 'low';
                const via = Array.isArray(vuln.via)
                    ? vuln.via.filter(v => typeof v === 'object').map(v => v.title || v.url || '').filter(Boolean)
                    : [];
                findings.push({
                    id:           `dep-vuln-${pkgName}`,
                    severity,
                    package:      pkgName,
                    range:        vuln.range || 'unknown',
                    fixAvailable: vuln.fixAvailable === true || (typeof vuln.fixAvailable === 'object'),
                    via,
                    service:      relDir,
                    detectedAt:   new Date().toISOString(),
                });
            }
        } else if (auditData.advisories) {
            // npm < 7 format
            for (const [, advisory] of Object.entries(auditData.advisories)) {
                const severity = SEVERITY_MAP[advisory.severity] || 'low';
                findings.push({
                    id:           `dep-vuln-${advisory.module_name}-${advisory.id}`,
                    severity,
                    package:      advisory.module_name,
                    range:        advisory.vulnerable_versions || 'unknown',
                    fixAvailable: !!(advisory.patched_versions && advisory.patched_versions !== '<0.0.0'),
                    via:          [advisory.title || ''],
                    service:      relDir,
                    detectedAt:   new Date().toISOString(),
                });
            }
        }

        return findings;
    }

    /** @private */
    _buildSummary(findings) {
        const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
        const byService  = {};
        for (const f of findings) {
            bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
            byService[f.service]   = (byService[f.service] || 0) + 1;
        }
        return { total: findings.length, bySeverity, byService, generatedAt: new Date().toISOString() };
    }

    /** @private */
    _saveReport(findings, summary) {
        const date     = new Date().toISOString().split('T')[0];
        const filePath = path.join(SCAN_DIR, `${date}.json`);
        try {
            fs.writeFileSync(filePath, JSON.stringify({ summary, findings }, null, 2), 'utf8');
        } catch (_) {}
    }

    /** @private */
    _ensureDirs() {
        [AI_STATE_DIR, SCAN_DIR].forEach(d => {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        });
    }
}

module.exports = { DepScanner };
