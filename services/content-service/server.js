const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { sequelize } = require('./src/models');
const routes = require('./src/routes');
const { globalErrorHandler } = require('../shared/errorHandling');
const { HealthChecker, checkDatabase, checkRedis } = require('../shared/monitoring');
const { CacheManager } = require('../shared/caching');
const { MigrationManager } = require('../shared/migrations-manager');
const { getSafeSyncOptions } = require('../shared/db-sync-policy');
const { createForwardedIdentityGuard } = require('../shared/security-utils');
const { buildCorsOptions } = require('../shared/cors-config');
require('dotenv').config();

const PORT = process.env.PORT || 8002;

const app = express();
const healthChecker = new HealthChecker('content-service');
const cacheManager = new CacheManager();
const migrationManager = new MigrationManager(sequelize, 'content-service');

// Register checks
healthChecker.registerCheck('database', () => checkDatabase(sequelize));
healthChecker.registerCheck('redis', () => checkRedis(cacheManager.redis));

// Standard Middlewares
app.use(helmet());
app.use(cors(buildCorsOptions()));
app.use(express.json());
app.use(createForwardedIdentityGuard());

// Metrics tracking middleware
app.use(healthChecker.metricsMiddleware());

// Attach utilities to req
app.use((req, res, next) => {
    req.cacheManager = cacheManager;
    next();
});

// Main App Routes
app.use('/', routes);

// Enhanced health checks
app.get('/health/ready', async (req, res) => {
    try {
        const health = await healthChecker.runChecks();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
    }
});

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(healthChecker.getPrometheusMetrics());
});

// Health Check
app.get('/health', (req, res) => {
    res.json(healthChecker.getBasicHealth());
});

// Global Error Handler
app.use(globalErrorHandler);

const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('[Content Service] Database connected.');

        // Phase 10: Professional Migrations
        await migrationManager.runMigrations([
            {
                name: 'init-content-tables',
                up: async (qi) => {
                    await sequelize.sync(getSafeSyncOptions('content-service'));
                }
            },
            {
                name: 'seed-initial-awards',
                up: async (qi) => {
                    const { Award } = require('./src/models');
                    const awards = [
                        { name: 'Gold Award', description: 'A prestigious gold award', icon: '🥇', cost: 500, type: 'gold' },
                        { name: 'Silver Award', description: 'A valuable silver award', icon: '🥈', cost: 100, type: 'silver' }
                    ];
                    for (const a of awards) {
                        await Award.findOrCreate({ where: { name: a.name }, defaults: a });
                    }
                }
            }
        ]);

        // Anon Identity Cleanup (Daily)
        setInterval(async () => {
            try {
                const { AnonIdentity, Op } = require('./src/models');
                const cutoff = new Date();
                cutoff.setFullYear(cutoff.getFullYear() - 1);
                await AnonIdentity.update(
                    { mappingCiphertext: null, zeroizedAt: new Date() },
                    { where: { mappingCiphertext: { [Op.ne]: null }, createdAt: { [Op.lte]: cutoff } } }
                );
            } catch (err) {
                console.error('[Anon Cleanup Error]', err);
            }
        }, 24 * 60 * 60 * 1000);

        app.listen(PORT, () => {
            console.log(`[Content Service] Running on port ${PORT}`);
        });
    } catch (error) {
        console.error('[Content Service] Failed to start:', error);
        process.exit(1);
    }
};

startServer();
