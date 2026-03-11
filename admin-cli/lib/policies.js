/**
 * Policy-as-Code Engine (Phase D)
 *
 * Manages pluggable custom policies that can extend or override default RBAC rules,
 * compliance checks, and operational guardrails.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Policy Engine
// ---------------------------------------------------------------------------

/**
 * Policy structure:
 * {
 *   apiVersion: "admin-cli.milonexa.io/v1",
 *   kind: "Policy",
 *   metadata: { name, namespace, createdAt },
 *   spec: {
 *     type: 'rbac' | 'operational' | 'compliance' | 'cost',
 *     rules: [ { ... } ]
 *   }
 * }
 */

class PolicyEngine {
    constructor(policiesDir) {
        this.policiesDir = policiesDir;
        this.ensureDir();
        this.policies = this.loadPolicies();
        this.customRules = this.compilePolicies();
    }

    ensureDir() {
        if (!fs.existsSync(this.policiesDir)) {
            fs.mkdirSync(this.policiesDir, { recursive: true });
        }
    }

    /**
     * Load all policy files from directory
     */
    loadPolicies() {
        const policies = [];
        if (!fs.existsSync(this.policiesDir)) return policies;

        const files = fs.readdirSync(this.policiesDir);
        for (const file of files) {
            if (!file.endsWith('.yaml') && !file.endsWith('.yml') && !file.endsWith('.json')) {
                continue;
            }
            const filePath = path.join(this.policiesDir, file);
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const policy = this.parsePolicy(content, file);
                if (policy) {
                    policies.push(policy);
                }
            } catch (err) {
                console.error(`Failed to load policy ${file}:`, err.message);
            }
        }
        return policies;
    }

    /**
     * Parse policy from YAML/JSON
     */
    parsePolicy(content, filename) {
        try {
            // Simple YAML parser (real implementation would use yaml library)
            // For now, support JSON format
            if (filename.endsWith('.json')) {
                return JSON.parse(content);
            }
            // Basic YAML parsing: assume simple key:value format
            // In production, use proper YAML library
            const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
            const policy = {};
            return policy; // Would be properly parsed YAML
        } catch (err) {
            return null;
        }
    }

    /**
     * Compile policies into executable rules
     */
    compilePolicies() {
        const rules = {
            rbac: [],
            operational: [],
            compliance: [],
            cost: [],
        };

        for (const policy of this.policies) {
            if (policy.kind !== 'Policy') continue;
            const type = policy.spec?.type || 'operational';
            if (policy.spec?.rules) {
                rules[type] = rules[type].concat(policy.spec.rules);
            }
        }

        return rules;
    }

    /**
     * Add policy from JSON
     */
    addPolicy(policyObj) {
        policyObj.metadata = policyObj.metadata || {};
        policyObj.metadata.createdAt = new Date().toISOString();
        this.policies.push(policyObj);
        this.customRules = this.compilePolicies();
        this.savePolicy(policyObj);
        return policyObj;
    }

    /**
     * Save policy to file
     */
    savePolicy(policy) {
        const name = policy.metadata?.name || 'policy-' + Date.now();
        const filename = path.join(this.policiesDir, `${name}.json`);
        fs.writeFileSync(filename, JSON.stringify(policy, null, 2), 'utf8');
    }

    /**
     * Get custom RBAC rules
     */
    getRBACRules() {
        return this.customRules.rbac;
    }

    /**
     * Get operational rules (scaling limits, deployment strategies, etc.)
     */
    getOperationalRules() {
        return this.customRules.operational;
    }

    /**
     * Get compliance rules
     */
    getComplianceRules() {
        return this.customRules.compliance;
    }

    /**
     * Get cost control rules (budget limits, resource quotas, etc.)
     */
    getCostRules() {
        return this.customRules.cost;
    }

    /**
     * Evaluate a policy against a request
     * @param {Object} request - { action, role, runtime, service, ... }
     * @returns {Object} - { allowed: bool, reason: string, appliedPolicies: [string] }
     */
    evaluate(request) {
        const appliedPolicies = [];
        let allowed = true;
        let reason = 'default allow';

        // Check RBAC policies
        for (const rule of this.customRules.rbac) {
            if (this.matchesRule(request, rule)) {
                appliedPolicies.push(rule.name);
                if (!rule.effect || rule.effect === 'Deny') {
                    allowed = false;
                    reason = rule.reason || 'Policy denial';
                }
            }
        }

        // Check operational policies
        for (const rule of this.customRules.operational) {
            if (this.matchesRule(request, rule)) {
                appliedPolicies.push(rule.name);
                if (rule.metadata?.enforceable && rule.effect === 'Deny') {
                    allowed = false;
                    reason = rule.reason || 'Operational policy violation';
                }
            }
        }

        return { allowed, reason, appliedPolicies };
    }

    /**
     * Check if request matches rule conditions
     */
    matchesRule(request, rule) {
        const conditions = rule.conditions || {};
        for (const [key, value] of Object.entries(conditions)) {
            if (Array.isArray(value)) {
                if (!value.includes(request[key])) return false;
            } else if (typeof value === 'string' && value.includes('*')) {
                // Wildcard matching
                const pattern = new RegExp('^' + value.replace(/\*/g, '.*') + '$');
                if (!pattern.test(request[key])) return false;
            } else {
                if (request[key] !== value) return false;
            }
        }
        return true;
    }

    /**
     * List all policies
     */
    listPolicies(filters = {}) {
        let results = this.policies;
        if (filters.type) {
            results = results.filter(p => p.spec?.type === filters.type);
        }
        if (filters.enabled !== undefined) {
            results = results.filter(p => p.metadata?.enabled !== false);
        }
        return results;
    }
}

// ---------------------------------------------------------------------------
// Default Policy Templates
// ---------------------------------------------------------------------------

/**
 * Example: Restrict rollout strategies in prod
 */
function createProductionRolloutPolicy() {
    return {
        apiVersion: 'admin-cli.milonexa.io/v1',
        kind: 'Policy',
        metadata: {
            name: 'production-rollout-policy',
            namespace: 'milonexa',
            createdAt: new Date().toISOString(),
        },
        spec: {
            type: 'operational',
            rules: [
                {
                    name: 'require-canary-in-prod',
                    description: 'Production rollouts must use canary strategy',
                    effect: 'Deny',
                    conditions: {
                        action: 'rollout',
                        runtime: 'k8s',
                        environment: 'production',
                        strategy: ['rolling', 'direct'],
                    },
                    reason: 'Production rollouts require canary or bluegreen',
                    metadata: { enforceable: true },
                },
            ],
        },
    };
}

/**
 * Example: Cost control policy
 */
function createCostControlPolicy() {
    return {
        apiVersion: 'admin-cli.milonexa.io/v1',
        kind: 'Policy',
        metadata: {
            name: 'cost-control-policy',
            namespace: 'milonexa',
        },
        spec: {
            type: 'cost',
            rules: [
                {
                    name: 'limit-max-replicas',
                    description: 'Limit maximum replicas per service',
                    conditions: { action: 'scale' },
                    parameters: {
                        maxReplicas: 10,
                        maxTotalCPU: 64,
                        maxTotalMemory: '256Gi',
                    },
                    reason: 'Cost budgeting limit exceeded',
                },
            ],
        },
    };
}

/**
 * Example: Compliance policy
 */
function createCompliancePolicy() {
    return {
        apiVersion: 'admin-cli.milonexa.io/v1',
        kind: 'Policy',
        metadata: {
            name: 'compliance-policy',
            namespace: 'milonexa',
        },
        spec: {
            type: 'compliance',
            rules: [
                {
                    name: 'require-audit-logging',
                    description: 'All operations must be audit logged',
                    effect: 'Deny',
                    conditions: { auditLogged: false },
                    reason: 'Audit logging required',
                },
                {
                    name: 'require-backup-before-destructive',
                    description: 'Require backup prior to destroy operations',
                    conditions: { action: ['stop', 'delete'] },
                    requirements: ['backup'],
                    reason: 'Backup required before destructive operations',
                },
            ],
        },
    };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    PolicyEngine,
    createProductionRolloutPolicy,
    createCostControlPolicy,
    createCompliancePolicy,
};
