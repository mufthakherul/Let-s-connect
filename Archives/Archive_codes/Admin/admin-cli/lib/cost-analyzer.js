/**
 * Cost Analysis and Optimization Module (Phase D)
 *
 * Tracks resource costs, identifies optimization opportunities,
 * and provides cost forecasting and budgeting insights.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Cost Calculator
// ---------------------------------------------------------------------------

/**
 * Pricing tiers for different resource types
 */
const PRICING_TIERS = {
    compute: {
        cpu_per_hour: 0.10,                    // USD per vCPU-hour
        memory_per_gb_hour: 0.02,              // USD per GB-hour
    },
    storage: {
        persistent_volume_gb_month: 0.10,      // USD per GB-month
        object_storage_gb_month: 0.023,        // USD per GB-month
    },
    network: {
        egress_gb: 0.12,                       // USD per GB (egress)
        ingress_gb: 0.0,                       // Free ingress
        loadbalancer_hour: 0.025,              // USD per LB-hour
    },
};

class CostAnalyzer {
    constructor(costDir) {
        this.costDir = costDir;
        this.ensureDir();
        this.costRecords = this.loadCostRecords();
        this.budgets = this.loadBudgets();
    }

    ensureDir() {
        if (!fs.existsSync(this.costDir)) {
            fs.mkdirSync(this.costDir, { recursive: true });
        }
    }

    loadCostRecords() {
        const file = path.join(this.costDir, 'costs.json');
        if (fs.existsSync(file)) {
            try {
                return JSON.parse(fs.readFileSync(file, 'utf8')) || [];
            } catch (err) {
                return [];
            }
        }
        return [];
    }

    loadBudgets() {
        const file = path.join(this.costDir, 'budgets.json');
        if (fs.existsSync(file)) {
            try {
                return JSON.parse(fs.readFileSync(file, 'utf8')) || {};
            } catch (err) {
                return {};
            }
        }
        return this.createDefaultBudgets();
    }

    saveCostRecords() {
        const file = path.join(this.costDir, 'costs.json');
        fs.writeFileSync(file, JSON.stringify(this.costRecords, null, 2), 'utf8');
    }

    saveBudgets() {
        const file = path.join(this.costDir, 'budgets.json');
        fs.writeFileSync(file, JSON.stringify(this.budgets, null, 2), 'utf8');
    }

    /**
     * Default monthly budgets
     */
    createDefaultBudgets() {
        return {
            monthly_total: 5000,           // Total monthly budget
            compute: 3000,                 // Compute budget
            storage: 1000,                 // Storage budget
            network: 500,                  // Network budget
            alert_threshold: 0.8,          // Alert at 80% spent
        };
    }

    /**
     * Record a cost event
     */
    recordCost(service, resourceType, quantity, unit, cost) {
        const record = {
            timestamp: new Date().toISOString(),
            service,
            resourceType,
            quantity,
            unit,
            cost,
            costUSD: cost,
        };
        this.costRecords.push(record);
        if (this.costRecords.length > 50000) {
            this.costRecords = this.costRecords.slice(-50000);
        }
        this.saveCostRecords();
        return record;
    }

    /**
     * Calculate cost for a deployment configuration
     */
    calculateDeploymentCost(config) {
        let totalCost = 0;

        // Compute cost
        if (config.replicas && config.cpuRequest && config.memoryRequest) {
            const computeCost =
                config.replicas *
                (config.cpuRequest * PRICING_TIERS.compute.cpu_per_hour +
                    config.memoryRequest * PRICING_TIERS.compute.memory_per_gb_hour) *
                730; // hours per month
            totalCost += computeCost;
        }

        // Storage cost
        if (config.storageGB) {
            const storageCost = config.storageGB * PRICING_TIERS.storage.persistent_volume_gb_month;
            totalCost += storageCost;
        }

        // Network cost
        if (config.egressGB) {
            const networkCost = config.egressGB * PRICING_TIERS.network.egress_gb;
            totalCost += networkCost;
        }

        return parseFloat(totalCost.toFixed(2));
    }

    /**
     * Get cost summary for a period
     */
    getCostSummary(filters = {}) {
        let records = this.costRecords;

        if (filters.service) {
            records = records.filter(r => r.service === filters.service);
        }
        if (filters.since) {
            const sinceDate = new Date(filters.since);
            records = records.filter(r => new Date(r.timestamp) >= sinceDate);
        }

        const total = records.reduce((sum, r) => sum + r.costUSD, 0);
        const byService = {};
        const byType = {};

        for (const record of records) {
            byService[record.service] = (byService[record.service] || 0) + record.costUSD;
            byType[record.resourceType] = (byType[record.resourceType] || 0) + record.costUSD;
        }

        return {
            total: parseFloat(total.toFixed(2)),
            byService,
            byType,
            recordCount: records.length,
        };
    }

    /**
     * Identify cost optimization opportunities
     */
    identifyOptimizations() {
        const opportunities = [];

        // Identify over-provisioned services
        const byService = {};
        for (const record of this.costRecords) {
            byService[record.service] = (byService[record.service] || 0) + 1;
        }

        // Flag high-cost services
        const avgCost = Object.values(byService).reduce((a, b) => a + b, 0) / Object.keys(byService).length;
        for (const [service, count] of Object.entries(byService)) {
            if (count > avgCost * 2) {
                opportunities.push({
                    type: 'high-cost-service',
                    service,
                    recommendation: `Consider right-sizing resources for ${service}`,
                    priority: 'medium',
                });
            }
        }

        // Suggest reserved capacity for predictable workloads
        opportunities.push({
            type: 'reserved-capacity',
            recommendation: 'Consider reserved instances for baseline capacity',
            potential_savings: '30-40%',
            priority: 'low',
        });

        return opportunities;
    }

    /**
     * Check budget status
     */
    checkBudgetStatus() {
        const summary = this.getCostSummary({
            since: this.getMonthStart(),
        });

        const budgets = this.budgets;
        const usage = summary.total;
        const totalBudget = budgets.monthly_total;
        const percentUsed = (usage / totalBudget) * 100;
        const exceeded = usage > totalBudget;

        const status = {
            usage: parseFloat(usage.toFixed(2)),
            budget: totalBudget,
            percentUsed: parseFloat(percentUsed.toFixed(2)),
            exceeded,
            daysRemaining: 30 - new Date().getDate(),
            forecastedTotal: parseFloat(
                (usage / (new Date().getDate() / 30)).toFixed(2)
            ),
        };

        // Check category budgets
        for (const [category, categoryBudget] of Object.entries(budgets)) {
            if (category === 'monthly_total' || category === 'alert_threshold') continue;
            const categoryUsage = summary.byType[category] || 0;
            if (categoryUsage > categoryBudget) {
                status.categoryExceeded = status.categoryExceeded || [];
                status.categoryExceeded.push({
                    category,
                    usage: categoryUsage,
                    budget: categoryBudget,
                });
            }
        }

        return status;
    }

    /**
     * Set budget limits
     */
    setBudget(category, amount) {
        this.budgets[category] = amount;
        this.saveBudgets();
        return this.budgets;
    }

    /**
     * Get month start date
     */
    getMonthStart() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }
}

// ---------------------------------------------------------------------------
// Cost Forecasting
// ---------------------------------------------------------------------------

/**
 * Forecast future costs based on historical data
 */
function forecastCosts(costRecords, forecastMonths = 3) {
    if (costRecords.length < 2) {
        return { forecast: [], confidence: 'low' };
    }

    // Simple linear regression forecast
    const values = costRecords.map((r, i) => ({
        x: i,
        y: r.costUSD,
    }));

    const n = values.length;
    const sumX = values.reduce((a, v) => a + v.x, 0);
    const sumY = values.reduce((a, v) => a + v.y, 0);
    const sumXY = values.reduce((a, v) => a + v.x * v.y, 0);
    const sumX2 = values.reduce((a, v) => a + v.x * v.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecast = [];
    for (let month = 1; month <= forecastMonths; month++) {
        const predictedValue = slope * (n + month) + intercept;
        forecast.push({
            month,
            predicted: Math.max(0, parseFloat(predictedValue.toFixed(2))),
        });
    }

    return { forecast, confidence: 'medium', slope };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    CostAnalyzer,
    forecastCosts,
    PRICING_TIERS,
};
