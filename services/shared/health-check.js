/**
 * Health Check Utilities
 * Workstream E2: Reliability and scalability patterns
 * 
 * Provides /health and /ready endpoints with dependency checks
 * Supports liveness and readiness probes for Kubernetes
 */

const logger = require('./logger');

/**
 * Health check status constants
 */
const HealthStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy'
};

/**
 * Dependency check result
 */
class DependencyCheck {
  constructor(name, status, responseTime = null, error = null, metadata = {}) {
    this.name = name;
    this.status = status;
    this.responseTime = responseTime;
    this.error = error;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
  
  isHealthy() {
    return this.status === HealthStatus.HEALTHY;
  }
  
  toJSON() {
    return {
      name: this.name,
      status: this.status,
      responseTime: this.responseTime,
      error: this.error,
      metadata: this.metadata,
      timestamp: this.timestamp
    };
  }
}

/**
 * Health Check Manager
 */
class HealthCheckManager {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'service';
    this.version = options.version || '1.0.0';
    this.dependencies = new Map();
    this.shutdownManager = options.shutdownManager || null;
    this.startTime = Date.now();
  }
  
  /**
   * Register a dependency check
   * @param {string} name - Dependency name
   * @param {Function} checkFn - Async function that performs the check
   * @param {Object} options - Check options (required, timeout)
   */
  registerDependency(name, checkFn, options = {}) {
    this.dependencies.set(name, {
      name,
      checkFn,
      required: options.required !== false, // Default to required
      timeout: options.timeout || 5000,
      metadata: options.metadata || {}
    });
    
    logger.debug(`Registered health check: ${name}`, {
      required: options.required !== false,
      timeout: options.timeout || 5000
    });
  }
  
  /**
   * Check individual dependency
   */
  async checkDependency(dependency) {
    const startTime = Date.now();
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), dependency.timeout);
      });
      
      // Race between check and timeout
      await Promise.race([
        dependency.checkFn(),
        timeoutPromise
      ]);
      
      const responseTime = Date.now() - startTime;
      return new DependencyCheck(
        dependency.name,
        HealthStatus.HEALTHY,
        responseTime,
        null,
        dependency.metadata
      );
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return new DependencyCheck(
        dependency.name,
        HealthStatus.UNHEALTHY,
        responseTime,
        error.message,
        dependency.metadata
      );
    }
  }
  
  /**
   * Run all dependency checks
   */
  async runChecks() {
    const checks = await Promise.all(
      Array.from(this.dependencies.values()).map(dep => this.checkDependency(dep))
    );
    
    // Determine overall status
    const requiredChecks = Array.from(this.dependencies.values())
      .filter(dep => dep.required)
      .map(dep => dep.name);
    
    const failedRequired = checks.filter(check =>
      !check.isHealthy() && requiredChecks.includes(check.name)
    );
    
    const failedOptional = checks.filter(check =>
      !check.isHealthy() && !requiredChecks.includes(check.name)
    );
    
    let overallStatus;
    if (failedRequired.length > 0) {
      overallStatus = HealthStatus.UNHEALTHY;
    } else if (failedOptional.length > 0) {
      overallStatus = HealthStatus.DEGRADED;
    } else {
      overallStatus = HealthStatus.HEALTHY;
    }
    
    return {
      status: overallStatus,
      service: this.serviceName,
      version: this.version,
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
      checks: checks.map(check => check.toJSON())
    };
  }
  
  /**
   * Basic liveness check (no dependencies)
   */
  getLiveness() {
    const isShuttingDown = this.shutdownManager && this.shutdownManager.isShutdown();
    
    return {
      status: isShuttingDown ? HealthStatus.UNHEALTHY : HealthStatus.HEALTHY,
      service: this.serviceName,
      version: this.version,
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
      shutting_down: isShuttingDown
    };
  }
  
  /**
   * Express middleware for /health endpoint
   */
  healthMiddleware() {
    return (req, res) => {
      const health = this.getLiveness();
      const statusCode = health.status === HealthStatus.HEALTHY ? 200 : 503;
      res.status(statusCode).json(health);
    };
  }
  
  /**
   * Express middleware for /ready endpoint
   */
  readyMiddleware() {
    return async (req, res) => {
      try {
        const health = await this.runChecks();
        const statusCode = health.status === HealthStatus.HEALTHY ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        logger.error('Readiness check failed', {
          error: error.message,
          stack: error.stack
        });
        res.status(503).json({
          status: HealthStatus.UNHEALTHY,
          service: this.serviceName,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    };
  }
}

/**
 * Common dependency check functions
 */
const checks = {
  /**
   * Database connection check
   */
  database: (sequelize) => async () => {
    await sequelize.authenticate();
  },
  
  /**
   * Redis connection check
   */
  redis: (redis) => async () => {
    await redis.ping();
  },
  
  /**
   * HTTP service check
   */
  httpService: (url, options = {}) => async () => {
    const axios = require('axios');
    const response = await axios.get(url, {
      timeout: options.timeout || 3000,
      validateStatus: () => true
    });
    
    if (response.status < 200 || response.status >= 500) {
      throw new Error(`Service returned status ${response.status}`);
    }
  },
  
  /**
   * File system check
   */
  fileSystem: (path) => async () => {
    const fs = require('fs').promises;
    await fs.access(path);
  },
  
  /**
   * Memory check
   */
  memory: (maxPercentage = 90) => async () => {
    const used = process.memoryUsage();
    const heapPercent = (used.heapUsed / used.heapTotal) * 100;
    
    if (heapPercent > maxPercentage) {
      throw new Error(`Memory usage at ${heapPercent.toFixed(2)}%`);
    }
  },
  
  /**
   * Custom check
   */
  custom: (checkFn) => checkFn
};

/**
 * Create health check manager with common dependencies
 */
function createHealthCheck(serviceName, options = {}) {
  const manager = new HealthCheckManager({
    serviceName,
    version: options.version || process.env.npm_package_version || '1.0.0',
    shutdownManager: options.shutdownManager
  });
  
  // Auto-register database if provided
  if (options.database) {
    manager.registerDependency('database', checks.database(options.database), {
      required: true,
      timeout: 5000
    });
  }
  
  // Auto-register Redis if provided
  if (options.redis) {
    manager.registerDependency('redis', checks.redis(options.redis), {
      required: options.redisRequired !== false,
      timeout: 3000
    });
  }
  
  // Auto-register memory check
  manager.registerDependency('memory', checks.memory(90), {
    required: false,
    timeout: 1000
  });
  
  return manager;
}

/**
 * Setup health check routes
 */
function setupHealthRoutes(app, healthCheck) {
  // Liveness probe - lightweight check
  app.get('/health', healthCheck.healthMiddleware());
  
  // Readiness probe - full dependency checks
  app.get('/ready', healthCheck.readyMiddleware());
  app.get('/health/ready', healthCheck.readyMiddleware());
}

module.exports = {
  HealthCheckManager,
  HealthStatus,
  DependencyCheck,
  checks,
  createHealthCheck,
  setupHealthRoutes
};
