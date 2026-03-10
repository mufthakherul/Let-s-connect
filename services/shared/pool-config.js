/**
 * Database Connection Pool Configuration
 * Workstream F3: Connection and Pooling Strategy
 * 
 * Provides optimized Sequelize connection pool configurations
 * for different service profiles (lightweight, standard, heavy).
 * 
 * Usage:
 *   const { getPoolConfig } = require('../shared/pool-config');
 *   const sequelize = new Sequelize(DATABASE_URL, {
 *     ...getPoolConfig('standard'),
 *     dialect: 'postgres'
 *   });
 */

const logger = require('./logger');

/**
 * Service profiles and their recommended pool settings
 */
const POOL_PROFILES = {
  /**
   * LIGHTWEIGHT - For services with minimal database interaction
   * Examples: ai-service, streaming-service
   * Characteristics: Few queries, mostly reads, low concurrency
   */
  lightweight: {
    max: 10,              // Maximum connections in pool
    min: 2,               // Minimum connections to maintain
    acquire: 30000,       // Max time (ms) to acquire a connection before error
    idle: 10000,          // Max time (ms) a connection can be idle before release
    evict: 1000,          // How often (ms) to check for idle connections
    maxUses: 7500,        // Max number of times a connection can be used before disposal
    validate: (connection) => {
      // Optional: Custom validation function
      return true;
    }
  },
  
  /**
   * STANDARD - For typical CRUD services
   * Examples: content-service, messaging-service, shop-service
   * Characteristics: Balanced read/write, moderate concurrency
   */
  standard: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
    evict: 1000,
    maxUses: 5000
  },
  
  /**
   * HEAVY - For services with intensive database workload
   * Examples: user-service, collaboration-service, analytics
   * Characteristics: High query volume, complex joins, high concurrency
   */
  heavy: {
    max: 40,
    min: 10,
    acquire: 60000,       // Longer timeout for high-load scenarios
    idle: 5000,           // Release idle connections faster
    evict: 500,           // Check more frequently
    maxUses: 2500         // Recycle connections more often
  },
  
  /**
   * BATCH - For batch processing and background jobs
   * Examples: email-service, report-generation, data-migration
   * Characteristics: Long-running queries, low concurrency
   */
  batch: {
    max: 5,               // Fewer connections for batch jobs
    min: 1,
    acquire: 120000,      // Very long timeout (2 minutes)
    idle: 30000,          // Keep connections longer
    evict: 5000,
    maxUses: 1000
  }
};

/**
 * Environment-based pool multipliers
 * Adjust pool sizes based on environment capacity
 */
const ENV_MULTIPLIERS = {
  development: 0.5,     // Half the connections in dev
  test: 0.3,            // Minimal connections for tests
  staging: 0.8,         // 80% of production in staging
  production: 1.0       // Full pool in production
};

/**
 * Get pool configuration for a service profile
 * @param {string} profile - Profile name: 'lightweight', 'standard', 'heavy', 'batch'
 * @param {Object} overrides - Optional overrides for specific settings
 * @returns {Object} Sequelize pool configuration
 */
function getPoolConfig(profile = 'standard', overrides = {}) {
  const baseConfig = POOL_PROFILES[profile];
  
  if (!baseConfig) {
    logger.warn(`Unknown pool profile "${profile}", using standard`, {
      availableProfiles: Object.keys(POOL_PROFILES)
    });
    return getPoolConfig('standard', overrides);
  }
  
  const env = process.env.NODE_ENV || 'development';
  const multiplier = ENV_MULTIPLIERS[env] || 1.0;
  
  // Apply environment multiplier to min/max
  const config = {
    ...baseConfig,
    max: Math.ceil(baseConfig.max * multiplier),
    min: Math.ceil(baseConfig.min * multiplier),
    ...overrides
  };
  
  logger.info('Database pool configuration', {
    profile,
    environment: env,
    multiplier,
    pool: config
  });
  
  return { pool: config };
}

/**
 * Calculate recommended pool size based on service metrics
 * @param {Object} metrics - Service metrics
 * @returns {Object} Recommended pool configuration
 */
function calculatePoolSize(metrics) {
  const {
    avgConcurrentRequests = 10,   // Average concurrent requests
    avgQueryDuration = 50,          // Average query duration (ms)
    targetResponseTime = 200        // Target response time (ms)
  } = metrics;
  
  // Formula: max_connections = (avg_concurrent_requests * avg_query_duration) / target_response_time
  // Add 20% buffer for spikes
  const calculatedMax = Math.ceil(
    (avgConcurrentRequests * avgQueryDuration / targetResponseTime) * 1.2
  );
  
  const max = Math.max(10, Math.min(calculatedMax, 50)); // Clamp between 10-50
  const min = Math.max(2, Math.ceil(max * 0.25));       // Min = 25% of max
  
  return {
    max,
    min,
    acquire: targetResponseTime * 2,
    idle: 10000,
    evict: 1000
  };
}

/**
 * Monitor pool health and log warnings
 * @param {Sequelize} sequelize - Sequelize instance
 * @param {Object} config - Pool configuration
 */
function monitorPoolHealth(sequelize, config) {
  const checkInterval = 60000; // Check every minute
  
  setInterval(async () => {
    try {
      const pool = sequelize.connectionManager.pool;
      
      if (!pool) {
        return;
      }
      
      const stats = {
        size: pool.size || 0,
        available: pool.available || 0,
        using: pool.using || 0,
        waiting: pool.pending || 0,
        maxConfigured: config.pool?.max || 0
      };
      
      // Calculate utilization
      const utilization = stats.maxConfigured > 0
        ? (stats.using / stats.maxConfigured) * 100
        : 0;
      
      // Warn if pool is >80% utilized
      if (utilization > 80) {
        logger.warn('Database pool high utilization', {
          ...stats,
          utilization: `${Math.round(utilization)}%`,
          recommendation: 'Consider increasing max pool size or optimizing queries'
        });
      }
      
      // Warn if many queries are waiting
      if (stats.waiting > 5) {
        logger.warn('Database pool congestion', {
          ...stats,
          recommendation: 'Queries are waiting for connections. Check slow queries and consider scaling pool.'
        });
      }
      
      // Info log for normal health check
      if (process.env.LOG_POOL_HEALTH === 'true') {
        logger.info('Database pool health', { ...stats, utilization: `${Math.round(utilization)}%` });
      }
      
    } catch (error) {
      logger.error('Failed to check pool health', { error: error.message });
    }
  }, checkInterval);
}

/**
 * Database capacity guardrails
 * Prevent services from exceeding database connection limits
 */
class DatabaseCapacityGuardrail {
  constructor(maxGlobalConnections = 100) {
    this.maxGlobalConnections = maxGlobalConnections;
    this.serviceAllocations = new Map();
    this.usedConnections = 0;
  }
  
  /**
   * Allocate connection budget to a service
   * @param {string} serviceName - Service name
   * @param {number} requestedMax - Requested max connections
   * @returns {number} Approved max connections
   */
  allocate(serviceName, requestedMax) {
    const available = this.maxGlobalConnections - this.usedConnections;
    
    if (available <= 0) {
      logger.error('Database connection budget exhausted', {
        maxGlobalConnections: this.maxGlobalConnections,
        usedConnections: this.usedConnections,
        serviceName,
        requestedMax
      });
      return 5; // Fallback to minimum
    }
    
    const approved = Math.min(requestedMax, available);
    this.serviceAllocations.set(serviceName, approved);
    this.usedConnections += approved;
    
    logger.info('Database connection budget allocated', {
      serviceName,
      requestedMax,
      approved,
      remaining: this.maxGlobalConnections - this.usedConnections
    });
    
    return approved;
  }
  
  /**
   * Get remaining connection capacity
   */
  getCapacity() {
    return {
      maxGlobalConnections: this.maxGlobalConnections,
      usedConnections: this.usedConnections,
      availableConnections: this.maxGlobalConnections - this.usedConnections,
      serviceAllocations: Object.fromEntries(this.serviceAllocations)
    };
  }
}

/**
 * Best practices and recommendations
 */
const bestPractices = {
  poolSizing: `
    1. Start with STANDARD profile and adjust based on monitoring
    2. Monitor pool utilization over 1-2 weeks
    3. Increase max if utilization consistently >70%
    4. Decrease max if utilization consistently <30%
    5. Never exceed database's max_connections / number_of_services
  `,
  
  queryOptimization: `
    1. Use connection pooling (never create new connections per request)
    2. Always use transactions for multi-query operations
    3. Close connections properly (use try/finally or async/await)
    4. Avoid long-running transactions (release connections quickly)
    5. Use read replicas for read-heavy workloads
  `,
  
  troubleshooting: {
    'Pool timeout errors': [
      'Check for slow queries (>1s) blocking connections',
      'Verify transactions are properly committed/rolled back',
      'Increase acquire timeout or max pool size',
      'Look for connection leaks (connections not released)'
    ],
    'Too many connections': [
      'Reduce max pool size across services',
      'Implement connection budget per service',
      'Use PgBouncer or similar connection pooler',
      'Scale database to support more connections'
    ],
    'Connection timeouts': [
      'Check database server load and disk I/O',
      'Verify network latency between app and database',
      'Increase acquire timeout',
      'Optimize slow queries causing connection exhaustion'
    ]
  }
};

module.exports = {
  getPoolConfig,
  calculatePoolSize,
  monitorPoolHealth,
  DatabaseCapacityGuardrail,
  POOL_PROFILES,
  bestPractices
};
