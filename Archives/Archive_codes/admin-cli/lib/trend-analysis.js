/**
 * Trend Analysis & Advanced Visualization Module (Phase E)
 *
 * Analyzes metric time-series to detect trends, compute forecasts,
 * and render ASCII sparkline/bar charts in the terminal.
 *
 * Visualization is purely ASCII-based — no external dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// ASCII chart renderers
// ---------------------------------------------------------------------------

/**
 * Render a sparkline for an array of numbers.
 * Uses 8 block characters for fine granularity.
 * @param {number[]} values
 * @param {number} width  Number of characters wide
 * @returns {string}
 */
function sparkline(values, width = 40) {
    if (!values || values.length === 0) return '(no data)';
    const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const pts = width < values.length
        ? downsample(values, width)
        : values;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = max - min || 1;
    return pts.map(v => blocks[Math.min(7, Math.floor((v - min) / range * 7))]).join('');
}

/**
 * Downsample array to target length by averaging buckets.
 */
function downsample(values, targetLen) {
    if (values.length <= targetLen) return values;
    const bucketSize = values.length / targetLen;
    const result = [];
    for (let i = 0; i < targetLen; i++) {
        const start = Math.floor(i * bucketSize);
        const end = Math.floor((i + 1) * bucketSize);
        const bucket = values.slice(start, end);
        result.push(bucket.reduce((a, b) => a + b, 0) / bucket.length);
    }
    return result;
}

/**
 * Render a horizontal bar chart.
 * @param {Array<{label, value, max?}>} items
 * @param {number} barWidth  Width of bar area
 * @param {string} fillChar  Fill character
 * @returns {string[]}  Lines to print
 */
function barChart(items, barWidth = 30, fillChar = '█') {
    if (!items || items.length === 0) return ['(no data)'];
    const maxVal = Math.max(...items.map(i => i.value));
    const labelLen = Math.max(...items.map(i => String(i.label).length));
    return items.map(item => {
        const label = String(item.label).padStart(labelLen);
        const pct = maxVal > 0 ? item.value / maxVal : 0;
        const filled = Math.round(pct * barWidth);
        const bar = fillChar.repeat(filled) + '░'.repeat(barWidth - filled);
        const valStr = String(Math.round(item.value * 10) / 10).padStart(8);
        return `${label} │${bar}│ ${valStr}`;
    });
}

/**
 * Render an ASCII line chart.
 * @param {number[]} values
 * @param {object} opts { width, height, label, unit, min?, max? }
 * @returns {string[]}  Lines
 */
function lineChart(values, opts = {}) {
    const width = opts.width || 60;
    const height = opts.height || 8;
    const unit = opts.unit || '';

    if (!values || values.length === 0) return ['(no data)'];

    const pts = width < values.length ? downsample(values, width) : values;
    const minVal = opts.min !== undefined ? opts.min : Math.min(...pts);
    const maxVal = opts.max !== undefined ? opts.max : Math.max(...pts);
    const range = maxVal - minVal || 1;

    // Build grid
    const grid = Array.from({ length: height }, () => Array(pts.length).fill(' '));

    for (let x = 0; x < pts.length; x++) {
        const row = height - 1 - Math.floor(((pts[x] - minVal) / range) * (height - 1));
        const clampedRow = Math.max(0, Math.min(height - 1, row));
        grid[clampedRow][x] = '●';
        // Fill below for area effect
        for (let r = clampedRow + 1; r < height; r++) {
            if (grid[r][x] === ' ') grid[r][x] = '·';
        }
    }

    const lines = [];
    for (let r = 0; r < height; r++) {
        const yVal = maxVal - (r / (height - 1)) * range;
        const yLabel = String(Math.round(yVal * 10) / 10 + unit).padStart(8);
        lines.push(`${yLabel} │ ${grid[r].join('')}`);
    }
    lines.push(`         └${'─'.repeat(pts.length + 1)}`);
    lines.push(`           ${' '.repeat(Math.floor(pts.length / 2) - 3)}→ time`);

    return lines;
}

// ---------------------------------------------------------------------------
// TrendAnalyzer
// ---------------------------------------------------------------------------

class TrendAnalyzer {
    constructor(metricsDir) {
        this.metricsDir = metricsDir;
    }

    /**
     * Compute linear regression stats for a series.
     * @param {number[]} values
     * @returns {{ slope, intercept, r2, trend }}
     */
    linearRegression(values) {
        if (values.length < 2) return { slope: 0, intercept: values[0] || 0, r2: 0, trend: 'stable' };

        const n = values.length;
        const xs = values.map((_, i) => i);
        const sumX = xs.reduce((a, b) => a + b, 0);
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = xs.reduce((s, x, i) => s + x * values[i], 0);
        const sumX2 = xs.reduce((s, x) => s + x * x, 0);
        const sumY2 = values.reduce((s, y) => s + y * y, 0);

        const denom = n * sumX2 - sumX * sumX;
        const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
        const intercept = (sumY - slope * sumX) / n;

        // Pearson R²
        const yMean = sumY / n;
        const ss_tot = values.reduce((s, y) => s + (y - yMean) ** 2, 0);
        const ss_res = values.reduce((s, y, i) => s + (y - (slope * i + intercept)) ** 2, 0);
        const r2 = ss_tot > 0 ? 1 - ss_res / ss_tot : 0;

        const slopePct = Math.abs(slope / (yMean || 1)) * 100;
        const trend = slopePct < 1 ? 'stable'
            : slope > 0 ? 'increasing'
            : 'decreasing';

        return {
            slope: Math.round(slope * 10000) / 10000,
            intercept: Math.round(intercept * 100) / 100,
            r2: Math.round(r2 * 1000) / 1000,
            trend,
            slopePctPerPoint: Math.round(slopePct * 100) / 100,
        };
    }

    /**
     * Forecast future values using linear regression.
     * @param {number[]} values  Historical values
     * @param {number} steps     Number of steps to forecast
     * @returns {number[]}
     */
    forecast(values, steps = 5) {
        const { slope, intercept } = this.linearRegression(values);
        const n = values.length;
        return Array.from({ length: steps }, (_, i) => {
            const predicted = slope * (n + i) + intercept;
            return Math.round(predicted * 100) / 100;
        });
    }

    /**
     * Detect anomalies using Z-score method.
     * @param {number[]} values
     * @param {number} threshold  Z-score threshold (default: 2.5)
     * @returns {Array<{index, value, zscore}>}
     */
    detectAnomalies(values, threshold = 2.5) {
        if (values.length < 3) return [];
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length) || 1;
        return values
            .map((v, i) => ({ index: i, value: v, zscore: Math.abs((v - mean) / std) }))
            .filter(p => p.zscore >= threshold);
    }

    /**
     * Compute moving average.
     * @param {number[]} values
     * @param {number} window  Window size
     * @returns {number[]}
     */
    movingAverage(values, window = 5) {
        return values.map((_, i) => {
            const start = Math.max(0, i - window + 1);
            const slice = values.slice(start, i + 1);
            return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 100) / 100;
        });
    }

    /**
     * Compute percentiles.
     * @param {number[]} values
     * @param {number[]} percentiles  e.g. [50, 90, 95, 99]
     * @returns {object}
     */
    percentiles(values, pcts = [50, 75, 90, 95, 99]) {
        if (values.length === 0) return {};
        const sorted = [...values].sort((a, b) => a - b);
        const result = {};
        for (const p of pcts) {
            const idx = Math.ceil((p / 100) * sorted.length) - 1;
            result[`p${p}`] = sorted[Math.max(0, idx)];
        }
        return result;
    }

    /**
     * Full trend report for a set of values.
     * @param {string} name   Series name
     * @param {number[]} values
     * @param {string} unit
     * @returns {object}
     */
    analyze(name, values, unit = '') {
        if (!values || values.length === 0) {
            return { name, unit, status: 'no_data' };
        }

        const regression = this.linearRegression(values);
        const anomalies = this.detectAnomalies(values);
        const pcts = this.percentiles(values);
        const ma5 = this.movingAverage(values, 5);
        const forecastValues = this.forecast(values, 3);

        return {
            name,
            unit,
            count: values.length,
            current: values[values.length - 1],
            min: Math.min(...values),
            max: Math.max(...values),
            mean: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100,
            regression,
            percentiles: pcts,
            anomalies: anomalies.length,
            forecast: forecastValues,
            sparkline: sparkline(values, 40),
        };
    }
}

module.exports = { TrendAnalyzer, sparkline, barChart, lineChart, downsample };
