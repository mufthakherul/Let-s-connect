/**
 * Monitoring and Metrics Utilities
 * Phase 4: Scale & Performance (v2.5)
 * 
 * Provides health checks, metrics collection, and Prometheus-compatible endpoints
 */

const os = require('os');
const process = require('process');

class HealthChecker {
    constructor(serviceName) {
        this.serviceName = serviceName;
        this.startTime = Date.now();
        this.checks = new Map();
        this.metrics = {
            requests: 0,
            errors: 0,
            totalResponseTime: 0
        };
    }

    /**
     * Register a health check function
     * @param {string} name - Name of the check (e.g., 'database', 'redis', 's3')
     * @param {Function} checkFn - Async function that returns { healthy: boolean, message?: string, latency?: number }
     */
    registerCheck(name, checkFn) {
        this.checks.set(name, checkFn);
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
    recordRequest(responseTime, error = false) {
        this.metrics.requests++;
        if (error) this.metrics.errors++;
        this.metrics.totalResponseTime += responseTime;
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

        return `# HELP service_uptime_seconds Service uptime in seconds
# TYPE service_uptime_seconds gauge
service_uptime_seconds{service="${this.serviceName}"} ${uptime}

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{service="${this.serviceName}"} ${this.metrics.requests}

# HELP http_requests_errors_total Total number of HTTP request errors
# TYPE http_requests_errors_total counter
http_requests_errors_total{service="${this.serviceName}"} ${this.metrics.errors}

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
    }

    /**
     * Middleware to track request metrics
     */
    metricsMiddleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            // Track response
            res.on('finish', () => {
                const responseTime = Date.now() - startTime;
                const isError = res.statusCode >= 400;
                this.recordRequest(responseTime, isError);
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
