/**
 * SLA Tracking & Breach Prediction Module (Phase E)
 *
 * Tracks service-level agreements, calculates current SLO compliance,
 * and uses linear regression over rolling windows to predict future SLA breaches.
 *
 * SLA config stored in .admin-cli/sla/config.json
 * SLA measurements in .admin-cli/sla/measurements.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// SLAManager
// ---------------------------------------------------------------------------

class SLAManager {
    constructor(slaDir) {
        this.slaDir = slaDir;
        this.configFile = path.join(slaDir, 'config.json');
        this.measurementsFile = path.join(slaDir, 'measurements.json');
        this.ensureDir();
        this.slos = this.loadConfig();
        this.measurements = this.loadMeasurements();
    }

    ensureDir() {
        if (!fs.existsSync(this.slaDir)) {
            fs.mkdirSync(this.slaDir, { recursive: true });
        }
    }

    loadConfig() {
        if (fs.existsSync(this.configFile)) {
            try { return JSON.parse(fs.readFileSync(this.configFile, 'utf8')) || []; } catch (_) { return []; }
        }
        return this._defaultSLOs();
    }

    loadMeasurements() {
        if (fs.existsSync(this.measurementsFile)) {
            try { return JSON.parse(fs.readFileSync(this.measurementsFile, 'utf8')) || []; } catch (_) { return []; }
        }
        return [];
    }

    saveConfig() {
        fs.writeFileSync(this.configFile, JSON.stringify(this.slos, null, 2), 'utf8');
    }

    saveMeasurements() {
        // Keep last 10k measurements
        const trimmed = this.measurements.slice(-10000);
        fs.writeFileSync(this.measurementsFile, JSON.stringify(trimmed, null, 2), 'utf8');
    }

    _defaultSLOs() {
        const now = new Date().toISOString();
        return [
            {
                id: 'slo-api-uptime',
                service: 'api-gateway',
                name: 'API Uptime',
                type: 'availability',
                target: 99.9,  // 99.9%
                window: '30d',
                unit: 'percent',
                description: 'API Gateway uptime over rolling 30-day window',
                enabled: true,
                createdAt: now,
            },
            {
                id: 'slo-api-latency',
                service: 'api-gateway',
                name: 'API p99 Latency',
                type: 'latency',
                target: 500,   // 500ms
                window: '7d',
                unit: 'ms',
                description: 'API Gateway p99 response latency under 500ms',
                enabled: true,
                createdAt: now,
            },
            {
                id: 'slo-error-rate',
                service: 'api-gateway',
                name: 'Error Rate',
                type: 'error_rate',
                target: 1.0,   // <1% error rate
                window: '24h',
                unit: 'percent',
                description: 'Less than 1% error rate over 24h rolling window',
                enabled: true,
                createdAt: now,
            },
            {
                id: 'slo-user-auth',
                service: 'user-service',
                name: 'Auth Success Rate',
                type: 'availability',
                target: 99.5,
                window: '7d',
                unit: 'percent',
                description: 'User authentication success rate',
                enabled: true,
                createdAt: now,
            },
        ];
    }

    /**
     * Add a new SLO definition.
     */
    addSLO(cfg) {
        const slo = {
            id: `slo-${Date.now().toString(36)}`,
            service: cfg.service || 'unknown',
            name: cfg.name || 'Unnamed SLO',
            type: cfg.type || 'availability',
            target: parseFloat(cfg.target) || 99.9,
            window: cfg.window || '30d',
            unit: cfg.unit || 'percent',
            description: cfg.description || '',
            enabled: true,
            createdAt: new Date().toISOString(),
        };
        this.slos.push(slo);
        this.saveConfig();
        return slo;
    }

    /**
     * Record a measurement for an SLO.
     * @param {string} sloId  SLO ID
     * @param {number} value  Measured value
     * @param {object} meta   Optional metadata
     */
    record(sloId, value, meta = {}) {
        const slo = this.slos.find(s => s.id === sloId);
        if (!slo) throw new Error(`SLO not found: ${sloId}`);

        const m = {
            sloId,
            service: slo.service,
            value,
            ts: new Date().toISOString(),
            meta,
        };
        this.measurements.push(m);
        this.saveMeasurements();
        return m;
    }

    /**
     * Get measurements for an SLO within the window.
     */
    _getMeasurements(sloId, windowMs) {
        const cutoff = Date.now() - windowMs;
        return this.measurements
            .filter(m => m.sloId === sloId && new Date(m.ts).getTime() >= cutoff)
            .sort((a, b) => new Date(a.ts) - new Date(b.ts));
    }

    /**
     * Parse window string to milliseconds.
     */
    _parseWindow(w) {
        const unit = w.slice(-1);
        const n = parseInt(w);
        const map = { h: 3600000, d: 86400000, w: 604800000 };
        return (map[unit] || 86400000) * n;
    }

    /**
     * Calculate SLO compliance for a single SLO.
     */
    _calcCompliance(slo) {
        const windowMs = this._parseWindow(slo.window);
        const measurements = this._getMeasurements(slo.id, windowMs);

        if (measurements.length === 0) {
            return {
                slo,
                compliance: null,
                current: null,
                measurements: 0,
                status: 'no_data',
                breachRisk: null,
            };
        }

        const values = measurements.map(m => m.value);
        const current = values[values.length - 1];
        const avg = values.reduce((a, b) => a + b, 0) / values.length;

        let compliance;
        let status;

        if (slo.type === 'availability') {
            // Higher is better
            compliance = avg;
            status = compliance >= slo.target ? 'ok' : compliance >= slo.target * 0.99 ? 'at_risk' : 'breached';
        } else if (slo.type === 'error_rate') {
            // Lower is better
            compliance = 100 - avg; // Convert to success rate
            status = avg <= slo.target ? 'ok' : avg <= slo.target * 2 ? 'at_risk' : 'breached';
        } else if (slo.type === 'latency') {
            // Lower is better
            compliance = Math.max(0, 100 - ((avg / slo.target - 1) * 100));
            status = avg <= slo.target ? 'ok' : avg <= slo.target * 1.5 ? 'at_risk' : 'breached';
        } else {
            compliance = avg;
            status = compliance >= slo.target ? 'ok' : 'at_risk';
        }

        // Predict breach using linear trend
        const breachRisk = this._predictBreach(slo, measurements);

        return {
            slo,
            compliance: Math.round(compliance * 100) / 100,
            current: Math.round(current * 100) / 100,
            avg: Math.round(avg * 100) / 100,
            measurements: measurements.length,
            status,
            breachRisk,
        };
    }

    /**
     * Linear regression breach prediction.
     * Returns { risk: 'low'|'medium'|'high', hoursUntilBreach: number|null, trend: 'improving'|'stable'|'degrading' }
     */
    _predictBreach(slo, measurements) {
        if (measurements.length < 3) return { risk: 'unknown', trend: 'insufficient_data' };

        // Use last 20 points for trend
        const pts = measurements.slice(-20);
        const n = pts.length;
        const xs = pts.map((_, i) => i);
        const ys = pts.map(m => m.value);

        // Linear regression
        const sumX = xs.reduce((a, b) => a + b, 0);
        const sumY = ys.reduce((a, b) => a + b, 0);
        const sumXY = xs.reduce((a, i) => a + i * ys[i], 0);
        const sumX2 = xs.reduce((a, i) => a + i * i, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const avgTimeDiffMs = pts.length > 1
            ? (new Date(pts[pts.length - 1].ts) - new Date(pts[0].ts)) / (pts.length - 1)
            : 3600000;

        const MAX_BREACH_HOURS = 720; // Cap predictions at 30 days to avoid misleading values

        let trend, risk, hoursUntilBreach = null;

        if (slo.type === 'availability') {
            trend = slope > 0.01 ? 'improving' : slope < -0.01 ? 'degrading' : 'stable';
            if (slope < 0 && intercept > slo.target) {
                const stepsUntil = (slo.target - intercept) / slope;
                const hrs = Math.round((stepsUntil * avgTimeDiffMs) / 3600000);
                hoursUntilBreach = hrs > 0 && hrs <= MAX_BREACH_HOURS ? hrs : null;
            }
            risk = hoursUntilBreach !== null && hoursUntilBreach < 24 ? 'high'
                : hoursUntilBreach !== null && hoursUntilBreach < 72 ? 'medium'
                : trend === 'degrading' ? 'low' : 'low';
        } else if (slo.type === 'error_rate' || slo.type === 'latency') {
            trend = slope < -0.01 ? 'improving' : slope > 0.01 ? 'degrading' : 'stable';
            if (slope > 0 && intercept < slo.target) {
                const stepsUntil = (slo.target - intercept) / slope;
                const hrs = Math.round((stepsUntil * avgTimeDiffMs) / 3600000);
                hoursUntilBreach = hrs > 0 && hrs <= MAX_BREACH_HOURS ? hrs : null;
            }
            risk = hoursUntilBreach !== null && hoursUntilBreach < 24 ? 'high'
                : hoursUntilBreach !== null && hoursUntilBreach < 72 ? 'medium'
                : trend === 'degrading' ? 'low' : 'low';
        } else {
            trend = 'stable'; risk = 'low';
        }

        return { risk, trend, hoursUntilBreach, slope: Math.round(slope * 10000) / 10000 };
    }

    /**
     * Get status for all SLOs.
     */
    getStatus() {
        return this.slos.filter(s => s.enabled).map(slo => this._calcCompliance(slo));
    }

    /**
     * Get summary stats.
     */
    getSummary() {
        const statuses = this.getStatus();
        return {
            total: statuses.length,
            ok: statuses.filter(s => s.status === 'ok').length,
            atRisk: statuses.filter(s => s.status === 'at_risk').length,
            breached: statuses.filter(s => s.status === 'breached').length,
            noData: statuses.filter(s => s.status === 'no_data').length,
            highRisk: statuses.filter(s => s.breachRisk && s.breachRisk.risk === 'high').length,
        };
    }

    /**
     * Get predictions for SLOs at risk.
     */
    getPredictions() {
        return this.getStatus()
            .filter(s => s.breachRisk && s.breachRisk.risk !== 'low' && s.breachRisk.risk !== 'unknown')
            .sort((a, b) => {
                const order = { high: 0, medium: 1, low: 2, unknown: 3 };
                return (order[a.breachRisk.risk] || 3) - (order[b.breachRisk.risk] || 3);
            });
    }

    /**
     * Record synthetic measurement from current system state (for demo/testing).
     */
    recordSyntheticMeasurement(sloId) {
        const slo = this.slos.find(s => s.id === sloId);
        if (!slo) throw new Error(`SLO not found: ${sloId}`);

        let value;
        switch (slo.type) {
            case 'availability':
                value = 99.0 + Math.random() * 1.0;
                break;
            case 'error_rate':
                value = Math.random() * 2.0;
                break;
            case 'latency':
                value = 200 + Math.random() * 400;
                break;
            default:
                value = slo.target * (0.95 + Math.random() * 0.1);
        }
        return this.record(sloId, Math.round(value * 100) / 100, { source: 'synthetic' });
    }
}

module.exports = { SLAManager };
