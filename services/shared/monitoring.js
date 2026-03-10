/**
 * Monitoring and Metrics Utilities
 * Workstream I: Observability, Reliability & SRE Readiness
 *
 * Provides:
 * - Health checks (liveness/readiness)
 * - Prometheus-compatible metrics with standardized labels
 * - HTTP latency histograms for SLO alerting
 * - Distributed trace context propagation (traceparent)
 */

const os = require('os');
const process = require('process');
const crypto = require('crypto');

class HealthChecker {
    constructor(serviceName) {
        this.serviceName = serviceName;
        this.startTime = Date.now();
        this.checks = new Map();
        this.environment = process.env.ENVIRONMENT || process.env.NODE_ENV || 'unknown';

        // Prometheus histogram buckets in seconds
        this.durationBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10];

        // Metric state
        this.metrics = {
            requests: 0,
            errors: 0,
            totalResponseTime: 0,
            inflightRequests: 0,
            requestsByLabel: new Map(),
            durationByLabel: new Map()
        };
    }

    /**
     * Ensure a stable, low-cardinality route label value.
     *
     * Replaces UUID-like and numeric path segments with :id to avoid
     * exploding metric cardinality.
     */
    normalizeRoute(routePath) {
        if (!routePath || typeof routePath !== 'string') {
            return 'unknown';
        }

        let route = routePath;

        // Drop query string if present
        route = route.split('?')[0];

        // Replace UUID-like path segments
        route = route.replace(/\/[0-9a-fA-F-]{8,}(?=\/|$)/g, '/:id');

        // Replace numeric segments
        route = route.replace(/\/\d+(?=\/|$)/g, '/:id');

        // Bound route length to avoid oversized labels
        if (route.length > 180) {
            route = `${route.slice(0, 177)}...`;
        }

        return route || 'unknown';
    }

    escapeLabelValue(value) {
        return String(value)
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/"/g, '\\"');
    }

    statusClass(statusCode) {
        const code = Number(statusCode) || 0;
        const bucket = Math.floor(code / 100);
        if (bucket >= 1 && bucket <= 5) {
            return `${bucket}xx`;
        }
        return 'unknown';
    }

    makeMetricKey(labels) {
        return JSON.stringify(labels);
    }

    parseMetricKey(metricKey) {
        try {
            return JSON.parse(metricKey);
        } catch (_error) {
            return {};
        }
    }

    generateRequestId() {
        if (typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }

        // Fallback for older runtimes
        return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    }

    generateTraceId() {
        // 16-byte / 32-hex trace ID (W3C Trace Context)
        return crypto.randomBytes(16).toString('hex');
    }

    generateSpanId() {
        // 8-byte / 16-hex span ID (W3C Trace Context)
        return crypto.randomBytes(8).toString('hex');
    }

    parseTraceparent(traceparent) {
        if (!traceparent || typeof traceparent !== 'string') {
            return null;
        }

        const match = traceparent.match(/^([\da-f]{2})-([\da-f]{32})-([\da-f]{16})-([\da-f]{2})$/i);
        if (!match) {
            return null;
        }

        const [, version, traceId, spanId, traceFlags] = match;
        return {
            version: version.toLowerCase(),
            traceId: traceId.toLowerCase(),
            spanId: spanId.toLowerCase(),
            traceFlags: traceFlags.toLowerCase()
        };
    }

    ensureTraceContext(req, res) {
        if (req.traceContext && req.traceContext.traceparent) {
            return req.traceContext;
        }

        const incomingTraceparent = req.headers.traceparent;
        const parsed = this.parseTraceparent(incomingTraceparent);

        const traceId = parsed?.traceId || this.generateTraceId();
        const parentSpanId = parsed?.spanId || null;
        const traceFlags = parsed?.traceFlags || '01';
        const spanId = this.generateSpanId();
        const traceparent = `00-${traceId}-${spanId}-${traceFlags}`;

        const requestId = req.id || req.headers['x-request-id'] || req.headers['x-correlation-id'] || this.generateRequestId();
        req.id = requestId;

        req.traceContext = {
            traceId,
            spanId,
            parentSpanId,
            traceFlags,
            traceparent,
            requestId
        };

        // Propagation headers for downstream services
        req.headers['x-request-id'] = requestId;
        req.headers['x-correlation-id'] = requestId;
        req.headers.traceparent = traceparent;

        // Echo context to response for client-side correlation
        if (res && typeof res.setHeader === 'function') {
            res.setHeader('X-Request-Id', requestId);
            res.setHeader('X-Correlation-Id', requestId);
            res.setHeader('traceparent', traceparent);

            if (req.headers.tracestate) {
                res.setHeader('tracestate', req.headers.tracestate);
            }
        }

        return req.traceContext;
    }

    /**
     * Register a health check function
     * @param {string} name - Name of the check (e.g., 'database', 'redis', 's3')
     * @param {Function} checkFn - Async function that returns { healthy: boolean, message?: string, latency?: number }
     */
    registerCheck(name, checkFn) {
        this.checks.set(name, checkFn);
    }

    tracingMiddleware() {
        return (req, res, next) => {
            this.ensureTraceContext(req, res);
            next();
        };
    }

    /**
     * Run all health checks (in parallel for better performance)
     * @returns {Object} Health status with all check results
     */
    async runChecks() {
        const results = {
            service: this.serviceName,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            checks: {},
            system: this.getSystemInfo()
        };

        // Run all registered checks in parallel
        const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
            try {
                const startTime = Date.now();
                const result = await Promise.race([
                    checkFn(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Check timeout')), 3000)
                    )
                ]);
                const latency = Date.now() - startTime;

                return {
                    name,
                    check: {
                        healthy: result.healthy !== false,
                        message: result.message || 'OK',
                        latency: result.latency || latency
                    }
                };
            } catch (error) {
                return {
                    name,
                    check: {
                        healthy: false,
                        message: error.message,
                        latency: 3000
                    }
                };
            }
        });

        // Wait for all checks to complete
        const checkResults = await Promise.all(checkPromises);
        
        // Aggregate results
        for (const { name, check } of checkResults) {
            results.checks[name] = check;
            if (!check.healthy) {
                results.status = 'unhealthy';
            }
        }

        return results;
    }

    /**
     * Get basic health status (for liveness probes)
     */
    getBasicHealth() {
        return {
            service: this.serviceName,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this.startTime) / 1000)
        };
    }

    /**
     * Get system information
     */
    getSystemInfo() {
        const cpus = os.cpus();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        return {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            cpus: cpus.length,
            cpuUsage: process.cpuUsage(),
            memory: {
                total: totalMem,
                free: freeMem,
                used: usedMem,
                usagePercent: Math.round((usedMem / totalMem) * 100),
                processHeap: process.memoryUsage().heapUsed,
                processRss: process.memoryUsage().rss
            },
            loadAverage: os.loadavg()
        };
    }

    /**
     * Record request metrics
     */
    recordRequest(responseTime, error = false, metadata = {}) {
        this.metrics.requests++;
        if (error) this.metrics.errors++;
        this.metrics.totalResponseTime += responseTime;

        const method = (metadata.method || 'UNKNOWN').toUpperCase();
        const route = this.normalizeRoute(metadata.route || metadata.path || 'unknown');
        const statusCode = Number(metadata.statusCode) || (error ? 500 : 200);
        const status = String(statusCode);
        const statusClass = this.statusClass(statusCode);

        const labelSet = {
            service: this.serviceName,
            environment: this.environment,
            method,
            route,
            status,
            status_class: statusClass
        };

        // Counter metric by standardized labels
        const counterKey = this.makeMetricKey(labelSet);
        const counterValue = this.metrics.requestsByLabel.get(counterKey) || 0;
        this.metrics.requestsByLabel.set(counterKey, counterValue + 1);

        // Histogram metric by same label set
        const durationSeconds = Number(responseTime) / 1000;
        let histogramEntry = this.metrics.durationByLabel.get(counterKey);
        if (!histogramEntry) {
            histogramEntry = {
                bucketCounts: this.durationBuckets.map(() => 0),
                count: 0,
                sum: 0
            };
        }

        histogramEntry.count += 1;
        histogramEntry.sum += durationSeconds;

        for (let i = 0; i < this.durationBuckets.length; i++) {
            if (durationSeconds <= this.durationBuckets[i]) {
                histogramEntry.bucketCounts[i] += 1;
            }
        }

        this.metrics.durationByLabel.set(counterKey, histogramEntry);
    }

    /**
     * Get metrics in Prometheus format
     */
    getPrometheusMetrics() {
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        const avgResponseTime = this.metrics.requests > 0 
            ? (this.metrics.totalResponseTime / this.metrics.requests).toFixed(2)
            : 0;
        const errorRate = this.metrics.requests > 0
            ? ((this.metrics.errors / this.metrics.requests) * 100).toFixed(2)
            : 0;

        const mem = process.memoryUsage();
        const systemInfo = this.getSystemInfo();

        let metricsOutput = `# HELP service_uptime_seconds Service uptime in seconds
# TYPE service_uptime_seconds gauge
service_uptime_seconds{service="${this.serviceName}"} ${uptime}

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter

    # HELP http_requests_service_total Total HTTP requests (service-level aggregate)
    # TYPE http_requests_service_total counter
    http_requests_service_total{service="${this.serviceName}",environment="${this.environment}"} ${this.metrics.requests}

# HELP http_requests_errors_total Total number of HTTP request errors
# TYPE http_requests_errors_total counter
http_requests_errors_total{service="${this.serviceName}"} ${this.metrics.errors}

    # HELP http_requests_in_flight Current number of in-flight HTTP requests
    # TYPE http_requests_in_flight gauge
    http_requests_in_flight{service="${this.serviceName}",environment="${this.environment}"} ${this.metrics.inflightRequests}

# HELP http_request_duration_avg_ms Average HTTP request duration in milliseconds
# TYPE http_request_duration_avg_ms gauge
http_request_duration_avg_ms{service="${this.serviceName}"} ${avgResponseTime}

# HELP http_request_error_rate_percent HTTP request error rate percentage
# TYPE http_request_error_rate_percent gauge
http_request_error_rate_percent{service="${this.serviceName}"} ${errorRate}

# HELP process_memory_heap_bytes Process heap memory in bytes
# TYPE process_memory_heap_bytes gauge
process_memory_heap_bytes{service="${this.serviceName}"} ${mem.heapUsed}

# HELP process_memory_rss_bytes Process RSS memory in bytes
# TYPE process_memory_rss_bytes gauge
process_memory_rss_bytes{service="${this.serviceName}"} ${mem.rss}

# HELP system_memory_usage_percent System memory usage percentage
# TYPE system_memory_usage_percent gauge
system_memory_usage_percent{service="${this.serviceName}"} ${systemInfo.memory.usagePercent}

# HELP system_cpu_count Number of CPUs
# TYPE system_cpu_count gauge
system_cpu_count{service="${this.serviceName}"} ${systemInfo.cpus}

# HELP system_load_average_1m System load average (1 minute)
# TYPE system_load_average_1m gauge
system_load_average_1m{service="${this.serviceName}"} ${systemInfo.loadAverage[0].toFixed(2)}
`;

        // Detailed request counters with standardized labels
        for (const [metricKey, value] of this.metrics.requestsByLabel.entries()) {
            const labels = this.parseMetricKey(metricKey);
            const labelStr = [
                `service="${this.escapeLabelValue(labels.service)}"`,
                `environment="${this.escapeLabelValue(labels.environment)}"`,
                `method="${this.escapeLabelValue(labels.method)}"`,
                `route="${this.escapeLabelValue(labels.route)}"`,
                `status="${this.escapeLabelValue(labels.status)}"`,
                `status_class="${this.escapeLabelValue(labels.status_class)}"`
            ].join(',');

            metricsOutput += `http_requests_total{${labelStr}} ${value}\n`;
        }

        // Standard histogram for HTTP request duration (required for latency SLO alert rules)
        metricsOutput += `\n# HELP http_request_duration_seconds HTTP request duration in seconds\n`;
        metricsOutput += `# TYPE http_request_duration_seconds histogram\n`;

        for (const [metricKey, histogramEntry] of this.metrics.durationByLabel.entries()) {
            const labels = this.parseMetricKey(metricKey);
            const commonLabelStr = [
                `service="${this.escapeLabelValue(labels.service)}"`,
                `environment="${this.escapeLabelValue(labels.environment)}"`,
                `method="${this.escapeLabelValue(labels.method)}"`,
                `route="${this.escapeLabelValue(labels.route)}"`,
                `status="${this.escapeLabelValue(labels.status)}"`,
                `status_class="${this.escapeLabelValue(labels.status_class)}"`
            ].join(',');

            for (let i = 0; i < this.durationBuckets.length; i++) {
                metricsOutput += `http_request_duration_seconds_bucket{${commonLabelStr},le="${this.durationBuckets[i]}"} ${histogramEntry.bucketCounts[i]}\n`;
            }

            metricsOutput += `http_request_duration_seconds_bucket{${commonLabelStr},le="+Inf"} ${histogramEntry.count}\n`;
            metricsOutput += `http_request_duration_seconds_sum{${commonLabelStr}} ${histogramEntry.sum.toFixed(6)}\n`;
            metricsOutput += `http_request_duration_seconds_count{${commonLabelStr}} ${histogramEntry.count}\n`;
        }

        return metricsOutput;
    }

    /**
     * Middleware to track request metrics
     */
    metricsMiddleware() {
        return (req, res, next) => {
            this.ensureTraceContext(req, res);

            const startTime = process.hrtime.bigint();
            this.metrics.inflightRequests += 1;
            let finalized = false;

            const finalize = () => {
                if (finalized) {
                    return;
                }
                finalized = true;
                this.metrics.inflightRequests = Math.max(0, this.metrics.inflightRequests - 1);
            };
            
            // Track response
            res.on('finish', () => {
                const durationNs = process.hrtime.bigint() - startTime;
                const responseTime = Number(durationNs) / 1_000_000;
                const isError = res.statusCode >= 400;

                const routePath = req.route?.path
                    ? `${req.baseUrl || ''}${req.route.path}`
                    : (req.path || req.originalUrl || 'unknown');

                this.recordRequest(responseTime, isError, {
                    method: req.method,
                    route: routePath,
                    statusCode: res.statusCode
                });

                finalize();
            });

            res.on('close', () => {
                // Ensure in-flight doesn't leak in case connection closes before finish
                finalize();
            });

            next();
        };
    }
}

/**
 * Database health check helper
 * @param {Sequelize} sequelize - Sequelize instance
 */
async function checkDatabase(sequelize) {
    try {
        const startTime = Date.now();
        await sequelize.authenticate();
        const latency = Date.now() - startTime;
        return { healthy: true, message: 'Connected', latency };
    } catch (error) {
        return { healthy: false, message: error.message };
    }
}

/**
 * Redis health check helper
 * @param {Redis} redis - ioredis instance
 */
async function checkRedis(redis) {
    try {
        const startTime = Date.now();
        await redis.ping();
        const latency = Date.now() - startTime;
        return { healthy: true, message: 'Connected', latency };
    } catch (error) {
        return { healthy: false, message: error.message };
    }
}

/**
 * S3/MinIO health check helper
 * @param {AWS.S3} s3 - S3 client instance
 * @param {string} bucketName - Bucket name to check
 */
async function checkS3(s3, bucketName) {
    try {
        const startTime = Date.now();
        await s3.headBucket({ Bucket: bucketName }).promise();
        const latency = Date.now() - startTime;
        return { healthy: true, message: 'Connected', latency };
    } catch (error) {
        return { healthy: false, message: error.message };
    }
}

module.exports = {
    HealthChecker,
    checkDatabase,
    checkRedis,
    checkS3
};
