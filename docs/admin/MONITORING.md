# Monitoring and Observability Guide

Complete guide for system monitoring, metrics, alerts, SLA tracking, and anomaly detection.

## System Health Overview

### Health Check Endpoint
```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-15T15:45:00Z",
  "services": {
    "api-gateway": { "status": "up", "latency": 45 },
    "user-service": { "status": "up", "latency": 89 },
    "content-service": { "status": "up", "latency": 123 },
    "database": { "status": "up", "latency": 12 },
    "redis": { "status": "up", "latency": 3 }
  }
}
```

**Status codes**:
- healthy: All services up
- degraded: Some services down or slow (>2s latency)
- unhealthy: Critical services down

### Web Dashboard
**Dashboard → Overview tab** shows:
- Overall health status (green/yellow/red)
- Service status grid
- Key metrics cards
- Recent alerts

## Prometheus Metrics

### Accessing Metrics
```bash
curl http://localhost:8000/api/admin/metrics
```

Returns Prometheus format metrics.

### Key Metrics Tracked

**HTTP Requests**:
- `http_requests_total`: Total requests counter
- `http_request_duration_seconds`: Request latency histogram
- `http_requests_in_progress`: Active requests gauge
- `http_requests_by_status`: Breakdown by status code (2xx, 4xx, 5xx)

**Latency Percentiles**:
- p50 (median latency)
- p95 (95th percentile)
- p99 (99th percentile)
- Example: p99=2500ms means 99% of requests complete in 2.5s or less

**Database**:
- `db_connection_pool_size`: Total connections available
- `db_connections_active`: Currently active connections
- `db_query_duration_seconds`: Query execution time
- `db_connection_errors`: Failed connection attempts

**Redis**:
- `redis_memory_bytes`: Memory used
- `redis_commands_processed_total`: Commands executed
- `redis_hit_rate`: Cache hit percentage
- `redis_connected_clients`: Active connections

**WebSockets**:
- `websocket_connections_active`: Connected clients
- `websocket_messages_sent_total`: Messages sent
- `websocket_messages_received_total`: Messages received

**Queues**:
- `queue_depth`: Messages waiting in queue
- `queue_processing_time`: Time to process message
- `queue_error_rate`: Percentage of failed processing

**System**:
- `process_cpu_seconds_total`: CPU usage
- `process_resident_memory_bytes`: Memory usage
- `process_open_fds`: Open file descriptors
- `disk_space_bytes`: Available disk space

### Scraping Metrics
Configure Prometheus to scrape metrics:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'milonexa'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/api/admin/metrics'
    scrape_interval: 15s
```

Then query in Prometheus:
```
http_request_duration_seconds{job="milonexa"}
rate(http_requests_total[5m])
histogram_quantile(0.95, http_request_duration_seconds_bucket)
```

## Alert Thresholds

### Default Alerts

**Service Down** (Critical):
- No responses for 5 minutes
- Triggers: Page on-call, email to ops team

**High Error Rate** (High):
- >5% of requests returning 5xx errors
- Duration: 10 minutes
- Triggers: Slack alert, ticket creation

**High Latency** (High):
- p95 latency > 2000ms
- Duration: 10 minutes
- Triggers: Slack alert, investigation recommended

**Memory Usage** (Medium):
- >90% of service memory limit
- Duration: 5 minutes
- Triggers: Email alert, scale up if autoscaling available

**Disk Space** (High):
- >90% of disk used
- Triggers: Immediate notification, cleanup recommended

**Database Connections** (Medium):
- >80% of connection pool used
- Indicates potential connection leak
- Triggers: Investigate and possibly restart service

### Configuring Thresholds

**Web Dashboard**: Settings → Alerts

1. Click alert to edit
2. Modify threshold values
3. Enable/disable alert
4. Configure notification channels
5. Save

**REST API**:
```bash
PUT /api/admin/alerts/high_error_rate
{
  "threshold": 0.08,
  "duration": "10m",
  "enabled": true,
  "notificationChannels": ["slack", "email"]
}
```

## SLA Monitoring

### Service Level Agreements
Define expected uptime and performance:

**Example SLAs**:
- API Gateway: 99.9% uptime (8.64 hours downtime/month max)
- User Service: 99.5% uptime
- Content Service: 99% uptime

### Metrics Tracked

**Uptime %**:
- Calculated from health check successes
- Excludes scheduled maintenance
- Measured per service and overall

**MTTR** (Mean Time To Recovery):
- Average time from incident start to resolution
- Example: 15 minutes average recovery time

**MTTF** (Mean Time To Failure):
- Average time between incidents
- Example: 1000 hours between failures = very reliable

**Incidents**:
- Count of outages per month
- Severity (minor, major, critical)
- Root cause tracking

### SLA Breach Prediction

ML model predicts SLA breaches 30 minutes in advance by analyzing:
- Current error rate trend
- Latency trend
- Historical incident patterns
- Pending deployments/changes
- Resource utilization

**When prediction indicates high breach risk**:
- Alerts team
- Recommends mitigation actions
- May trigger automatic scaling

### SLA Report
**Web Dashboard**: Monitoring → SLA

Shows:
- Uptime % for each service (current month)
- Trend vs previous months
- Incidents this month
- MTTR and MTTF
- Predictions for rest of month
- Breach history (if any)

## Grafana Dashboards

Optional Grafana integration (if enabled at startup):
- Access at http://localhost:3002
- Pre-built dashboards:
  - System Overview
  - Service Details
  - Database Metrics
  - Traffic Analysis
  - Error Analysis

### Creating Custom Dashboards
1. Login to Grafana
2. Click "+" → Dashboard
3. Add panels with Prometheus queries
4. Example queries:
   - `rate(http_requests_total[5m])` - request rate
   - `histogram_quantile(0.95, http_request_duration_seconds_bucket)` - p95 latency
   - `(max_over_time(process_resident_memory_bytes[5m]) / 1024 / 1024)` - memory in MB

## Structured Logging

### Log Format
All services output structured JSON logs:

```json
{
  "timestamp": "2024-12-15T15:45:00.123Z",
  "level": "info",
  "service": "api-gateway",
  "requestId": "req-12345",
  "message": "User login successful",
  "userId": "f47ac10b",
  "duration_ms": 145,
  "ip": "192.168.1.100"
}
```

### Log Levels
- **debug**: Detailed information for debugging
- **info**: General informational messages
- **warn**: Warning messages (recoverable issues)
- **error**: Errors that need investigation
- **fatal**: Critical errors, service will crash

### Searching Logs

**Web Dashboard**: Audit Log tab or Logs tab
- Filter by level, service, date range
- Search message content
- View request IDs to trace full request

**CLI**:
```bash
milonexa> system logs api-gateway --level error --follow
```

**Elasticsearch** (if configured):
```
GET logs-milonexa/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "service": "api-gateway" } },
        { "match": { "level": "error" } },
        { "range": { "timestamp": { "gte": "2024-12-15" } } }
      ]
    }
  }
}
```

## Anomaly Detection

### How It Works
Statistical baseline + ML model detects unusual patterns:

1. Calculate baseline for each metric (e.g., normal request latency distribution)
2. For each new data point, calculate anomaly score
3. If score exceeds threshold, flag as anomaly
4. ML model trained on historical patterns for better accuracy

### Detection Types

**Performance Anomalies**:
- Sudden latency spike
- Error rate increase
- Throughput drop

**Security Anomalies**:
- Unusual login patterns (brute force, impossible travel)
- Elevated report of same content
- Spam/bot-like behavior

**Resource Anomalies**:
- Memory leak (gradual increase)
- Disk space spike
- CPU spike

**Cost Anomalies**:
- Unexpectedly high bills
- Increased API calls
- Unusual data transfer

### Web Dashboard
**Monitoring → Anomaly Tab**

Shows:
- Detected anomalies (last 7 days)
- Severity (low/medium/high)
- Affected metric/service
- Timeline showing normal vs anomalous
- Recommended action
- ML model confidence

### Investigating Anomalies

1. Click anomaly to view details
2. See timeline and charts
3. Drill into related metrics
4. Check logs around incident time
5. Review service changes/deployments
6. Either dismiss (false positive) or act

## Alert Channels

### Email
- Recipient: configured in Settings
- Frequency: immediate or digest (daily/weekly)
- Includes alert details and remediation suggestions

### Slack
- Configure webhook URL in Settings
- Alerts post to channel
- Can configure per alert which channel to notify
- Includes quick action buttons (acknowledge, resolve)

### PagerDuty
- Integration for on-call incident management
- Critical alerts create incidents
- Routes to on-call engineer
- Tracks escalation and resolution

### Teams
- Similar to Slack integration
- Posts alerts to Teams channel
- Rich formatting

### Webhooks
- Custom HTTP endpoint
- Milonexa posts alert JSON
- You handle notification
- Useful for custom integrations

## Cost Monitoring

### Per-Service Costs
Track costs by service:
- Compute (CPU, memory)
- Storage (databases, cache)
- Networking (data transfer)
- Third-party services

### Monthly Trends
- Compare this month to previous months
- Identify cost spikes
- Project end-of-month total

### Budget Alerts
Set spending limit:
- Alert when approaching budget
- Alert when budget exceeded
- Useful for cost control

## Performance Optimization Tips

### Based on Metrics
- High database query time? Add indexes, optimize queries
- High memory usage? Check for leaks, increase limits
- High error rate? Investigate failing endpoint, check dependencies
- High latency? Check CPU usage, database bottlenecks, network

### Caching Strategy
- Look at Redis hit rate
- Low hit rate? Adjust cache TTL, review cache keys
- High memory usage? Consider eviction policy

### Scaling Decisions
- Growing request rate? Scale horizontally (more instances)
- Growing data? Scale storage vertically (bigger disks)
- High latency? Scale compute (better hardware)

---

Last Updated: 2024 | Milonexa Platform Documentation
