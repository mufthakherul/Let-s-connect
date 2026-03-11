/**
 * Compliance Auditing and Reporting Module (Phase D)
 *
 * Tracks compliance status, generates audit reports, and ensures operational
 * adherence to security, governance, and best-practice standards.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Compliance Framework
// ---------------------------------------------------------------------------

/**
 * Compliance check result:
 * {
 *   id: string,
 *   name: string,
 *   category: 'security' | 'governance' | 'performance' | 'cost' | 'reliability',
 *   status: 'pass' | 'fail' | 'warning' | 'unknown',
 *   severity: 'info' | 'low' | 'medium' | 'high' | 'critical',
 *   message: string,
 *   details: object,
 *   timestamp: ISO8601,
 *   remediation: string, // how to fix if failed
 * }
 */

class ComplianceManager {
    constructor(complianceDir) {
        this.complianceDir = complianceDir;
        this.resultsFile = path.join(complianceDir, 'results.json');
        this.reportsDir = path.join(complianceDir, 'reports');
        this.ensureDir();
        this.results = this.loadResults();
    }

    ensureDir() {
        if (!fs.existsSync(this.complianceDir)) {
            fs.mkdirSync(this.complianceDir, { recursive: true });
        }
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }
    }

    loadResults() {
        if (fs.existsSync(this.resultsFile)) {
            try {
                return JSON.parse(fs.readFileSync(this.resultsFile, 'utf8')) || [];
            } catch (err) {
                return [];
            }
        }
        return [];
    }

    saveResults() {
        fs.writeFileSync(this.resultsFile, JSON.stringify(this.results, null, 2), 'utf8');
    }

    /**
     * Record compliance check result
     */
    recordResult(checkId, checkName, category, status, severity, message, details = {}, remediation = '') {
        const result = {
            id: checkId,
            name: checkName,
            category,
            status,
            severity,
            message,
            details,
            timestamp: new Date().toISOString(),
            remediation,
        };
        this.results.push(result);
        if (this.results.length > 10000) {
            this.results = this.results.slice(-10000);
        }
        this.saveResults();
        return result;
    }

    /**
     * Get latest compliance status
     */
    getStatus(filters = {}) {
        let checks = this.results;

        // Get latest result for each unique check
        const latestById = {};
        for (const check of checks) {
            if (!latestById[check.id] || new Date(check.timestamp) > new Date(latestById[check.id].timestamp)) {
                latestById[check.id] = check;
            }
        }

        checks = Object.values(latestById);

        if (filters.category) {
            checks = checks.filter(c => c.category === filters.category);
        }
        if (filters.status) {
            checks = checks.filter(c => c.status === filters.status);
        }

        const summary = {
            total: checks.length,
            passed: checks.filter(c => c.status === 'pass').length,
            failed: checks.filter(c => c.status === 'fail').length,
            warnings: checks.filter(c => c.status === 'warning').length,
            unknown: checks.filter(c => c.status === 'unknown').length,
            byCriticality: {
                critical: checks.filter(c => c.severity === 'critical' && c.status !== 'pass').length,
                high: checks.filter(c => c.severity === 'high' && c.status !== 'pass').length,
            },
            checks,
        };

        return summary;
    }

    /**
     * Generate compliance report
     */
    generateReport(format = 'summary') {
        const status = this.getStatus();
        const timestamp = new Date().toISOString();

        let report = {
            timestamp,
            format,
            summary: {
                total: status.total,
                passed: status.passed,
                failed: status.failed,
                warnings: status.warnings,
                complianceScore: status.total > 0 ? ((status.passed / status.total) * 100).toFixed(1) + '%' : 'N/A',
            },
        };

        if (format === 'detailed') {
            report.details = {
                byCategory: this.aggregateByCategory(status.checks),
                failedChecks: status.checks.filter(c => c.status === 'fail'),
                warningChecks: status.checks.filter(c => c.status === 'warning'),
            };
            report.recommendations = this.generateRecommendations(status.checks);
        }

        const filename = path.join(
            this.reportsDir,
            `compliance-report-${new Date().toISOString().split('T')[0]}.json`
        );
        fs.writeFileSync(filename, JSON.stringify(report, null, 2), 'utf8');

        return report;
    }

    /**
     * Aggregate checks by category
     */
    aggregateByCategory(checks) {
        const grouped = {};
        for (const check of checks) {
            if (!grouped[check.category]) {
                grouped[check.category] = { total: 0, passed: 0, failed: 0, warning: 0 };
            }
            grouped[check.category].total += 1;
            if (check.status === 'pass') grouped[check.category].passed += 1;
            if (check.status === 'fail') grouped[check.category].failed += 1;
            if (check.status === 'warning') grouped[check.category].warning += 1;
        }
        return grouped;
    }

    /**
     * Generate remediation recommendations
     */
    generateRecommendations(checks) {
        const recommendations = [];
        for (const check of checks) {
            if ((check.status === 'fail' || check.status === 'warning') && check.remediation) {
                recommendations.push({
                    check: check.name,
                    severity: check.severity,
                    remediation: check.remediation,
                });
            }
        }
        return recommendations;
    }

    /**
     * Export report for audit purposes
     */
    exportReport(format = 'json') {
        const report = this.generateReport('detailed');
        return report;
    }
}

// ---------------------------------------------------------------------------
// Standard Compliance Checks
// ---------------------------------------------------------------------------

/**
 * Security compliance checks
 */
const SECURITY_CHECKS = [
    {
        id: 'sec-001',
        name: 'RBAC Enabled',
        category: 'security',
        description: 'Role-based access control must be enabled',
    },
    {
        id: 'sec-002',
        name: 'Audit Logging Active',
        category: 'security',
        description: 'All operations must be audit logged',
    },
    {
        id: 'sec-003',
        name: 'Secrets Encrypted',
        category: 'security',
        description: 'Sensitive data must be encrypted at rest',
    },
    {
        id: 'sec-004',
        name: 'Network Policies Enforced',
        category: 'security',
        description: 'Kubernetes network policies must be in place',
    },
];

/**
 * Governance compliance checks
 */
const GOVERNANCE_CHECKS = [
    {
        id: 'gov-001',
        name: 'Change Control Process',
        category: 'governance',
        description: 'All changes must follow approved process',
    },
    {
        id: 'gov-002',
        name: 'Incident Response Plan',
        category: 'governance',
        description: 'Incident response procedures must be documented',
    },
    {
        id: 'gov-003',
        name: 'Backup Policy Enforced',
        category: 'governance',
        description: 'Regular backups must be scheduled and tested',
    },
];

/**
 * Reliability compliance checks
 */
const RELIABILITY_CHECKS = [
    {
        id: 'rel-001',
        name: 'Health Checks Configured',
        category: 'reliability',
        description: 'All services must have health check endpoints',
    },
    {
        id: 'rel-002',
        name: 'SLA Monitoring',
        category: 'reliability',
        description: 'Service level agreements must be monitored',
    },
    {
        id: 'rel-003',
        name: 'Disaster Recovery Plan',
        category: 'reliability',
        description: 'DR procedures must be documented and tested',
    },
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    ComplianceManager,
    SECURITY_CHECKS,
    GOVERNANCE_CHECKS,
    RELIABILITY_CHECKS,
};
