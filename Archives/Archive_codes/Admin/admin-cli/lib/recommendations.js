/**
 * Recommendations and Intelligence Engine (Phase D)
 *
 * Provides intelligent recommendations for optimization, best practices,
 * and operational improvements based on system patterns and historical data.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Recommendation Engine
// ---------------------------------------------------------------------------

class RecommendationEngine {
    constructor(recommendationsDir) {
        this.recommendationsDir = recommendationsDir;
        this.historyFile = path.join(recommendationsDir, 'history.json');
        this.settingsFile = path.join(recommendationsDir, 'settings.json');
        this.ensureDir();
        this.history = this.loadHistory();
        this.settings = this.loadSettings();
    }

    ensureDir() {
        if (!fs.existsSync(this.recommendationsDir)) {
            fs.mkdirSync(this.recommendationsDir, { recursive: true });
        }
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

    loadSettings() {
        if (fs.existsSync(this.settingsFile)) {
            try {
                return JSON.parse(fs.readFileSync(this.settingsFile, 'utf8')) || {};
            } catch (err) {
                return {};
            }
        }
        return {
            enabled: true,
            minConfidence: 0.7,
            categories: ['performance', 'cost', 'reliability', 'security'],
        };
    }

    saveHistory() {
        fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2), 'utf8');
    }

    saveSettings() {
        fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2), 'utf8');
    }

    /**
     * Record a recommendation
     */
    recordRecommendation(category, title, description, impact, effort, confidence) {
        const rec = {
            id: Math.random().toString(36).substr(2, 9),
            category,
            title,
            description,
            impact,      // 'high' | 'medium' | 'low'
            effort,      // 'low' | 'medium' | 'high'
            confidence,  // 0.0-1.0
            score: this.calculateScore(impact, effort, confidence),
            timestamp: new Date().toISOString(),
            status: 'pending', // 'pending' | 'implemented' | 'dismissed'
        };
        this.history.push(rec);
        if (this.history.length > 5000) {
            this.history = this.history.slice(-5000);
        }
        this.saveHistory();
        return rec;
    }

    /**
     * Calculate recommendation score for prioritization
     */
    calculateScore(impact, effort, confidence) {
        const impactWeight = { high: 3, medium: 2, low: 1 };
        const effortWeight = { low: 3, medium: 2, high: 1 };
        const impactVal = impactWeight[impact] || 1;
        const effortVal = effortWeight[effort] || 1;
        return parseFloat(((impactVal * effortVal * confidence) / 9).toFixed(2));
    }

    /**
     * Generate recommendations from metrics and patterns
     */
    generateRecommendations(context = {}) {
        const recommendations = [];

        // Performance recommendations
        if (context.metrics) {
            const cpuRecs = this.analyzeResourceUsage(context.metrics.cpu, 'CPU', 'performance');
            const memRecs = this.analyzeResourceUsage(context.metrics.memory, 'Memory', 'performance');
            recommendations.push(...cpuRecs, ...memRecs);
        }

        // Cost recommendations
        if (context.costs) {
            const costRecs = this.analyzeCostPatterns(context.costs);
            recommendations.push(...costRecs);
        }

        // Reliability recommendations
        if (context.incidents) {
            const reliabilityRecs = this.analyzeIncidentPatterns(context.incidents);
            recommendations.push(...reliabilityRecs);
        }

        // Best practice recommendations
        const bestPracticeRecs = this.getBestPracticeRecommendations();
        recommendations.push(...bestPracticeRecs);

        // Filter by confidence and category
        let filtered = recommendations;
        filtered = filtered.filter(r => r.confidence >= this.settings.minConfidence);
        if (this.settings.categories.length > 0) {
            filtered = filtered.filter(r => this.settings.categories.includes(r.category));
        }

        // Sort by score (highest first)
        filtered.sort((a, b) => b.score - a.score);

        return filtered;
    }

    /**
     * Analyze resource usage patterns
     */
    analyzeResourceUsage(metrics, resourceName, category) {
        if (!metrics || metrics.length === 0) return [];

        const values = metrics.map(m => m.value);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const max = Math.max(...values);
        const percentile95 = values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)];

        const recommendations = [];

        // Over-provisioned resource
        if (avg < max * 0.3) {
            recommendations.push({
                category,
                title: `Right-size ${resourceName} allocation`,
                description: `Current ${resourceName} usage is low (avg ${avg.toFixed(1)}%, peak ${max.toFixed(1)}%). Consider reducing allocation.`,
                impact: 'medium',
                effort: 'low',
                confidence: 0.85,
            });
        }

        // Under-provisioned resource
        if (max > 90) {
            recommendations.push({
                category,
                title: `Increase ${resourceName} limits`,
                description: `Peak ${resourceName} usage reached ${max.toFixed(1)}%. Risk of throttling detected. Increase limits.`,
                impact: 'high',
                effort: 'low',
                confidence: 0.9,
            });
        }

        // Volatile pattern
        const variance = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length);
        if (variance > avg * 0.5) {
            recommendations.push({
                category: 'reliability',
                title: `Implement ${resourceName} scaling policy`,
                description: `${resourceName} usage is volatile (variance: ${variance.toFixed(1)}%). Implement auto-scaling to smooth load.`,
                impact: 'high',
                effort: 'medium',
                confidence: 0.75,
            });
        }

        return recommendations;
    }

    /**
     * Analyze cost patterns for optimization
     */
    analyzeCostPatterns(costData) {
        const recommendations = [];

        // Over-spending on specific services
        if (costData.byService) {
            const services = Object.entries(costData.byService);
            const avgCost = services.reduce((sum, [_, cost]) => sum + cost, 0) / services.length;

            for (const [service, cost] of services) {
                if (cost > avgCost * 2) {
                    recommendations.push({
                        category: 'cost',
                        title: `Optimize ${service} resource allocation`,
                        description: `${service} costs are ${((cost / avgCost).toFixed(1))}x average. Review and right-size resources.`,
                        impact: 'high',
                        effort: 'medium',
                        confidence: 0.8,
                    });
                }
            }
        }

        // General optimization opportunities
        recommendations.push({
            category: 'cost',
            title: 'Consider reserved capacity',
            description: 'For stable, predictable workloads, reserved instances can save 30-40% on compute costs.',
            impact: 'high',
            effort: 'medium',
            confidence: 0.7,
        });

        return recommendations;
    }

    /**
     * Analyze incident patterns
     */
    analyzeIncidentPatterns(incidents) {
        const recommendations = [];

        if (!incidents || incidents.length === 0) {
            return recommendations;
        }

        const recentIncidents = incidents.filter(
            i => new Date(i.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );

        if (recentIncidents.length > 0) {
            recommendations.push({
                category: 'reliability',
                title: 'Review incident trends',
                description: `${recentIncidents.length} incidents detected this week. Review patterns and implement preventive measures.`,
                impact: 'high',
                effort: 'medium',
                confidence: 0.85,
            });
        }

        return recommendations;
    }

    /**
     * Best practice recommendations
     */
    getBestPracticeRecommendations() {
        return [
            {
                category: 'reliability',
                title: 'Implement circuit breaker pattern',
                description: 'Add circuit breakers to prevent cascading failures in microservices.',
                impact: 'high',
                effort: 'medium',
                confidence: 0.8,
            },
            {
                category: 'security',
                title: 'Enable network policies',
                description: 'Implement Kubernetes network policies to control inter-pod traffic.',
                impact: 'high',
                effort: 'medium',
                confidence: 0.85,
            },
            {
                category: 'performance',
                title: 'Implement caching strategy',
                description: 'Add Redis or distributed caching to reduce database load.',
                impact: 'medium',
                effort: 'medium',
                confidence: 0.75,
            },
            {
                category: 'cost',
                title: 'Use cluster autoscaler',
                description: 'Enable Kubernetes cluster autoscaler to optimize node count.',
                impact: 'medium',
                effort: 'low',
                confidence: 0.8,
            },
        ];
    }

    /**
     * Get top recommendations
     */
    getTopRecommendations(limit = 10) {
        return this.history
            .filter(r => r.status === 'pending')
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Dismiss recommendation
     */
    dismissRecommendation(recId) {
        const rec = this.history.find(r => r.id === recId);
        if (rec) {
            rec.status = 'dismissed';
            rec.dismissedAt = new Date().toISOString();
            this.saveHistory();
        }
        return rec;
    }

    /**
     * Mark recommendation as implemented
     */
    implementRecommendation(recId) {
        const rec = this.history.find(r => r.id === recId);
        if (rec) {
            rec.status = 'implemented';
            rec.implementedAt = new Date().toISOString();
            this.saveHistory();
        }
        return rec;
    }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    RecommendationEngine,
};
