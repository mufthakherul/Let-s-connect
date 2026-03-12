# Workstream F Implementation Guide
# Database, Migrations, Caching & Search

**Status:** ✅ Completed March 10, 2026  
**Deliverables:** F1-F5 (Migration Maturity, Query Optimization, Connection Pooling, Caching Strategy, Backup/Recovery)

---

## Executive Summary

Workstream F improves database reliability, query performance, and data integrity across all services. This workstream delivers:

- **F1: Migration Maturity** - Rollback scripts, data safety checklists, migration templates
- **F2: Query Optimization** - Slow query monitoring, N+1 detection, optimization recommendations
- **F3: Connection Pooling** - Profile-based pool configurations, capacity guardrails
- **F4: Caching Strategy** - Standardized Redis key naming, TTL policies, invalidation patterns
- **F5: Backup & Recovery** - Automated backups, verification, restore drills

---

## Architecture Overview

### Shared Utilities

All new database utilities are located in `services/shared/`:

```
services/shared/
├── migration-template.js      # Migration template with rollback support
├── query-monitor.js           # Slow query monitoring and N+1 detection
├── pool-config.js             # Connection pool configuration profiles
├── cache-strategy.js          # Redis cache key builder and TTL policies
├── migrations-manager.js      # ✅ Existing - Migration tracking system
├── caching.js                 # ✅ Existing - Cache manager class
└── cache-policy.js            # ✅ Existing - Cache policy definitions
```

### Scripts

```
scripts/
└── backup-automation.sh       # Automated backup, verification, restore drills
```

---

## F1: Migration Maturity

### Migration Template Structure

**File:** `services/shared/migration-template.js`

**Features:**
- Transactional migrations (automatic rollback on failure)
- Pre-migration and pre-rollback safety checks
- Data safety checklist
- Verification queries
- Rollback strategy documentation

**Safety Levels:**
- **LOW**: Safe operations (add column with default, create index)
- **MEDIUM**: Schema changes affecting queries (rename column, add constraint)
- **HIGH**: Data transformations (update values, backfill data)
- **CRITICAL**: Data deletion or destructive operations

**Rollback Strategies:**
- **AUTOMATIC**: Safe to rollback with down() function
- **MANUAL**: Requires manual intervention
- **DATA_DEPENDENT**: Depends on data state (may require backup restore)

**Usage Example:**

```javascript
// Copy migration-template.js and customize
const migration = {
  name: 'add_post_status_column',
  
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Pre-migration checks
      await this._preMigrationChecks(queryInterface);
      
      // Add column
      await queryInterface.addColumn(
        'Posts',
        'status',
        {
          type: Sequelize.ENUM('draft', 'published', 'archived'),
          defaultValue: 'draft',
          allowNull: false
        },
        { transaction }
      );
      
      // Create index
      await queryInterface.addIndex(
        'Posts',
        ['status', 'createdAt'],
        {
          name: 'idx_posts_status_created',
          transaction
        }
      );
      
      await transaction.commit();
      logger.info('Migration completed successfully');
      
    } catch (error) {
      await transaction.rollback();
      logger.error('Migration failed', { error: error.message });
      throw error;
    }
  },
  
  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.removeIndex('Posts', 'idx_posts_status_created', { transaction });
      await queryInterface.removeColumn('Posts', 'status', { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
  
  async _preMigrationChecks(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('Posts')) {
      throw new Error('Posts table does not exist');
    }
  }
};
```

### Data Safety Checklist

Before deploying migrations to production:

- □ Migration tested in local development
- □ Migration tested in staging with production-like data
- □ Rollback tested in staging
- □ Performance impact assessed (duration, resource usage)
- □ Backup verification completed
- □ Monitoring alerts configured
- □ Rollback plan documented
- □ Database capacity checked
- □ Concurrent query impact assessed
- □ Data validation queries prepared

### Migration Workflow

```bash
# 1. Create migration from template
cp services/shared/migration-template.js services/user-service/migrations/add_feature.js

# 2. Edit migration up/down functions
vim services/user-service/migrations/add_feature.js

# 3. Test in development
NODE_ENV=development node services/user-service/server.js

# 4. Test rollback in development
# (implement rollback test in migration-manager)

# 5. Test in staging
NODE_ENV=staging node services/user-service/server.js

# 6. Deploy to production (with backup first!)
./scripts/backup-automation.sh backup
NODE_ENV=production node services/user-service/server.js
```

---

## F2: Query and Index Optimization

### Slow Query Monitoring

**File:** `services/shared/query-monitor.js`

**Features:**
- Automatic slow query detection (configurable threshold)
- N+1 query pattern detection
- Query normalization for pattern matching
- Stack trace capture for debugging
- Optimization recommendations

**Setup:**

```javascript
const { setupQueryMonitoring, analyzeSlowQueries } = require('../shared/query-monitor');

// In server.js after sequelize initialization
const queryStats = setupQueryMonitoring(sequelize, {
  slowQueryThreshold: 100,    // Log queries > 100ms
  n1Threshold: 5,             // Detect N+1 if >5 similar queries
  enableStackTrace: true,
  sampleRate: 1.0             // Monitor 100% of queries
});

// Add endpoint to view query stats
app.get('/debug/query-stats', (req, res) => {
  const analysis = analyzeSlowQueries();
  res.json(analysis);
});
```

**Output Example:**

```json
{
  "stats": {
    "totalQueries": 1543,
    "slowQueryCount": 12,
    "avgDuration": 45.23,
    "slowQueryPercentage": 0.78
  },
  "topSlowQueries": [
    {
      "sql": "SELECT * FROM Posts WHERE ...",
      "duration": 1234,
      "timestamp": "2026-03-10T12:00:00Z"
    }
  ],
  "recommendations": [
    {
      "sql": "SELECT * FROM Posts",
      "duration": 500,
      "suggestions": [
        "Consider adding WHERE clause or LIMIT",
        "Select only needed columns instead of SELECT *"
      ]
    }
  ]
}
```

### Common Optimization Patterns

```javascript
// BAD: N+1 Query Pattern
const users = await User.findAll();
for (const user of users) {
  user.posts = await user.getPosts(); // N+1!
}

// GOOD: Eager Loading
const users = await User.findAll({
  include: [{
    model: Post,
    attributes: ['id', 'title', 'createdAt']
  }]
});

// BAD: Fetching all records
const allPosts = await Post.findAll();
const paginated = allPosts.slice(offset, offset + limit);

// GOOD: Database-level pagination
const posts = await Post.findAll({
  limit: 20,
  offset: page * 20,
  order: [['createdAt', 'DESC']]
});

// BAD: Manual aggregation
const posts = await Post.findAll({ include: [User, Comment] });
const stats = posts.reduce((acc, post) => { /* ... */ }, {});

// GOOD: Database aggregation
const [stats] = await sequelize.query(`
  SELECT u.id, u.username, COUNT(p.id) as post_count
  FROM "Users" u
  LEFT JOIN "Posts" p ON u.id = p.userId
  GROUP BY u.id, u.username
`, { type: QueryTypes.SELECT });
```

### Index Best Practices

```javascript
// Add indexes in migration
await queryInterface.addIndex('Posts', ['userId', 'createdAt'], {
  name: 'idx_posts_user_created'
});

// Partial index for specific queries
await queryInterface.addIndex('Posts', ['status'], {
  name: 'idx_posts_published',
  where: { status: 'published' }
});

// Composite index for common query patterns
await queryInterface.addIndex('Posts', ['userId', 'status', 'createdAt'], {
  name: 'idx_posts_user_status_created'
});
```

**Index Selection Guidelines:**
- Add indexes for columns in WHERE clauses
- Add indexes for JOIN columns
- Add indexes for ORDER BY columns
- Use composite indexes for multi-column queries
- Avoid over-indexing (slows down writes)
- Monitor index usage with `pg_stat_user_indexes`

---

## F3: Connection and Pooling Strategy

### Pool Configuration Profiles

**File:** `services/shared/pool-config.js`

**Features:**
- Profile-based configurations (lightweight, standard, heavy, batch)
- Environment-based scaling (dev, staging, production)
- Pool health monitoring
- Database capacity guardrails

**Usage:**

```javascript
const { getPoolConfig } = require('../shared/pool-config');

const sequelize = new Sequelize(DATABASE_URL, {
  ...getPoolConfig('standard'), // or 'lightweight', 'heavy', 'batch'
  dialect: 'postgres',
  logging: false
});
```

**Pool Profiles:**

| Profile | Max Connections | Min Connections | Use Case |
|---------|----------------|-----------------|----------|
| **lightweight** | 10 | 2 | Services with minimal DB interaction (ai-service, streaming-service) |
| **standard** | 20 | 5 | Typical CRUD services (content-service, messaging-service, shop-service) |
| **heavy** | 40 | 10 | Intensive workload services (user-service, collaboration-service) |
| **batch** | 5 | 1 | Batch processing and background jobs (email-service, reports) |

**Environment Multipliers:**
- Development: 0.5x (half the connections)
- Test: 0.3x (minimal connections)
- Staging: 0.8x (80% of production)
- Production: 1.0x (full capacity)

### Pool Health Monitoring

```javascript
const { monitorPoolHealth } = require('../shared/pool-config');

// Start monitoring after sequelize initialization
monitorPoolHealth(sequelize, getPoolConfig('standard'));

// Logs warnings when:
// - Pool utilization > 80%
// - Many queries waiting for connections
```

### Capacity Guardrails

```javascript
const { DatabaseCapacityGuardrail } = require('../shared/pool-config');

// Global connection budget: 100 connections
const guardrail = new DatabaseCapacityGuardrail(100);

// Allocate per service
const approvedMax = guardrail.allocate('user-service', 40);
// Approved: 40

const approvedMax2 = guardrail.allocate('content-service', 30);
// Approved: 30

const approvedMax3 = guardrail.allocate('messaging-service', 50);
// Approved: 30 (only 30 remaining)

console.log(guardrail.getCapacity());
// {
//   maxGlobalConnections: 100,
//   usedConnections: 100,
//   availableConnections: 0,
//   serviceAllocations: { 'user-service': 40, 'content-service': 30, 'messaging-service': 30 }
// }
```

### Troubleshooting

**Pool Timeout Errors:**
- Check for slow queries blocking connections
- Verify transactions are properly committed/rolled back
- Increase acquire timeout or max pool size
- Look for connection leaks

**Too Many Connections:**
- Reduce max pool size across services
- Implement connection budget per service
- Use PgBouncer for connection pooling
- Scale database to support more connections

---

## F4: Caching and Search

### Redis Cache Key Strategy

**File:** `services/shared/cache-strategy.js`

**Features:**
- Standardized key naming (namespace:entity:id)
- Pre-defined TTL policies
- Cache invalidation patterns
- Cache middleware for Express
- Cache warming strategies

**Cache Key Builder:**

```javascript
const { CacheKeyBuilder, CacheTTL } = require('../shared/cache-strategy');

// User keys
const userKey = CacheKeyBuilder.user(userId);
// Output: "user:profile:123e4567-e89b-12d3-a456-426614174000"

const sessionKey = CacheKeyBuilder.userSession(sessionId);
// Output: "user:session:abc123"

// Content keys
const postKey = CacheKeyBuilder.post(postId);
// Output: "content:post:456f7890-e89b-12d3-a456-426614174111"

const feedKey = CacheKeyBuilder.feed(userId, page);
// Output: "content:feed:123e4567-e89b-12d3-a456-426614174000:1"

// Custom keys
const customKey = CacheKeyBuilder.custom('myservice', 'entity', 'id1', 'id2');
// Output: "myservice:entity:id1:id2"
```

**TTL Policies:**

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| User Profile | 5 minutes | Moderate update frequency |
| User Session | 1 hour | Session duration |
| Post | 3 minutes | High churn content |
| Feed/List | 30-60 seconds | Frequently changing |
| Search Results | 5 minutes | Balance freshness vs efficiency |
| Trending/Stats | 10 minutes - 1 hour | Aggregated data |
| Static Config | 1 hour - 24 hours | Rarely changes |

**Usage Example:**

```javascript
const { CacheKeyBuilder, CacheTTL } = require('../shared/cache-strategy');

// Get with cache
async function getUser(userId) {
  const cacheKey = CacheKeyBuilder.user(userId);
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Cache miss - fetch from database
  const user = await User.findByPk(userId);
  
  // Store in cache
  await redis.setex(cacheKey, CacheTTL.USER_PROFILE, JSON.stringify(user));
  
  return user;
}
```

### Cache Invalidation

```javascript
const { CacheInvalidation } = require('../shared/cache-strategy');

// Invalidate user caches
await CacheInvalidation.invalidateUser(redis, userId);

// Invalidate post caches
await CacheInvalidation.invalidatePost(redis, postId, authorId);

// Invalidate search caches
await CacheInvalidation.invalidateSearch(redis);

// Invalidate conversation caches
await CacheInvalidation.invalidateConversation(redis, conversationId);
```

### Cache Middleware

```javascript
const { cacheMiddleware, CacheTTL } = require('../shared/cache-strategy');

// Cache GET responses automatically
app.get('/api/posts',
  cacheMiddleware(redis, CacheTTL.API_LIST),
  controller.getPosts
);

// Response headers:
// X-Cache: HIT (from cache)
// X-Cache: MISS (from database)
```

### Cache Warming

```javascript
const { CacheWarmer } = require('../shared/cache-strategy');

// Warm critical caches on startup
await CacheWarmer.warmCriticalCaches(redis, models);
```

### Cache Monitoring

```javascript
const { getCacheStats } = require('../shared/cache-strategy');

const stats = await getCacheStats(redis);
console.log(stats);
// {
//   hits: 15432,
//   misses: 3421,
//   hitRate: "81.85",
//   evictedKeys: 245,
//   expiredKeys: 1234
// }
```

---

## F5: Backup and Recovery

### Automated Backup Script

**File:** `scripts/backup-automation.sh`

**Features:**
- Automated database backups with compression
- Checksum verification (SHA-256)
- S3 upload support
- Retention policy (default: 30 days)
- Restore from backup
- Automated restore drills

**Usage:**

```bash
# Create backups of all databases
./scripts/backup-automation.sh backup

# Verify latest backup
./scripts/backup-automation.sh verify

# Verify specific backup
./scripts/backup-automation.sh verify /var/backups/postgres/users_20260310_120000.sql.gz

# Restore from backup (DANGEROUS!)
./scripts/backup-automation.sh restore /var/backups/postgres/users_20260310_120000.sql.gz users_restored

# Run restore drill (test restore without affecting production)
./scripts/backup-automation.sh drill
```

**Configuration:**

```bash
# Environment variables
export BACKUP_DIR="/var/backups/postgres"
export POSTGRES_HOST="localhost"
export POSTGRES_PORT="5432"
export POSTGRES_USER="postgres"
export POSTGRES_PASSWORD="your-password"
export BACKUP_RETENTION_DAYS=30
export BACKUP_S3_BUCKET="my-bucket"
export ENABLE_S3_UPLOAD=true
```

**Backup Schedule:**

Use cron to schedule automated backups:

```cron
# Daily backup at 2 AM
0 2 * * * /path/to/backup-automation.sh backup >> /var/log/backup.log 2>&1

# Weekly restore drill on Sundays at 3 AM
0 3 * * 0 /path/to/backup-automation.sh drill >> /var/log/restore-drill.log 2>&1
```

**Restore Drill Process:**

1. Find latest backup
2. Create temporary test database
3. Restore backup to test database
4. Run validation queries (table count, row count)
5. Cleanup test database
6. Report success/failure

**Safety Features:**

- Requires `FORCE_RESTORE=true` for production restores
- Checksum verification before restore
- Transaction-based restore (atomic)
- Detailed logging to `/var/backups/postgres/backup_TIMESTAMP.log`

**Monitoring Integration:**

```bash
# Check backup status
tail -f /var/backups/postgres/backup_*.log

# Alert on backup failures
if ! ./scripts/backup-automation.sh backup; then
  # Send alert (email, Slack, PagerDuty)
  echo "Backup failed!" | mail -s "Backup Alert" ops@example.com
fi
```

---

## Migration Guide

### Step 1: Apply Pool Configuration

```javascript
// services/user-service/src/models/index.js
const { getPoolConfig } = require('../../shared/pool-config');

const sequelize = new Sequelize(DATABASE_URL, {
  ...getPoolConfig('heavy'), // user-service is heavy workload
  dialect: 'postgres',
  benchmark: true,
  logging: false
});
```

### Step 2: Setup Query Monitoring

```javascript
// services/user-service/server.js
const { setupQueryMonitoring } = require('../shared/query-monitor');

// After sequelize initialization
setupQueryMonitoring(sequelize, {
  slowQueryThreshold: 100,
  n1Threshold: 5
});

// Add debug endpoint
app.get('/debug/query-stats', (req, res) => {
  const analysis = require('../shared/query-monitor').analyzeSlowQueries();
  res.json(analysis);
});
```

### Step 3: Implement Caching

```javascript
// services/content-service/src/controllers/postController.js
const { CacheKeyBuilder, CacheTTL, CacheInvalidation } = require('../../shared/cache-strategy');

exports.getPost = async (req, res) => {
  const { id } = req.params;
  const cacheKey = CacheKeyBuilder.post(id);
  
  // Try cache
  const cached = await req.cacheManager.redis.get(cacheKey);
  if (cached) {
    return response.success(req, res, JSON.parse(cached));
  }
  
  // Fetch from DB
  const post = await Post.findByPk(id);
  
  // Cache result
  await req.cacheManager.redis.setex(cacheKey, CacheTTL.POST, JSON.stringify(post));
  
  return response.success(req, res, post);
};

exports.updatePost = async (req, res) => {
  const { id } = req.params;
  const post = await Post.findByPk(id);
  await post.update(req.body);
  
  // Invalidate caches
  await CacheInvalidation.invalidatePost(req.cacheManager.redis, id, post.userId);
  
  return response.success(req, res, post);
};
```

### Step 4: Setup Automated Backups

```bash
# Install backup script
chmod +x scripts/backup-automation.sh

# Configure environment
cat > /etc/backup.env <<EOF
BACKUP_DIR="/var/backups/postgres"
POSTGRES_HOST="postgres"
POSTGRES_PORT="5432"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="your-password"
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET="my-app-backups"
ENABLE_S3_UPLOAD=true
EOF

# Add to crontab
crontab -e
# Add: 0 2 * * * source /etc/backup.env && /path/to/backup-automation.sh backup
# Add: 0 3 * * 0 source /etc/backup.env && /path/to/backup-automation.sh drill
```

### Step 5: Use Migration Template

```bash
# Create new migration
cp services/shared/migration-template.js services/user-service/migrations/202603_add_feature.js

# Edit migration
vim services/user-service/migrations/202603_add_feature.js

# Test in development
NODE_ENV=development npm run migrate

# Test rollback
NODE_ENV=development npm run migrate:undo
```

---

## Metrics & Monitoring

### Database Metrics

**Query Performance:**
- Average query duration
- Slow query count and percentage
- N+1 query detections
- Query throughput (queries/second)

**Connection Pool:**
- Pool size (current connections)
- Pool utilization (using / max)
- Waiting queries
- Connection acquire time

**Cache Performance:**
- Hit rate (hits / (hits + misses))
- Miss rate
- Evicted keys
- Memory usage

### Monitoring Endpoints

```javascript
// Query statistics
GET /debug/query-stats

// Pool health
GET /debug/pool-health

// Cache statistics
GET /debug/cache-stats
```

### Alerting Thresholds

- Slow query percentage > 5%
- Pool utilization > 80%
- Cache hit rate < 70%
- Backup failure (any)
- Restore drill failure (weekly check)

---

## Benefits

**For Development Team:**
- Faster queries with optimization tooling
- Consistent caching patterns
- Safe migrations with rollback support
- Predictable database performance

**For Operations:**
- Automated backups with verification
- Connection pool monitoring
- Query performance insights
- Disaster recovery confidence

**For Users:**
- Faster page loads (caching)
- More reliable service (backups)
- Better responsiveness (query optimization)

---

## References

- Migration Template: `services/shared/migration-template.js`
- Query Monitoring: `services/shared/query-monitor.js`
- Pool Configuration: `services/shared/pool-config.js`
- Cache Strategy: `services/shared/cache-strategy.js`
- Backup Script: `scripts/backup-automation.sh`

---

**Implemented by:** Platform Team  
**Date:** March 10, 2026  
**Status:** ✅ Complete - Ready for Service Integration
