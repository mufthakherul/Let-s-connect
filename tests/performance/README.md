# Performance Testing Suite

## Overview

Comprehensive performance and load testing tools for the Milonexa platform. This suite includes:
- **Artillery-based tests**: Industry-standard load testing framework
- **Custom Node.js load tester**: Lightweight, customizable performance testing
- **Stress testing scenarios**: Validation of system behavior under extreme load

## Quick Start

### Prerequisites

```bash
# Install Artillery globally
npm install -g artillery

# Or install dependencies locally
cd tests/performance
npm install
```

### Running Tests

#### Artillery Tests (Recommended)

```bash
# Basic test
artillery run artillery-config.yml

# With custom target
artillery run -t http://your-api.com artillery-config.yml

# Generate HTML report
artillery run -o report.json artillery-config.yml
artillery report report.json

# Quick test (shortened duration)
artillery quick --duration 60 --rate 10 http://localhost:8000/user/login
```

#### Node.js Load Tester

```bash
# Default configuration
node load-test.js

# Custom configuration (environment variables)
CONCURRENT_USERS=100 \
DURATION_SECONDS=600 \
API_URL=http://localhost:8000 \
node load-test.js

# Production-like load test
CONCURRENT_USERS=200 \
DURATION_SECONDS=1800 \
RAMP_UP_SECONDS=60 \
API_URL=https://api.milonexa.com \
node load-test.js
```

## Test Scenarios

### 1. Authentication Flow (20% weight)
- User login
- Profile retrieval
- Token validation

**Expected Performance:**
- P95 latency: < 200ms
- Error rate: < 0.1%

### 2. Feed Browsing (30% weight)
- Fetch user feed (paginated)
- Scroll through multiple pages
- Cache hit rate monitoring

**Expected Performance:**
- P95 latency: < 300ms
- Throughput: > 100 req/s

### 3. Post Creation & Interaction (25% weight)
- Create new post
- React to post (like)
- Add comment
- View post details

**Expected Performance:**
- Post creation P95: < 400ms
- Reactions P95: < 150ms
- Comments P95: < 300ms

### 4. Search Operations (15% weight)
- Full-text search
- Filter and pagination
- Relevance ranking

**Expected Performance:**
- P95 latency: < 500ms
- Complex queries P95: < 1000ms

### 5. Messaging (10% weight)
- Fetch conversations
- Send messages
- Real-time delivery

**Expected Performance:**
- Message send P95: < 250ms
- Conversation list P95: < 200ms

## Performance Thresholds

```yaml
thresholds:
  error_rate: < 1%
  p50_latency: < 200ms
  p95_latency: < 500ms
  p99_latency: < 1000ms
  throughput: > 100 req/s
  availability: > 99.9%
```

## Load Profiles

### Smoke Test (Quick Validation)
- Duration: 60s
- Users: 5-10 concurrent
- Purpose: Verify basic functionality

```bash
artillery quick --duration 60 --rate 5 http://localhost:8000
```

### Baseline Test (Normal Load)
- Duration: 5 minutes
- Ramp-up: 30s
- Peak: 50 concurrent users
- Purpose: Establish baseline metrics

### Stress Test (Peak Load)
- Duration: 15 minutes
- Ramp-up: 2 minutes
- Peak: 200-500 concurrent users
- Purpose: Identify breaking points

### Soak Test (Endurance)
- Duration: 2-6 hours
- Sustained: 50-100 concurrent users
- Purpose: Detect memory leaks, resource exhaustion

```bash
CONCURRENT_USERS=100 \
DURATION_SECONDS=21600 \
node load-test.js
```

## Metrics Collection

### Key Metrics

1. **Latency Distribution**
   - Minimum, Maximum
   - Mean, Median (P50)
   - P95, P99 (tail latencies)

2. **Throughput**
   - Requests per second
   - Successful vs failed requests

3. **Error Analysis**
   - Error rate by endpoint
   - Error types (4xx, 5xx)
   - Timeout occurrences

4. **Resource Utilization**
   - CPU usage
   - Memory consumption
   - Database connections
   - Cache hit rate

### Monitoring During Tests

Use Grafana dashboards to monitor:
- Service health
- Response times
- Error rates
- Circuit breaker states
- Database performance
- Cache efficiency

## Interpreting Results

### Good Performance Indicators
✅ Error rate < 1%
✅ P95 latency < 500ms
✅ Throughput meets expected load
✅ No timeout errors
✅ Stable resource utilization

### Warning Signs
⚠️ Error rate 1-5%
⚠️ P95 latency 500-1000ms
⚠️ Increasing response times over duration
⚠️ Memory/CPU steadily climbing

### Critical Issues
❌ Error rate > 5%
❌ P95 latency > 1000ms
❌ Circuit breakers opening
❌ Database connection pool exhausted
❌ OOM errors

## Performance Tuning Guide

### If Response Times Are High

1. **Check Database Performance**
   ```sql
   -- Run slow query analysis
   SELECT * FROM pg_stat_statements 
   WHERE mean_exec_time > 100 
   ORDER BY mean_exec_time DESC;
   ```

2. **Verify Cache Hit Rates**
   ```bash
   redis-cli INFO stats | grep hit
   ```

3. **Review Index Usage**
   ```sql
   -- Check for missing indexes
   SELECT * FROM v_index_usage WHERE scans = 0;
   ```

### If Error Rates Are High

1. **Check Service Health**
   - Review circuit breaker states
   - Check service logs for errors
   - Verify database connections

2. **Review Rate Limiting**
   - Adjust rate limit thresholds
   - Implement retry logic

3. **Scale Services**
   - Increase replica count
   - Add horizontal scaling

### If Memory Usage Grows

1. **Check for Memory Leaks**
   - Review long-running processes
   - Monitor heap snapshots

2. **Optimize Caching**
   - Review TTL policies
   - Implement cache eviction

## Test Data Setup

Before running load tests, ensure test data is prepared:

```bash
# Run database seeding script
node scripts/seed-test-data.js

# Create test users
npm run create-test-users -- --count=100

# Generate sample posts
npm run generate-sample-content
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Performance Tests
  run: |
    artillery run tests/performance/artillery-config.yml
    
- name: Upload Results
  uses: actions/upload-artifact@v3
  with:
    name: performance-report
    path: report.json
```

### Performance Regression Detection

```bash
# Compare with baseline
artillery run --output current.json artillery-config.yml
node scripts/compare-performance.js baseline.json current.json
```

## Best Practices

1. **Test Preparation**
   - Use isolated test environment
   - Reset database to known state
   - Clear caches before tests

2. **Test Execution**
   - Ramp up gradually
   - Run multiple iterations
   - Monitor system during tests

3. **Result Analysis**
   - Compare against baselines
   - Identify regressions early
   - Track metrics over time

4. **Production Testing**
   - Use read-only operations where possible
   - Test during low-traffic periods
   - Have rollback plan ready

## Troubleshooting

### Test Fails to Start
- Verify API is accessible
- Check network connectivity
- Validate test user credentials

### Inconsistent Results
- Ensure consistent test environment
- Check for external factors (network latency)
- Run multiple iterations and average

### Out of Memory
- Reduce concurrent users
- Increase ramp-up time
- Monitor Node.js heap size

## Resources

- [Artillery Documentation](https://www.artillery.io/docs)
- [Performance Testing Best Practices](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Grafana Dashboards](../deploy/monitoring/README.md)

## Support

For questions or issues:
- Check system metrics in Grafana
- Review service logs
- Consult the development team

---

Last updated: March 10, 2026 - Phase 3 completion
