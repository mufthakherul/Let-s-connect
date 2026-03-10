/**
 * Slow Query Monitoring and N+1 Detection
 * Workstream F2: Query and Index Optimization
 * 
 * Provides query performance monitoring, slow query logging,
 * and N+1 query detection for Sequelize ORM.
 * 
 * Usage:
 *   const { setupQueryMonitoring, analyzeSlowQueries } = require('../shared/query-monitor');
 *   setupQueryMonitoring(sequelize, { slowQueryThreshold: 100 });
 */

const logger = require('./logger');

/**
 * Configuration defaults
 */
const DEFAULT_CONFIG = {
  slowQueryThreshold: 100,    // Log queries slower than 100ms
  n1Threshold: 5,             // Detect N+1 if >5 similar queries in 100ms window
  enableStackTrace: true,     // Include stack trace for slow queries
  sampleRate: 1.0,           // Sample 100% of queries (reduce in high-load production)
  logLevel: 'warn'           // Log level for slow queries
};

/**
 * Query statistics collector
 */
class QueryStats {
  constructor() {
    this.queries = [];
    this.slowQueries = [];
    this.n1Detections = [];
    this.queryPatterns = new Map(); // Track query patterns for N+1 detection
  }

  recordQuery(query, duration, stackTrace = null) {
    const record = {
      sql: this.normalizeQuery(query),
      duration,
      timestamp: Date.now(),
      stackTrace
    };
    
    this.queries.push(record);
    
    // Keep only last 1000 queries in memory
    if (this.queries.length > 1000) {
      this.queries.shift();
    }
    
    return record;
  }
  
  recordSlowQuery(query, duration, stackTrace = null) {
    const record = {
      sql: query,
      normalizedSql: this.normalizeQuery(query),
      duration,
      timestamp: Date.now(),
      stackTrace
    };
    
    this.slowQueries.push(record);
    
    // Keep only last 100 slow queries
    if (this.slowQueries.length > 100) {
      this.slowQueries.shift();
    }
    
    return record;
  }
  
  /**
   * Normalize query for pattern matching (remove specific values)
   */
  normalizeQuery(sql) {
    return sql
      .replace(/\d+/g, '?')                          // Replace numbers
      .replace(/'[^']*'/g, '?')                      // Replace strings
      .replace(/"[^"]*"/g, '?')                      // Replace quoted identifiers
      .replace(/\s+/g, ' ')                          // Normalize whitespace
      .trim();
  }
  
  /**
   * Detect N+1 queries (multiple similar queries in short time window)
   */
  detectN1Queries(windowMs = 100) {
    const now = Date.now();
    const recentQueries = this.queries.filter(q => now - q.timestamp < windowMs);
    
    const patternCounts = new Map();
    for (const query of recentQueries) {
      const count = patternCounts.get(query.sql) || 0;
      patternCounts.set(query.sql, count + 1);
    }
    
    const n1Patterns = [];
    for (const [pattern, count] of patternCounts.entries()) {
      if (count >= this.n1Threshold) {
        n1Patterns.push({ pattern, count, windowMs });
      }
    }
    
    return n1Patterns;
  }
  
  getStats() {
    const totalQueries = this.queries.length;
    const slowQueryCount = this.slowQueries.length;
    const avgDuration = totalQueries > 0
      ? this.queries.reduce((sum, q) => sum + q.duration, 0) / totalQueries
      : 0;
    
    return {
      totalQueries,
      slowQueryCount,
      avgDuration: Math.round(avgDuration * 100) / 100,
      slowQueryPercentage: totalQueries > 0
        ? Math.round((slowQueryCount / totalQueries) * 10000) / 100
        : 0
    };
  }
}

// Global query stats instance
const queryStats = new QueryStats();

/**
 * Setup query monitoring on Sequelize instance
 * @param {Sequelize} sequelize - Sequelize instance
 * @param {Object} config - Configuration options
 */
function setupQueryMonitoring(sequelize, config = {}) {
  const options = { ...DEFAULT_CONFIG, ...config };
  
  logger.info('Setting up query monitoring', {
    slowQueryThreshold: options.slowQueryThreshold,
    n1Threshold: options.n1Threshold
  });
  
  // Hook into Sequelize logging
  sequelize.options.logging = (sql, timing) => {
    // Skip if sampling
    if (Math.random() > options.sampleRate) {
      return;
    }
    
    const duration = timing?.executionTime || timing || 0;
    
    // Capture stack trace for slow queries
    let stackTrace = null;
    if (options.enableStackTrace && duration > options.slowQueryThreshold) {
      const err = new Error();
      stackTrace = err.stack
        .split('\n')
        .slice(2, 8) // Skip Error and captureStackTrace
        .map(line => line.trim())
        .join('\n');
    }
    
    // Record query
    queryStats.recordQuery(sql, duration, stackTrace);
    
    // Log slow queries
    if (duration > options.slowQueryThreshold) {
      queryStats.recordSlowQuery(sql, duration, stackTrace);
      
      logger[options.logLevel]('Slow query detected', {
        duration: `${duration}ms`,
        sql: sql.substring(0, 200), // Truncate long queries
        stackTrace: stackTrace ? stackTrace.substring(0, 500) : null
      });
    }
    
    // Periodic N+1 detection (every 50 queries)
    if (queryStats.queries.length % 50 === 0) {
      const n1Patterns = queryStats.detectN1Queries(100);
      for (const detection of n1Patterns) {
        queryStats.n1Detections.push(detection);
        logger.warn('Potential N+1 query pattern detected', {
          pattern: detection.pattern.substring(0, 200),
          count: detection.count,
          windowMs: detection.windowMs,
          recommendation: 'Consider using eager loading with include/attributes'
        });
      }
    }
  };
  
  // Enable query timing
  sequelize.options.benchmark = true;
  
  return queryStats;
}

/**
 * Analyze slow queries and generate optimization recommendations
 * @returns {Object} Analysis report with recommendations
 */
function analyzeSlowQueries() {
  const stats = queryStats.getStats();
  const topSlowQueries = queryStats.slowQueries
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10);
  
  const recommendations = [];
  
  // Analyze each slow query
  for (const query of topSlowQueries) {
    const sql = query.normalizedSql.toLowerCase();
    const suggestions = [];
    
    // Check for missing WHERE clause
    if (sql.includes('select') && !sql.includes('where') && !sql.includes('limit')) {
      suggestions.push('Consider adding WHERE clause or LIMIT to reduce full table scans');
    }
    
    // Check for SELECT *
    if (sql.includes('select *')) {
      suggestions.push('Select only needed columns instead of SELECT * to reduce data transfer');
    }
    
    // Check for JOIN without index hints
    if (sql.includes('join') && sql.includes('on')) {
      suggestions.push('Verify indexes exist on JOIN columns for optimal performance');
    }
    
    // Check for LIKE with leading wildcard
    if (sql.includes('like ?%') || sql.includes('like \'%')) {
      suggestions.push('LIKE with leading wildcard cannot use indexes. Consider full-text search.');
    }
    
    // Check for OR conditions
    if (sql.includes(' or ')) {
      suggestions.push('OR conditions may prevent index usage. Consider UNION or IN clause.');
    }
    
    // Check for subqueries
    if (sql.match(/\(\s*select/i)) {
      suggestions.push('Subqueries may be slow. Consider JOIN or CTE (WITH clause) instead.');
    }
    
    if (suggestions.length > 0) {
      recommendations.push({
        sql: query.sql.substring(0, 200),
        duration: query.duration,
        suggestions
      });
    }
  }
  
  // N+1 recommendations
  const recentN1 = queryStats.n1Detections.slice(-5);
  if (recentN1.length > 0) {
    recommendations.push({
      type: 'N+1 Detection',
      patterns: recentN1.map(n => ({
        pattern: n.pattern.substring(0, 200),
        count: n.count
      })),
      suggestion: 'Use Sequelize eager loading: Model.findAll({ include: [...] })'
    });
  }
  
  return {
    stats,
    topSlowQueries: topSlowQueries.map(q => ({
      sql: q.sql.substring(0, 200),
      duration: q.duration,
      timestamp: new Date(q.timestamp).toISOString()
    })),
    recommendations
  };
}

/**
 * Get query statistics
 */
function getQueryStats() {
  return queryStats.getStats();
}

/**
 * Reset query statistics (useful for testing)
 */
function resetQueryStats() {
  queryStats.queries = [];
  queryStats.slowQueries = [];
  queryStats.n1Detections = [];
  queryStats.queryPatterns.clear();
}

/**
 * Express middleware to expose query stats endpoint
 * Usage: app.get('/debug/query-stats', queryStatsMiddleware);
 */
function queryStatsMiddleware(req, res) {
  const analysis = analyzeSlowQueries();
  res.json({
    timestamp: new Date().toISOString(),
    ...analysis
  });
}

/**
 * Common query optimization patterns for Sequelize
 */
const optimizationPatterns = {
  /**
   * Eager loading to prevent N+1
   * BAD:  const users = await User.findAll();
   *       for (const user of users) { await user.getPosts(); }
   * 
   * GOOD: const users = await User.findAll({ include: [Post] });
   */
  eagerLoading: {
    bad: `
      const users = await User.findAll();
      for (const user of users) {
        user.posts = await user.getPosts();
      }
    `,
    good: `
      const users = await User.findAll({
        include: [{
          model: Post,
          attributes: ['id', 'title', 'createdAt'] // Select only needed columns
        }]
      });
    `
  },
  
  /**
   * Use raw queries for complex aggregations
   */
  rawQueries: {
    bad: `
      const posts = await Post.findAll({ include: [User, Comment] });
      const stats = posts.reduce((acc, post) => { /* manual aggregation */ }, {});
    `,
    good: `
      const [stats] = await sequelize.query(\`
        SELECT u.id, u.username, COUNT(p.id) as post_count
        FROM "Users" u
        LEFT JOIN "Posts" p ON u.id = p.userId
        GROUP BY u.id, u.username
      \`, { type: QueryTypes.SELECT });
    `
  },
  
  /**
   * Add indexes for frequently queried columns
   */
  addIndexes: {
    example: `
      // In migration or model definition:
      queryInterface.addIndex('Posts', ['userId', 'createdAt'], {
        name: 'idx_posts_user_created'
      });
      
      // Or in model:
      Post.init({
        // ... fields
      }, {
        indexes: [
          { fields: ['userId', 'createdAt'] },
          { fields: ['status'], where: { status: 'published' } } // Partial index
        ]
      });
    `
  },
  
  /**
   * Use pagination with LIMIT/OFFSET
   */
  pagination: {
    bad: `
      const allPosts = await Post.findAll(); // Could be millions of rows
      const paginated = allPosts.slice(offset, offset + limit);
    `,
    good: `
      const posts = await Post.findAll({
        limit: 20,
        offset: page * 20,
        order: [['createdAt', 'DESC']]
      });
    `
  }
};

module.exports = {
  setupQueryMonitoring,
  analyzeSlowQueries,
  getQueryStats,
  resetQueryStats,
  queryStatsMiddleware,
  optimizationPatterns
};
