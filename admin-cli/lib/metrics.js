/**
 * Metrics Collection and Tracking Module (Phase D)
 *
 * Tracks performance, resource utilization, and operational metrics across runtimes.
 * Provides structured metrics collection, aggregation, and reporting.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Metrics Storage and Interfaces
// ---------------------------------------------------------------------------

/**
 * Metric record structure:
 * {
 *   timestamp: ISO8601 string,
 *   category: 'cpu' | 'memory' | 'disk' | 'network' | 'latency' | 'throughput' | 'errors',
 *   runtime: 'direct' | 'docker' | 'k8s',
 *   service: 'api-gateway' | 'user-service' | ...,
 *   value: number,
 *   unit: 'percent' | 'mb' | 'gb' | 'ms' | 'req/s' | 'error/s',
 *   tags: { [key]: value },  // optional: pod, container, instance, etc.
 * }
 */

class MetricsCollector {
    constructor(metricsDir) {
        this.metricsDir = metricsDir;
        this.ensureDir();
        this.metrics = this.load();
    }

    ensureDir() {
        if (!fs.existsSync(this.metricsDir)) {
            fs.mkdirSync(this.metricsDir, { recursive: true });
        }
    }

    load() {
        const metricsFile = path.join(this.metricsDir, 'metrics.json');
        if (fs.existsSync(metricsFile)) {
            try {
                const data = fs.readFileSync(metricsFile, 'utf8');
                return JSON.parse(data) || [];
            } catch (err) {
                return [];
            }
        }
        return [];
    }

    save() {
        const metricsFile = path.join(this.metricsDir, 'metrics.json');
        fs.writeFileSync(metricsFile, JSON.stringify(this.metrics, null, 2), 'utf8');
    }

    record(category, runtime, service, value, unit, tags = {}) {
        const metric = {
            timestamp: new Date().toISOString(),
            category,
            runtime,
            service,
            value,
            unit,
            tags,
        };
        this.metrics.push(metric);
        // Keep last 10000 records to prevent unbounded growth
        if (this.metrics.length > 10000) {
            this.metrics = this.metrics.slice(-10000);
        }
        this.save();
        return metric;
    }

    /**
     * Query metrics by filters
     * @param {Object} filters - { category?, runtime?, service?, since?, until? }
     * @returns {Array} matching metrics
     */
    query(filters = {}) {
        let results = this.metrics;

        if (filters.category) {
            results = results.filter(m => m.category === filters.category);
        }
        if (filters.runtime) {
            results = results.filter(m => m.runtime === filters.runtime);
        }
        if (filters.service) {
            results = results.filter(m => m.service === filters.service);
        }
        if (filters.since) {
            const sinceDate = new Date(filters.since);
            results = results.filter(m => new Date(m.timestamp) >= sinceDate);
        }
        if (filters.until) {
            const untilDate = new Date(filters.until);
            results = results.filter(m => new Date(m.timestamp) <= untilDate);
        }

        return results;
    }

    /**
     * Calculate aggregated statistics
     * @param {Object} filters - query filters
     * @returns {Object} statistics { min, max, avg, p50, p95, p99 }
     */
    aggregate(filters = {}) {
        const metrics = this.query(filters);
        if (metrics.length === 0) {
            return { min: null, max: null, avg: null, p50: null, p95: null, p99: null };
        }

        const values = metrics.map(m => m.value).sort((a, b) => a - b);
        const min = values[0];
        const max = values[values.length - 1];
        const avg = values.reduce((a, b) => a + b, 0) / values.length;

        const percentile = (p) => {
            const idx = Math.ceil((p / 100) * values.length) - 1;
            return values[Math.max(0, idx)];
        };

        return {
            min,
            max,
            avg: parseFloat(avg.toFixed(2)),
            p50: percentile(50),
            p95: percentile(95),
            p99: percentile(99),
            count: values.length,
            unit: metrics[0].unit,
        };
    }

    /**
     * Health check: identify anomalies or threshold violations
     * @param {Object} thresholds - { category: maxValue } e.g. { cpu: 80, memory: 90 }
     * @returns {Array} anomalies
     */
    detectAnomalies(thresholds = {}) {
        const anomalies = [];
        const recentMetrics = this.metrics.slice(-1000); // last 1000 records

        for (const metric of recentMetrics) {
            const threshold = thresholds[metric.category];
            if (threshold !== undefined && metric.value > threshold) {
                anomalies.push({
                    timestamp: metric.timestamp,
                    category: metric.category,
                    service: metric.service,
                    value: metric.value,
                    threshold,
                    severity: metric.value > threshold * 1.5 ? 'high' : 'medium',
                });
            }
        }

        return anomalies;
    }
}

// ---------------------------------------------------------------------------
// Default Thresholds for Health Checks
// ---------------------------------------------------------------------------

const DEFAULT_THRESHOLDS = {
    cpu: 80,           // percent
    memory: 85,        // percent
    disk: 90,          // percent
    latency: 1000,     // ms
    errorRate: 5,      // percent
};

// ---------------------------------------------------------------------------
// Runtime-Specific Metric Collectors
// ---------------------------------------------------------------------------

/**
 * Collect metrics from Docker Compose environment
 */
function collectDockerMetrics(service) {
    // Placeholder: would call docker stats, docker exec, etc.
    return {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        networkin: Math.random() * 1000,
        networkout: Math.random() * 1000,
    };
}

/**
 * Collect metrics from Kubernetes environment
 */
function collectK8sMetrics(service, namespace) {
    // Placeholder: would call kubectl top pods, kubectl metrics, etc.
    return {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        pods: Math.random() * 50,
        restarts: Math.random() * 10,
    };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    MetricsCollector,
    collectDockerMetrics,
    collectK8sMetrics,
    DEFAULT_THRESHOLDS,
};
