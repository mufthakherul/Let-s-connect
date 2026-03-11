'use strict';
/**
 * opentelemetry.js — OpenTelemetry-compatible tracing for admin actions
 *
 * Features:
 *  - Distributed trace/span management with in-memory ring buffer
 *  - NDJSON persistence for spans
 *  - OTLP export (fire-and-forget) to configurable endpoint
 *  - Span grouping, filtering, and statistics
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

class AdminTracer {
    constructor(storeDir, options = {}) {
        this.storeDir = storeDir;
        this.serviceName = options.serviceName || 'milonexa-admin';
        this.maxBufferSize = options.maxBufferSize || 1000;
        this.otlpEndpoint = options.otlpEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || null;
        this.tracesDir = path.join(storeDir, 'traces');
        this.tracesFile = path.join(this.tracesDir, 'traces.ndjson');
        this._buffer = [];
        this._ensureDir();
    }

    _ensureDir() {
        if (!fs.existsSync(this.storeDir)) {
            fs.mkdirSync(this.storeDir, { recursive: true });
        }
        if (!fs.existsSync(this.tracesDir)) {
            fs.mkdirSync(this.tracesDir, { recursive: true });
        }
    }

    _readJSON(file, defaultVal) {
        if (!fs.existsSync(file)) return defaultVal;
        try {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (_) {
            return defaultVal;
        }
    }

    _writeJSON(file, data) {
        this._ensureDir();
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    }

    _generateId() {
        return crypto.randomBytes(8).toString('hex');
    }

    _persistSpan(span) {
        this._ensureDir();
        const line = JSON.stringify(span) + '\n';
        fs.appendFileSync(this.tracesFile, line, 'utf8');

        this._buffer.push(span);
        if (this._buffer.length > this.maxBufferSize) {
            this._buffer = this._buffer.slice(this._buffer.length - this.maxBufferSize);
        }
    }

    startSpan(name, attributes = {}, parentSpanId = null) {
        let traceId;
        if (parentSpanId) {
            const parent = this._buffer.find(s => s.spanId === parentSpanId);
            traceId = parent ? parent.traceId : this._generateId();
        } else {
            traceId = this._generateId();
        }

        const span = {
            traceId,
            spanId: this._generateId(),
            parentSpanId,
            name,
            attributes: Object.assign({}, attributes),
            startTime: Date.now(),
            endTime: null,
            status: 'in_progress',
            events: [],
            service: this.serviceName,
        };

        const self = this;

        span.end = (status = 'ok') => {
            span.endTime = Date.now();
            span.status = status;
            self._persistSpan(span);
            self.exportOTLP(span.traceId);
        };

        span.addEvent = (evtName, attrs = {}) => {
            span.events.push({ name: evtName, attributes: attrs, timestamp: Date.now() });
        };

        span.setAttributes = (attrs) => {
            Object.assign(span.attributes, attrs);
        };

        return span;
    }

    _readSpansFromFile() {
        if (!fs.existsSync(this.tracesFile)) return [];
        try {
            return fs.readFileSync(this.tracesFile, 'utf8')
                .split('\n')
                .filter(l => l.trim())
                .map(l => JSON.parse(l));
        } catch (_) {
            return [];
        }
    }

    getTraces(limit = 100, filter = {}) {
        const fileSpans = this._readSpansFromFile();
        const bufferIds = new Set(this._buffer.map(s => s.spanId));
        const all = [...this._buffer, ...fileSpans.filter(s => !bufferIds.has(s.spanId))];

        const grouped = {};
        for (const span of all) {
            if (!grouped[span.traceId]) grouped[span.traceId] = [];
            grouped[span.traceId].push(span);
        }

        let traces = Object.entries(grouped).map(([traceId, spans]) => {
            const sorted = spans.slice().sort((a, b) => a.startTime - b.startTime);
            const root = sorted.find(s => !s.parentSpanId) || sorted[0];
            const endTimes = spans.map(s => s.endTime).filter(Boolean);
            return {
                traceId,
                spans: sorted,
                startTime: sorted[0] ? sorted[0].startTime : null,
                endTime: endTimes.length ? Math.max(...endTimes) : null,
                status: spans.some(s => s.status === 'error') ? 'error' : 'ok',
                name: root ? root.name : '',
                duration: (sorted[0] && endTimes.length)
                    ? Math.max(...endTimes) - sorted[0].startTime
                    : null,
            };
        });

        if (filter.status) traces = traces.filter(t => t.status === filter.status);
        if (filter.name) traces = traces.filter(t => t.name === filter.name);

        return traces.slice(0, limit);
    }

    getSpans(filter = {}) {
        let spans = this._buffer.slice();

        if (filter.name) spans = spans.filter(s => s.name === filter.name);
        if (filter.status) spans = spans.filter(s => s.status === filter.status);
        if (filter.traceId) spans = spans.filter(s => s.traceId === filter.traceId);
        if (filter.dateFrom) spans = spans.filter(s => s.startTime >= new Date(filter.dateFrom).getTime());
        if (filter.dateTo) spans = spans.filter(s => s.startTime <= new Date(filter.dateTo).getTime());

        return spans;
    }

    getStats() {
        const spans = this._buffer;
        const completed = spans.filter(s => s.endTime !== null);
        const errors = completed.filter(s => s.status === 'error');
        const traceIds = new Set(spans.map(s => s.traceId));
        const avgDurationMs = completed.length
            ? completed.reduce((sum, s) => sum + (s.endTime - s.startTime), 0) / completed.length
            : 0;

        const opCounts = {};
        for (const s of spans) {
            opCounts[s.name] = (opCounts[s.name] || 0) + 1;
        }
        const topOperations = Object.entries(opCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        return {
            totalSpans: spans.length,
            totalTraces: traceIds.size,
            errorRate: completed.length ? errors.length / completed.length : 0,
            avgDurationMs: Math.round(avgDurationMs),
            topOperations,
        };
    }

    exportOTLP(traceId) {
        if (!this.otlpEndpoint) return;

        const spans = this._buffer.filter(s => s.traceId === traceId);
        if (!spans.length) return;

        const payload = JSON.stringify({
            resourceSpans: [{
                resource: { attributes: [{ key: 'service.name', value: { stringValue: this.serviceName } }] },
                scopeSpans: [{ spans: spans.map(s => ({
                    traceId: s.traceId,
                    spanId: s.spanId,
                    parentSpanId: s.parentSpanId,
                    name: s.name,
                    startTimeUnixNano: String(s.startTime * 1_000_000),
                    endTimeUnixNano: s.endTime ? String(s.endTime * 1_000_000) : null,
                    status: { code: s.status === 'error' ? 2 : 1 },
                    attributes: Object.entries(s.attributes || {}).map(([k, v]) => ({
                        key: k, value: { stringValue: String(v) },
                    })),
                })) }],
            }],
        });

        try {
            const url = new URL(this.otlpEndpoint);
            const mod = url.protocol === 'https:' ? https : http;
            const req = mod.request({
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname || '/v1/traces',
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
            }, () => {});
            req.on('error', () => {});
            req.write(payload);
            req.end();
        } catch (_) {}
    }
}

module.exports = { AdminTracer };
