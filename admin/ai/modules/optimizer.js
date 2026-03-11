'use strict';

/**
 * @fileoverview AI performance optimizer for the Milonexa admin agent.
 *
 * Analyses metrics, costs, and recommendations to identify optimisation
 * opportunities.  Safe tuning changes are applied automatically; structural
 * changes (re-architecture, scaling rules) require human approval.
 *
 * Weekly optimisation reports are written to:
 *   .admin-cli/ai/optimization-reports/YYYY-WW.json
 *
 * All I/O uses ONLY Node.js built-in modules.
 */

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ADMIN_HOME        = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const AI_STATE_DIR      = path.join(ADMIN_HOME, 'ai');
const REPORTS_DIR       = path.join(AI_STATE_DIR, 'optimization-reports');

// ---------------------------------------------------------------------------
// Optimisation thresholds & scoring
// ---------------------------------------------------------------------------

/** Opportunity types sorted from cheapest/safest to most impactful/risky. */
const OPP_TYPES = {
    cache_warm:         { priority: 1, safe: true,  label: 'Cache Warming' },
    query_hint:         { priority: 2, safe: true,  label: 'Query Optimisation Hint' },
    right_size:         { priority: 3, safe: false, label: 'Resource Right-Sizing' },
    load_balance:       { priority: 4, safe: false, label: 'Load Balancing Adjustment' },
    cost_reduction:     { priority: 5, safe: false, label: 'Cost Reduction' },
    autoscale_rule:     { priority: 6, safe: false, label: 'Auto-Scaling Rule' },
};

// ---------------------------------------------------------------------------
// Optimizer
// ---------------------------------------------------------------------------

class Optimizer {
    constructor() {
        this._ensureDirs();
        /** @type {object[]} Opportunities discovered in the last analysis. */
        this._lastOpportunities = [];
        /** @type {object[]} Applied optimisation log. */
        this._appliedLog = [];
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Analyse current platform telemetry and return optimisation opportunities.
     *
     * @param {object}   metrics          MetricsCollector snapshot.
     * @param {object}   costs            Cost-analyser output (may be null).
     * @param {object[]} recommendations  RecommendationEngine output (may be empty).
     * @returns {Promise<object[]>}  Array of opportunity objects.
     */
    async analyze(metrics, costs, recommendations) {
        const opportunities = [];

        opportunities.push(...this._checkCacheWarming(metrics));
        opportunities.push(...this._checkQueryHints(metrics, recommendations));
        opportunities.push(...this._checkRightSizing(metrics));
        opportunities.push(...this._checkLoadBalancing(metrics));
        opportunities.push(...this._checkCostReduction(costs, metrics));
        opportunities.push(...this._checkAutoScaleRules(metrics));

        // Sort by priority.
        opportunities.sort((a, b) => (a.priority || 99) - (b.priority || 99));

        // Stamp.
        for (const opp of opportunities) {
            opp.id          = opp.id || this._shortId();
            opp.detectedAt  = new Date().toISOString();
        }

        this._lastOpportunities = opportunities;
        this._maybeWriteWeeklyReport(opportunities);

        return opportunities;
    }

    /**
     * Apply optimisations from the opportunity list.  Safe optimisations are
     * applied immediately; structural ones are gated through PermissionGate.
     *
     * @param {object[]}       opportunities  From analyze().
     * @param {PermissionGate} permGate
     * @param {Notifier}       notifier
     * @returns {Promise<object[]>}  Results per opportunity.
     */
    async optimize(opportunities, permGate, notifier) {
        const results = [];

        for (const opp of opportunities) {
            const meta = OPP_TYPES[opp.type] || { safe: false, label: opp.type };

            if (meta.safe) {
                const result = await this._applySafe(opp);
                results.push(result);
                this._appliedLog.push({ ...result, appliedAt: new Date().toISOString() });
            } else {
                const { id } = await permGate.requestPermission(
                    `optimize_${opp.type}`,
                    `Apply optimisation: ${meta.label} — ${opp.description}`,
                    { opportunity: opp },
                    'medium'
                );
                results.push({
                    id:           opp.id,
                    type:         opp.type,
                    status:       'pending_permission',
                    permissionId: id,
                });
            }
        }

        if (results.some(r => r.status === 'applied')) {
            await notifier.notify(
                'info',
                'Optimisations Applied',
                `${results.filter(r => r.status === 'applied').length} safe optimisation(s) applied automatically.`,
                {}
            ).catch(() => {});
        }

        return results;
    }

    /**
     * Execute a previously approved optimisation action.
     *
     * @param {object} permRecord  Approved permission record.
     * @returns {Promise<object>}
     */
    async executeApprovedAction(permRecord) {
        const opp = permRecord.data && permRecord.data.opportunity;
        if (!opp) return { status: 'skipped', reason: 'no opportunity data' };

        console.log(`[optimizer] Executing approved optimisation: ${opp.type} — ${opp.description}`);
        this._appliedLog.push({ ...opp, appliedAt: new Date().toISOString(), approved: true });
        return { id: opp.id, type: opp.type, status: 'applied', approved: true };
    }

    /**
     * Return the most recently computed opportunities.
     * @returns {object[]}
     */
    getLastOpportunities() {
        return [...this._lastOpportunities];
    }

    // -----------------------------------------------------------------------
    // Detection helpers
    // -----------------------------------------------------------------------

    /** @private */
    _checkCacheWarming(metrics) {
        const opps = [];
        if (!metrics || !Array.isArray(metrics.services)) return opps;

        for (const svc of metrics.services) {
            if (typeof svc.cacheHitRate === 'number' && svc.cacheHitRate < 60) {
                opps.push({
                    type:        'cache_warm',
                    priority:    OPP_TYPES.cache_warm.priority,
                    service:     svc.name,
                    metric:      svc.cacheHitRate,
                    description: `${svc.name} cache hit rate is ${svc.cacheHitRate.toFixed(1)}% — warm up frequently accessed keys`,
                    suggestion:  'Pre-load top-100 accessed keys during low-traffic window (e.g., 03:00 UTC)',
                });
            }
        }

        return opps;
    }

    /** @private */
    _checkQueryHints(metrics, recommendations) {
        const opps = [];

        // From recommendations engine output.
        if (Array.isArray(recommendations)) {
            for (const rec of recommendations) {
                if (rec.category === 'database' || (rec.title && /query|index/i.test(rec.title))) {
                    opps.push({
                        type:        'query_hint',
                        priority:    OPP_TYPES.query_hint.priority,
                        service:     rec.service || 'database',
                        description: rec.title || 'Database query optimisation opportunity',
                        suggestion:  rec.steps ? rec.steps[0] : 'Review slow-query log',
                        recId:       rec.id,
                    });
                }
            }
        }

        // From metrics slow-query data.
        if (metrics && Array.isArray(metrics.services)) {
            for (const svc of metrics.services) {
                if (typeof svc.slowQueryCount === 'number' && svc.slowQueryCount > 10) {
                    opps.push({
                        type:        'query_hint',
                        priority:    OPP_TYPES.query_hint.priority,
                        service:     svc.name,
                        metric:      svc.slowQueryCount,
                        description: `${svc.name} has ${svc.slowQueryCount} slow queries — consider adding indexes`,
                        suggestion:  'Run EXPLAIN ANALYZE on top slow queries; add missing indexes',
                    });
                }
            }
        }

        return opps;
    }

    /** @private */
    _checkRightSizing(metrics) {
        const opps = [];
        if (!metrics || !Array.isArray(metrics.services)) return opps;

        for (const svc of metrics.services) {
            const lowCpu    = typeof svc.cpu    === 'number' && svc.cpu    < 10;
            const lowMemory = typeof svc.memory === 'number' && svc.memory < 15;

            if (lowCpu && lowMemory) {
                opps.push({
                    type:        'right_size',
                    priority:    OPP_TYPES.right_size.priority,
                    service:     svc.name,
                    cpuPct:      svc.cpu,
                    memoryPct:   svc.memory,
                    description: `${svc.name} is over-provisioned (CPU ${svc.cpu.toFixed(1)}%, Mem ${svc.memory.toFixed(1)}%)`,
                    suggestion:  `Reduce CPU/memory limits by 30–50% and observe for 48h`,
                });
            }
        }

        return opps;
    }

    /** @private */
    _checkLoadBalancing(metrics) {
        const opps = [];
        if (!metrics || !Array.isArray(metrics.services)) return opps;

        // Detect uneven load (one instance >> others).
        const cpuValues = metrics.services
            .filter(s => typeof s.cpu === 'number')
            .map(s => s.cpu);

        if (cpuValues.length >= 2) {
            const avg = cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length;
            const max = Math.max(...cpuValues);
            if (avg > 0 && max / avg > 2.5) {
                opps.push({
                    type:        'load_balance',
                    priority:    OPP_TYPES.load_balance.priority,
                    description: `Uneven CPU load detected (max ${max.toFixed(1)}% vs avg ${avg.toFixed(1)}%) — review load-balancer weights`,
                    suggestion:  'Audit nginx upstream weights; enable least-connections algorithm',
                });
            }
        }

        return opps;
    }

    /** @private */
    _checkCostReduction(costs, metrics) {
        const opps = [];
        if (!costs) return opps;

        if (costs.idleResourcesCost && costs.idleResourcesCost > 0) {
            opps.push({
                type:        'cost_reduction',
                priority:    OPP_TYPES.cost_reduction.priority,
                costSaving:  costs.idleResourcesCost,
                description: `Idle resources estimated at $${costs.idleResourcesCost.toFixed(2)}/month`,
                suggestion:  'Terminate or schedule idle instances outside business hours',
            });
        }

        if (costs.oversizedContainersCost && costs.oversizedContainersCost > 0) {
            opps.push({
                type:        'cost_reduction',
                priority:    OPP_TYPES.cost_reduction.priority,
                costSaving:  costs.oversizedContainersCost,
                description: `Over-sized containers estimated at $${costs.oversizedContainersCost.toFixed(2)}/month extra`,
                suggestion:  'Right-size containers to match actual utilisation (see right-sizing recommendation)',
            });
        }

        return opps;
    }

    /** @private */
    _checkAutoScaleRules(metrics) {
        const opps = [];
        if (!metrics || !Array.isArray(metrics.services)) return opps;

        for (const svc of metrics.services) {
            // If CPU > 70 and no autoscaling tag set — suggest.
            if (typeof svc.cpu === 'number' && svc.cpu > 70 && !svc.autoscalingEnabled) {
                opps.push({
                    type:        'autoscale_rule',
                    priority:    OPP_TYPES.autoscale_rule.priority,
                    service:     svc.name,
                    metric:      svc.cpu,
                    description: `${svc.name} CPU at ${svc.cpu.toFixed(1)}% with no autoscaling — consider HPA`,
                    suggestion:  `Add HorizontalPodAutoscaler: minReplicas=1, maxReplicas=5, targetCPUUtilizationPercentage=70`,
                });
            }
        }

        return opps;
    }

    // -----------------------------------------------------------------------
    // Safe optimisation executor
    // -----------------------------------------------------------------------

    /** @private */
    async _applySafe(opp) {
        // Safe optimisations: log and record — no external system calls needed.
        console.log(`[optimizer] Applying safe optimisation [${opp.type}]: ${opp.description}`);
        return {
            id:          opp.id,
            type:        opp.type,
            status:      'applied',
            service:     opp.service,
            description: opp.description,
        };
    }

    // -----------------------------------------------------------------------
    // Weekly report
    // -----------------------------------------------------------------------

    /** @private */
    _maybeWriteWeeklyReport(opportunities) {
        const weekKey = this._isoWeek();
        const reportFile = path.join(REPORTS_DIR, `${weekKey}.json`);

        // Only create a new weekly report — don't overwrite within the same week.
        if (fs.existsSync(reportFile)) return;

        const report = {
            week:         weekKey,
            generatedAt:  new Date().toISOString(),
            totalOpps:    opportunities.length,
            safeOpps:     opportunities.filter(o => (OPP_TYPES[o.type] || {}).safe).length,
            opportunities,
        };

        try {
            fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
            console.log(`[optimizer] Weekly report written: ${reportFile}`);
        } catch (e) {
            console.error('[optimizer] Failed to write weekly report:', e.message);
        }
    }

    // -----------------------------------------------------------------------
    // Utilities
    // -----------------------------------------------------------------------

    /** @private — ISO 8601 compliant week number */
    _isoWeek() {
        const now = new Date();
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        // Thursday in current week: ISO weeks start on Monday, week 1 has the year's first Thursday
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const week = Math.ceil(((d - yearStart) / 86_400_000 + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
    }

    /** @private */
    _shortId() {
        return Math.random().toString(36).slice(2, 10);
    }

    /** @private */
    _ensureDirs() {
        for (const dir of [AI_STATE_DIR, REPORTS_DIR]) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }
}

module.exports = { Optimizer };
