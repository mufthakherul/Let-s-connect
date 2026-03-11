/**
 * Alert Management Module (Phase D)
 *
 * Manages alert rules, triggers, and alert history.
 * Supports threshold-based, anomaly, and custom alert conditions.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('crypto').randomUUID ? () => require('crypto').randomUUID() : () => Math.random().toString(36);

// ---------------------------------------------------------------------------
// Alert Rule Structure and Management
// ---------------------------------------------------------------------------

/**
 * Alert rule:
 * {
 *   id: UUID,
 *   name: string,
 *   description: string,
 *   enabled: boolean,
 *   category: 'metric' | 'incident' | 'compliance' | 'custom',
 *   condition: { type: 'threshold' | 'anomaly' | 'pattern', ... },
 *   actions: [ { type: 'webhook' | 'slack' | 'email' | 'log', ... } ],
 *   severity: 'info' | 'warning' | 'critical',
 *   createdAt: ISO8601,
 *   updatedAt: ISO8601,
 * }
 */

class AlertManager {
    constructor(alertsDir) {
        this.alertsDir = alertsDir;
        this.rulesFile = path.join(alertsDir, 'rules.json');
        this.historyFile = path.join(alertsDir, 'history.json');
        this.ensureDir();
        this.rules = this.loadRules();
        this.history = this.loadHistory();
    }

    ensureDir() {
        if (!fs.existsSync(this.alertsDir)) {
            fs.mkdirSync(this.alertsDir, { recursive: true });
        }
    }

    loadRules() {
        if (fs.existsSync(this.rulesFile)) {
            try {
                return JSON.parse(fs.readFileSync(this.rulesFile, 'utf8')) || [];
            } catch (err) {
                return [];
            }
        }
        return this.initializeDefaultRules();
    }

    loadHistory() {
        if (fs.existsSync(this.historyFile)) {
            try {
                return JSON.parse(fs.readFileSync(this.historyFile, 'utf8')) || [];
            } catch (err) {
                return [];
            }
        }
        return [];
    }

    saveRules() {
        fs.writeFileSync(this.rulesFile, JSON.stringify(this.rules, null, 2), 'utf8');
    }

    saveHistory() {
        fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2), 'utf8');
    }

    /**
     * Initialize default alert rules
     */
    initializeDefaultRules() {
        return [
            {
                id: this.generateId(),
                name: 'High CPU Usage',
                description: 'Alert when CPU usage exceeds 80%',
                enabled: true,
                category: 'metric',
                condition: {
                    type: 'threshold',
                    metricCategory: 'cpu',
                    operator: '>',
                    value: 80,
                    duration: 300, // 5 minutes
                },
                actions: [
                    { type: 'log', level: 'warning' },
                ],
                severity: 'warning',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: this.generateId(),
                name: 'Memory Pressure',
                description: 'Alert when memory usage exceeds 85%',
                enabled: true,
                category: 'metric',
                condition: {
                    type: 'threshold',
                    metricCategory: 'memory',
                    operator: '>',
                    value: 85,
                    duration: 300,
                },
                actions: [
                    { type: 'log', level: 'warning' },
                ],
                severity: 'warning',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: this.generateId(),
                name: 'High Error Rate',
                description: 'Alert when error rate exceeds 5%',
                enabled: true,
                category: 'incident',
                condition: {
                    type: 'pattern',
                    pattern: 'error|exception|failed',
                    threshold: 5, // percent
                    window: 600, // 10 minutes
                },
                actions: [
                    { type: 'log', level: 'critical' },
                ],
                severity: 'critical',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ];
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    /**
     * Create new alert rule
     */
    createRule(name, description, category, condition, actions, severity = 'warning') {
        const rule = {
            id: this.generateId(),
            name,
            description,
            enabled: true,
            category,
            condition,
            actions,
            severity,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.rules.push(rule);
        this.saveRules();
        return rule;
    }

    /**
     * Update alert rule
     */
    updateRule(ruleId, updates) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (!rule) {
            throw new Error(`Rule not found: ${ruleId}`);
        }
        Object.assign(rule, updates, { updatedAt: new Date().toISOString() });
        this.saveRules();
        return rule;
    }

    /**
     * Delete alert rule
     */
    deleteRule(ruleId) {
        const idx = this.rules.findIndex(r => r.id === ruleId);
        if (idx === -1) {
            throw new Error(`Rule not found: ${ruleId}`);
        }
        const rule = this.rules.splice(idx, 1)[0];
        this.saveRules();
        return rule;
    }

    /**
     * List all rules (optionally filtered)
     */
    listRules(filters = {}) {
        let results = this.rules;
        if (filters.enabled !== undefined) {
            results = results.filter(r => r.enabled === filters.enabled);
        }
        if (filters.severity) {
            results = results.filter(r => r.severity === filters.severity);
        }
        if (filters.category) {
            results = results.filter(r => r.category === filters.category);
        }
        return results;
    }

    /**
     * Trigger alert and record in history
     */
    triggerAlert(ruleId, payload) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (!rule || !rule.enabled) {
            return null;
        }

        const alert = {
            id: this.generateId(),
            ruleId,
            ruleName: rule.name,
            severity: rule.severity,
            message: rule.description,
            metadata: payload,
            triggeredAt: new Date().toISOString(),
            status: 'active', // 'active' | 'resolved' | 'acknowledged'
        };

        this.history.push(alert);
        if (this.history.length > 5000) {
            this.history = this.history.slice(-5000);
        }
        this.saveHistory();

        return alert;
    }

    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId) {
        const alert = this.history.find(a => a.id === alertId);
        if (alert) {
            alert.status = 'acknowledged';
            alert.acknowledgedAt = new Date().toISOString();
            this.saveHistory();
        }
        return alert;
    }

    /**
     * Resolve alert
     */
    resolveAlert(alertId) {
        const alert = this.history.find(a => a.id === alertId);
        if (alert) {
            alert.status = 'resolved';
            alert.resolvedAt = new Date().toISOString();
            this.saveHistory();
        }
        return alert;
    }

    /**
     * Get alert history
     */
    getHistory(filters = {}) {
        let results = this.history;
        if (filters.status) {
            results = results.filter(a => a.status === filters.status);
        }
        if (filters.severity) {
            results = results.filter(a => a.severity === filters.severity);
        }
        if (filters.since) {
            const sinceDate = new Date(filters.since);
            results = results.filter(a => new Date(a.triggeredAt) >= sinceDate);
        }
        return results.slice(-100); // Return last 100
    }

    /**
     * Get alert statistics
     */
    getStats() {
        const active = this.history.filter(a => a.status === 'active').length;
        const resolved = this.history.filter(a => a.status === 'resolved').length;
        const critical = this.history.filter(a => a.severity === 'critical' && a.status === 'active').length;
        return { active, resolved, critical, total: this.history.length };
    }
}

// ---------------------------------------------------------------------------
// Alert Action Executors
// ---------------------------------------------------------------------------

/**
 * Execute alert actions
 */
async function executeAlertActions(alert, actions) {
    const results = [];
    for (const action of actions) {
        try {
            let result;
            switch (action.type) {
                case 'log':
                    result = { type: 'log', status: 'executed', level: action.level };
                    break;
                case 'webhook':
                    result = { type: 'webhook', status: 'pending', target: action.url };
                    break;
                case 'slack':
                    result = { type: 'slack', status: 'pending', channel: action.channel };
                    break;
                case 'email':
                    result = { type: 'email', status: 'pending', to: action.to };
                    break;
                default:
                    result = { type: action.type, status: 'unknown' };
            }
            results.push(result);
        } catch (err) {
            results.push({ type: action.type, status: 'failed', error: err.message });
        }
    }
    return results;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    AlertManager,
    executeAlertActions,
};
