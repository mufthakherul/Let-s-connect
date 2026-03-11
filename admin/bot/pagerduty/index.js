'use strict';
/**
 * PagerDuty Integration for Milonexa Admin
 * 
 * Sends alerts and incidents to PagerDuty via Events API v2
 * Requires: PAGERDUTY_ROUTING_KEY env var
 */

const https = require('https');

class PagerDutyClient {
  constructor(routingKey) {
    this.routingKey = routingKey || process.env.PAGERDUTY_ROUTING_KEY;
    this.apiBase = 'events.pagerduty.com';
  }

  // Send an event to PagerDuty
  async sendEvent({ action, severity, summary, source, component, group, class: eventClass, customDetails, dedupKey }) {
    // action: trigger | acknowledge | resolve
    // severity: critical | error | warning | info
    const payload = {
      routing_key: this.routingKey,
      event_action: action || 'trigger',
      dedup_key: dedupKey,
      payload: {
        summary: summary || 'Admin alert',
        severity: severity || 'warning',
        source: source || 'milonexa-admin',
        component: component,
        group: group,
        class: eventClass,
        custom_details: customDetails
      }
    };
    return this._post('/v2/enqueue', payload);
  }

  // Trigger a new incident
  async triggerIncident({ summary, severity, source, component, details, dedupKey }) {
    return this.sendEvent({ action: 'trigger', severity, summary, source, component, customDetails: details, dedupKey });
  }

  // Acknowledge an incident
  async acknowledgeIncident(dedupKey) {
    return this.sendEvent({ action: 'acknowledge', dedupKey });
  }

  // Resolve an incident
  async resolveIncident(dedupKey) {
    return this.sendEvent({ action: 'resolve', dedupKey });
  }

  // Test connectivity
  async test() {
    return this.triggerIncident({
      summary: 'Milonexa Admin Panel - Test Alert',
      severity: 'info',
      source: 'milonexa-admin-test',
      details: { test: true, timestamp: new Date().toISOString() },
      dedupKey: `test-${Date.now()}`
    });
  }

  _post(path, body) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const options = {
        hostname: this.apiBase,
        port: 443,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };
      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true, status: res.statusCode, data: parsed });
            } else {
              resolve({ success: false, status: res.statusCode, data: parsed });
            }
          } catch (_) {
            resolve({ success: false, status: res.statusCode, raw: responseData });
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}

// Standalone CLI usage: node index.js trigger "Service down" critical
if (require.main === module) {
  const [,, action, summary, severity] = process.argv;
  const client = new PagerDutyClient();
  
  if (!client.routingKey) {
    console.error('Error: PAGERDUTY_ROUTING_KEY environment variable is not set');
    process.exit(1);
  }

  const run = async () => {
    if (action === 'test') {
      const result = await client.test();
      console.log('Test result:', JSON.stringify(result, null, 2));
    } else if (action === 'trigger') {
      const result = await client.triggerIncident({
        summary: summary || 'Admin alert',
        severity: severity || 'warning',
        source: 'milonexa-admin-cli'
      });
      console.log('Trigger result:', JSON.stringify(result, null, 2));
    } else {
      console.log('Usage: node index.js [test|trigger] [summary] [severity]');
    }
  };

  run().catch(console.error);
}

module.exports = { PagerDutyClient };
