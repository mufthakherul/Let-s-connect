const https = require('https');
const http = require('http');

/**
 * Channel Health Checker
 * Periodically validates stream URLs and updates channel status
 * Tracks uptime, response times, and stream quality
 */
class ChannelHealthChecker {
    constructor(options = {}) {
        this.timeout = options.timeout || 5000;
        this.checkInterval = options.checkInterval || 24 * 60 * 60 * 1000; // 24 hours
        this.maxConcurrent = options.maxConcurrent || 10;
        this.healthCache = new Map(); // channelId -> health status
        this.lastCheckTime = new Map();
        this.resultHistory = new Map(); // Track last 7 days of checks
    }

    /**
     * Check health of a single channel
     */
    async checkChannelHealth(channel) {
        if (!channel || !channel.streamUrl) {
            return {
                channelId: channel?.id,
                status: 'unknown',
                isHealthy: false,
                error: 'No stream URL',
                checkedAt: new Date().toISOString()
            };
        }

        try {
            const startTime = Date.now();
            const healthStatus = await this._checkStream(channel.streamUrl);
            const responseTime = Date.now() - startTime;

            const result = {
                channelId: channel.id,
                channelName: channel.name,
                status: healthStatus.status, // 'ok', 'warning', 'error'
                isHealthy: healthStatus.status === 'ok',
                statusCode: healthStatus.statusCode,
                responseTime: responseTime,
                error: healthStatus.error || null,
                lastChecked: new Date().toISOString(),
                metadata: {
                    platform: channel.metadata?.platform || channel.source,
                    streamUrl: channel.streamUrl.substring(0, 100) + '...'
                }
            };

            // Cache the result
            this.healthCache.set(channel.id, result);
            this.lastCheckTime.set(channel.id, Date.now());
            this._recordHistory(channel.id, result);

            return result;
        } catch (error) {
            const result = {
                channelId: channel.id,
                channelName: channel.name,
                status: 'error',
                isHealthy: false,
                statusCode: 0,
                responseTime: this.timeout,
                error: error.message,
                lastChecked: new Date().toISOString(),
                metadata: {
                    platform: channel.metadata?.platform || channel.source
                }
            };

            this.healthCache.set(channel.id, result);
            this._recordHistory(channel.id, result);

            return result;
        }
    }

    /**
     * Check health of multiple channels in batches
     */
    async checkMultipleChannels(channels, options = {}) {
        console.log(`🏥 Checking health of ${channels.length} channels...`);

        const results = [];
        const errors = [];
        let checked = 0;

        // Process in batches
        for (let i = 0; i < channels.length; i += this.maxConcurrent) {
            const batch = channels.slice(i, i + this.maxConcurrent);
            const batchResults = await Promise.allSettled(
                batch.map(ch => this.checkChannelHealth(ch))
            );

            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                    checked++;
                } else {
                    errors.push(result.reason);
                }
            }

            if (options.progress) {
                console.log(`  ⏳ Checked ${Math.min(i + this.maxConcurrent, channels.length)}/${channels.length} channels...`);
            }
        }

        // Generate report
        const healthyCount = results.filter(r => r.isHealthy).length;
        const warningCount = results.filter(r => r.status === 'warning').length;
        const errorCount = results.filter(r => r.status === 'error').length;

        console.log(`\n✅ Health check complete:`);
        console.log(`  - Healthy: ${healthyCount}/${results.length}`);
        console.log(`  - Warning: ${warningCount}/${results.length}`);
        console.log(`  - Error: ${errorCount}/${results.length}`);
        if (errors.length > 0) {
            console.log(`  - Check errors: ${errors.length}/${channels.length}`);
        }

        return {
            totalChecked: checked,
            results: results,
            summary: {
                healthy: healthyCount,
                warning: warningCount,
                error: errorCount,
                healthPercentage: Math.round((healthyCount / results.length) * 100)
            }
        };
    }

    /**
     * Check if stream is accessible
     */
    async _checkStream(streamUrl) {
        // YouTube streams - always considered healthy (live status changes frequently)
        if (streamUrl.includes('youtube.com') || streamUrl.includes('youtu.be')) {
            return { status: 'ok', statusCode: 200 };
        }

        try {
            return await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    resolve({ 
                        status: 'warning', 
                        statusCode: 0,
                        error: 'Timeout'
                    });
                }, this.timeout);

                const protocol = streamUrl.startsWith('https') ? https : http;
                const req = protocol.head(streamUrl, { timeout: this.timeout, maxRedirects: 3 }, (res) => {
                    clearTimeout(timeout);

                    // Determine status
                    let status = 'ok';
                    if (res.statusCode >= 400 && res.statusCode < 500) {
                        status = res.statusCode === 404 ? 'warning' : 'error';
                    } else if (res.statusCode >= 500) {
                        status = 'warning'; // Server error, might be temporary
                    }

                    resolve({
                        status,
                        statusCode: res.statusCode
                    });
                });

                req.on('error', (err) => {
                    clearTimeout(timeout);
                    resolve({
                        status: 'error',
                        statusCode: 0,
                        error: err.message
                    });
                });

                req.end();
            });
        } catch (error) {
            return {
                status: 'error',
                statusCode: 0,
                error: error.message
            };
        }
    }

    /**
     * Record health check in history (last 7 days)
     */
    _recordHistory(channelId, result) {
        if (!this.resultHistory.has(channelId)) {
            this.resultHistory.set(channelId, []);
        }

        const history = this.resultHistory.get(channelId);
        history.push({
            ...result,
            timestamp: Date.now()
        });

        // Keep only last 7 days
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        this.resultHistory.set(
            channelId,
            history.filter(h => h.timestamp > sevenDaysAgo)
        );
    }

    /**
     * Get health history for a channel
     */
    getChannelHistory(channelId) {
        return this.resultHistory.get(channelId) || [];
    }

    /**
     * Get uptime percentage for a channel (last 7 days)
     */
    getChannelUptime(channelId) {
        const history = this.getChannelHistory(channelId);
        if (history.length === 0) return null;

        const healthyChecks = history.filter(h => h.isHealthy).length;
        return Math.round((healthyChecks / history.length) * 100);
    }

    /**
     * Get average response time for a channel
     */
    getAverageResponseTime(channelId) {
        const history = this.getChannelHistory(channelId);
        if (history.length === 0) return null;

        const totalTime = history.reduce((sum, h) => sum + (h.responseTime || 0), 0);
        return Math.round(totalTime / history.length);
    }

    /**
     * Get problem channels (below 95% uptime)
     */
    getProblemChannels(minUptimePercent = 95) {
        const problems = [];

        for (const [channelId] of this.resultHistory) {
            const uptime = this.getChannelUptime(channelId);
            if (uptime !== null && uptime < minUptimePercent) {
                const cached = this.healthCache.get(channelId);
                problems.push({
                    ...cached,
                    uptime: uptime
                });
            }
        }

        return problems.sort((a, b) => a.uptime - b.uptime);
    }

    /**
     * Get cached health status for a channel
     */
    getCachedHealth(channelId) {
        return this.healthCache.get(channelId);
    }

    /**
     * Get overall system health statistics
     */
    getSystemHealth() {
        const allResults = Array.from(this.healthCache.values());

        if (allResults.length === 0) {
            return {
                overallHealth: 'unknown',
                totalChannels: 0,
                healthyChannels: 0,
                warningChannels: 0,
                errorChannels: 0,
                healthPercentage: 0,
                avgResponseTime: 0
            };
        }

        const healthy = allResults.filter(r => r.isHealthy).length;
        const warning = allResults.filter(r => r.status === 'warning').length;
        const error = allResults.filter(r => r.status === 'error').length;
        const avgResponseTime = Math.round(
            allResults.reduce((sum, r) => sum + (r.responseTime || 0), 0) / allResults.length
        );

        let overallHealth = 'good';
        const healthPercent = Math.round((healthy / allResults.length) * 100);
        if (healthPercent < 80) overallHealth = 'critical';
        else if (healthPercent < 95) overallHealth = 'warning';

        return {
            overallHealth,
            totalChannels: allResults.length,
            healthyChannels: healthy,
            warningChannels: warning,
            errorChannels: error,
            healthPercentage: healthPercent,
            avgResponseTime: avgResponseTime,
            checkedAt: new Date().toISOString()
        };
    }

    /**
     * Check if a channel needs re-checking
     */
    needsRecheck(channelId) {
        const lastCheck = this.lastCheckTime.get(channelId);
        if (!lastCheck) return true;

        return Date.now() - lastCheck > this.checkInterval;
    }

    /**
     * Get channels that need rechecking
     */
    getChannelsNeedingRecheck(channels) {
        return channels.filter(ch => this.needsRecheck(ch.id));
    }

    /**
     * Generate health report
     */
    generateReport() {
        const allResults = Array.from(this.healthCache.values());
        const byStatus = {
            ok: allResults.filter(r => r.status === 'ok'),
            warning: allResults.filter(r => r.status === 'warning'),
            error: allResults.filter(r => r.status === 'error')
        };

        const problemChannels = this.getProblemChannels(95);

        return {
            summary: this.getSystemHealth(),
            byStatus: {
                ok: byStatus.ok.length,
                warning: byStatus.warning.length,
                error: byStatus.error.length
            },
            slowestChannels: allResults
                .sort((a, b) => b.responseTime - a.responseTime)
                .slice(0, 10)
                .map(r => ({
                    name: r.channelName,
                    responseTime: r.responseTime,
                    status: r.status
                })),
            problemChannels: problemChannels.map(ch => ({
                name: ch.channelName,
                uptime: ch.uptime,
                lastStatus: ch.status,
                lastChecked: ch.lastChecked
            })),
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Export health data to JSON
     */
    exportHealthData() {
        return {
            summary: this.getSystemHealth(),
            channels: Array.from(this.healthCache.values()),
            history: Object.fromEntries(this.resultHistory),
            generatedAt: new Date().toISOString()
        };
    }
}

module.exports = ChannelHealthChecker;
