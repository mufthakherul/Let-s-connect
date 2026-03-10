# Monitoring Stack - Prometheus & Grafana

## Overview

This directory contains the complete observability stack for Milonexa:
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alert routing and notifications
- **Exporters**: System, database, and application metrics

## Quick Start

### Docker Compose Deployment

1. **Set environment variables** (create `.env` file):
```bash
# Grafana
GRAFANA_ADMIN_PASSWORD=your-secure-password

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-db-password
POSTGRES_DB=milonexa

# Redis
REDIS_PASSWORD=your-redis-password

# Alerting
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_FROM=alerts@milonexa.com
SMTP_USERNAME=your-email
SMTP_PASSWORD=your-smtp-password
ALERT_EMAIL=ops@milonexa.com
CRITICAL_ALERT_EMAIL=critical-ops@milonexa.com
```

2. **Start monitoring stack**:
```bash
cd deploy/monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

3. **Access dashboards**:
- Grafana: http://localhost:3000 (admin / your-password)
- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093

### Kubernetes Deployment

1. **Create namespace**:
```bash
kubectl create namespace milonexa-monitoring
```

2. **Apply configurations**:
```bash
kubectl apply -f k8s/prometheus.yaml
kubectl apply -f k8s/grafana.yaml
```

3. **Port forward** (for local access):
```bash
kubectl port-forward -n milonexa-monitoring svc/grafana 3000:3000
kubectl port-forward -n milonexa-monitoring svc/prometheus 9090:9090
```

## Architecture

### Metrics Collection

- **API Gateway**: Request rate, response times, error rates, circuit breaker states
- **Microservices**: Health status, endpoint metrics, business events
- **Database**: Connection pool, query performance, transaction rates
- **Redis**: Memory usage, command statistics, keyspace info
- **System**: CPU, memory, disk, network metrics
- **Containers**: Resource usage, container health

### Alert Rules

Located in `alerts/service-alerts.yml`:
- **Service Health**: Down services, high error rates
- **Performance**: Slow response times, circuit breaker opens
- **Resources**: High CPU/memory, disk space warnings
- **Database**: Connection pool exhaustion, slow queries
- **Business**: Low registration rates, high failed logins

### Dashboards

Located in `grafana-dashboards/`:
- **system-overview.json**: High-level system health and performance
- Custom dashboards can be added and auto-provisioned

## Configuration

### Prometheus Configuration

`prometheus.yml` defines:
- Scrape intervals (10-30s based on target)
- Service discovery targets
- Metric relabeling rules
- Alerting rules

### Grafana Configuration

- **Data Sources**: Auto-configured to use Prometheus
- **Dashboards**: Auto-provisioned from JSON files
- **Plugins**: Pre-installed for enhanced visualizations

### Alertmanager Configuration

`alertmanager.yml` defines:
- Alert routing by severity
- Email notification templates
- Inhibition rules to prevent alert storms

## Monitoring Endpoints

Each service should expose `/metrics` endpoint in Prometheus format:

```javascript
// Example Node.js service integration
const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## Alert Severity Levels

- **Critical**: Immediate action required (service down, circuit breaker open)
- **Warning**: Attention needed soon (high response time, resource pressure)
- **Info**: Informational (low registration rate, trends)

## Retention Policies

- **Prometheus**: 30 days of metrics (configurable)
- **Grafana**: Historical dashboard data via Prometheus
- **Alertmanager**: Alerts grouped and deduplicated

## Troubleshooting

### Prometheus Not Scraping

1. Check target status: http://localhost:9090/targets
2. Verify service health endpoints are accessible
3. Check firewall rules and network connectivity

### Grafana Dashboards Not Loading

1. Verify Prometheus data source connection
2. Check dashboard JSON syntax
3. Ensure metric names match Prometheus labels

### Alerts Not Firing

1. Check alert rules in Prometheus UI
2. Verify Alertmanager configuration
3. Test SMTP settings

### High Cardinality Issues

If Prometheus is slow or out of memory:
1. Review metric labels (avoid high-cardinality labels like user IDs)
2. Increase scrape intervals for less critical targets
3. Adjust retention period

## Best Practices

1. **Label Consistency**: Use consistent label names across services
2. **Metric Naming**: Follow Prometheus naming conventions (suffix with `_total`, `_seconds`, etc.)
3. **Dashboard Organization**: Group related panels, use variables for flexibility
4. **Alert Fatigue**: Fine-tune thresholds to reduce false positives
5. **Security**: Use authentication for Grafana, restrict Prometheus access

## Integration with Services

To add metrics to a new service:

1. Install Prometheus client library
2. Expose `/metrics` endpoint
3. Add service to `prometheus.yml` scrape configs
4. Restart Prometheus: `docker-compose -f docker-compose.monitoring.yml restart prometheus`

## Scaling Considerations

For production deployments:
- Use Prometheus federation for multi-cluster setups
- Consider Thanos for long-term storage
- Use recording rules to pre-compute expensive queries
- Implement sharding for high-volume metrics

## Support & Documentation

- Prometheus: https://prometheus.io/docs/
- Grafana: https://grafana.com/docs/
- Node Exporter: https://github.com/prometheus/node_exporter
- Postgres Exporter: https://github.com/prometheus-community/postgres_exporter

## Changelog

- **March 10, 2026**: Initial setup with Prometheus, Grafana, Alertmanager
- Phase 2 observability expansion complete
