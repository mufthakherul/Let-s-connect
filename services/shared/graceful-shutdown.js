/**
 * Graceful Shutdown Middleware
 * Workstream E2: Reliability and scalability patterns
 * 
 * Handles SIGTERM/SIGINT signals for zero-downtime deployments
 * Closes HTTP server, database connections, and other resources gracefully
 */

const logger = require('./logger');

/**
 * Graceful shutdown configuration
 */
const DEFAULT_CONFIG = {
  shutdownTimeout: 30000,     // 30 seconds max shutdown time
  healthcheckGracePeriod: 5000, // 5 seconds before marking unhealthy
  logger: logger
};

/**
 * Shutdown state management
 */
class ShutdownManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isShuttingDown = false;
    this.shutdownStartTime = null;
    this.cleanupHandlers = [];
    this.connections = new Set();
    this.logger = this.config.logger;
  }
  
  /**
   * Register a cleanup handler
   */
  registerCleanup(name, handler, priority = 10) {
    this.cleanupHandlers.push({ name, handler, priority });
    this.cleanupHandlers.sort((a, b) => a.priority - b.priority); // Lower = higher priority
    this.logger.debug(`Registered cleanup handler: ${name} (priority ${priority})`);
  }
  
  /**
   * Track active HTTP connections
   */
  trackConnection(connection) {
    this.connections.add(connection);
    
    connection.on('close', () => {
      this.connections.delete(connection);
    });
  }
  
  /**
   * Check if service is shutting down
   */
  isShutdown() {
    return this.isShuttingDown;
  }
  
  /**
   * Start graceful shutdown
   */
  async shutdown(signal = 'SIGTERM') {
    if (this.isShuttingDown) {
      this.logger.warn('Shutdown already in progress');
      return;
    }
    
    this.isShuttingDown = true;
    this.shutdownStartTime = Date.now();
    
    this.logger.info('Graceful shutdown initiated', {
      signal,
      activeConnections: this.connections.size,
      cleanupHandlers: this.cleanupHandlers.length
    });
    
    // Set shutdown timeout
    const shutdownTimer = setTimeout(() => {
      this.logger.error('Graceful shutdown timeout exceeded', {
        timeout: this.config.shutdownTimeout,
        duration: Date.now() - this.shutdownStartTime
      });
      process.exit(1);
    }, this.config.shutdownTimeout);
    
    try {
      // Wait for health check grace period before closing connections
      await this.sleep(this.config.healthcheckGracePeriod);
      
      // Close all active connections
      this.logger.info('Closing active connections', {
        count: this.connections.size
      });
      
      for (const connection of this.connections) {
        connection.destroy();
      }
      
      // Run cleanup handlers in priority order
      for (const { name, handler } of this.cleanupHandlers) {
        try {
          this.logger.info(`Running cleanup: ${name}`);
          await handler();
          this.logger.info(`Completed cleanup: ${name}`);
        } catch (error) {
          this.logger.error(`Cleanup failed: ${name}`, {
            error: error.message,
            stack: error.stack
          });
        }
      }
      
      clearTimeout(shutdownTimer);
      
      const shutdownDuration = Date.now() - this.shutdownStartTime;
      this.logger.info('Graceful shutdown completed', {
        duration: `${shutdownDuration}ms`
      });
      
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimer);
      this.logger.error('Graceful shutdown error', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    }
  }
  
  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Initialize graceful shutdown for Express app
 * @param {Object} app - Express application
 * @param {Object} server - HTTP server instance
 * @param {Object} options - Configuration options
 */
function initGracefulShutdown(app, server, options = {}) {
  const manager = new ShutdownManager(options);
  
  // Track connections
  server.on('connection', (connection) => {
    manager.trackConnection(connection);
  });
  
  // Middleware to reject requests during shutdown
  app.use((req, res, next) => {
    if (manager.isShutdown()) {
      res.setHeader('Connection', 'close');
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service is shutting down',
          trace: {
            requestId: req.id || 'unknown',
            timestamp: new Date().toISOString()
          }
        }
      });
    }
    next();
  });
  
  // Register HTTP server cleanup
  manager.registerCleanup('http-server', () => {
    return new Promise((resolve) => {
      server.close(() => {
        manager.logger.info('HTTP server closed');
        resolve();
      });
    });
  }, 0); // High priority
  
  // Handle signals
  const shutdownSignals = ['SIGTERM', 'SIGINT'];
  
  shutdownSignals.forEach(signal => {
    process.on(signal, () => {
      manager.logger.info(`Received ${signal} signal`);
      manager.shutdown(signal);
    });
  });
  
  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    manager.logger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack
    });
    manager.shutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    manager.logger.error('Unhandled rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack
    });
    manager.shutdown('unhandledRejection');
  });
  
  return manager;
}

/**
 * Database connection cleanup helper
 */
function createDatabaseCleanup(sequelize, name = 'database') {
  return async () => {
    if (sequelize && typeof sequelize.close === 'function') {
      await sequelize.close();
      logger.info(`${name} connection closed`);
    }
  };
}

/**
 * Redis connection cleanup helper
 */
function createRedisCleanup(redis, name = 'redis') {
  return async () => {
    if (redis && typeof redis.quit === 'function') {
      await redis.quit();
      logger.info(`${name} connection closed`);
    } else if (redis && typeof redis.disconnect === 'function') {
      await redis.disconnect();
      logger.info(`${name} connection closed`);
    }
  };
}

/**
 * Generic resource cleanup helper
 */
function createResourceCleanup(resource, closeFn, name = 'resource') {
  return async () => {
    if (resource && typeof closeFn === 'function') {
      await closeFn(resource);
      logger.info(`${name} closed`);
    }
  };
}

module.exports = {
  ShutdownManager,
  initGracefulShutdown,
  createDatabaseCleanup,
  createRedisCleanup,
  createResourceCleanup
};
