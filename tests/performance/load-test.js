#!/usr/bin/env node

/**
 * Performance Testing Script for Milonexa
 * Phase 3 - Data & Scale
 * 
 * Node.js based performance testing utility
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// ===================================================================
// CONFIGURATION
// ===================================================================

const CONFIG = {
  baseURL: process.env.API_URL || 'http://localhost:8000',
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS || '50'),
  duration: parseInt(process.env.DURATION_SECONDS || '300'),
  rampUp: parseInt(process.env.RAMP_UP_SECONDS || '30'),
  
  testUsers: [
    { email: 'test1@example.com', password: 'TestPass123!' },
    { email: 'test2@example.com', password: 'TestPass123!' },
    { email: 'test3@example.com', password: 'TestPass123!' },
    { email: 'test4@example.com', password: 'TestPass123!' },
    { email: 'test5@example.com', password: 'TestPass123!' },
  ],

  thresholds: {
    maxErrorRate: 0.01,      // 1%
    p95ResponseTime: 500,    // 500ms
    p99ResponseTime: 1000,   // 1000ms
    minThroughput: 100       // requests per second
  }
};

// ===================================================================
// METRICS COLLECTOR
// ===================================================================

class MetricsCollector {
  constructor() {
    this.requests = [];
    this.errors = [];
    this.startTime = null;
  }

  start() {
    this.startTime = Date.now();
  }

  recordRequest(endpoint, duration, status, error = null) {
    this.requests.push({
      endpoint,
      duration,
      status,
      timestamp: Date.now(),
      error: error ? error.message : null
    });

    if (error || status >= 400) {
      this.errors.push({ endpoint, status, error, timestamp: Date.now() });
    }
  }

  getStats() {
    const durations = this.requests.map(r => r.duration).sort((a, b) => a - b);
    const totalRequests = this.requests.length;
    const totalErrors = this.errors.length;
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;

    return {
      totalRequests,
      totalErrors,
      errorRate: totalErrors / totalRequests,
      throughput: totalRequests / elapsedSeconds,
      
      latency: {
        min: durations[0],
        max: durations[durations.length - 1],
        mean: durations.reduce((a, b) => a + b, 0) / durations.length,
        p50: durations[Math.floor(durations.length * 0.50)],
        p95: durations[Math.floor(durations.length * 0.95)],
        p99: durations[Math.floor(durations.length * 0.99)],
      },

      duration: elapsedSeconds
    };
  }

  printReport() {
    const stats = this.getStats();
    
    console.log('\n========================================');
    console.log('PERFORMANCE TEST REPORT');
    console.log('========================================\n');
    
    console.log(`Duration: ${stats.duration.toFixed(2)}s`);
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Total Errors: ${stats.totalErrors}`);
    console.log(`Error Rate: ${(stats.errorRate * 100).toFixed(2)}%`);
    console.log(`Throughput: ${stats.throughput.toFixed(2)} req/s`);
    
    console.log('\nLatency:');
    console.log(`  Min: ${stats.latency.min.toFixed(2)}ms`);
    console.log(`  Mean: ${stats.latency.mean.toFixed(2)}ms`);
    console.log(`  P50: ${stats.latency.p50.toFixed(2)}ms`);
    console.log(`  P95: ${stats.latency.p95.toFixed(2)}ms`);
    console.log(`  P99: ${stats.latency.p99.toFixed(2)}ms`);
    console.log(`  Max: ${stats.latency.max.toFixed(2)}ms`);
    
    console.log('\nThreshold Validation:');
    const checks = [
      {
        name: 'Error Rate',
        pass: stats.errorRate <= CONFIG.thresholds.maxErrorRate,
        actual: `${(stats.errorRate * 100).toFixed(2)}%`,
        expected: `<= ${(CONFIG.thresholds.maxErrorRate * 100).toFixed(2)}%`
      },
      {
        name: 'P95 Response Time',
        pass: stats.latency.p95 <= CONFIG.thresholds.p95ResponseTime,
        actual: `${stats.latency.p95.toFixed(2)}ms`,
        expected: `<= ${CONFIG.thresholds.p95ResponseTime}ms`
      },
      {
        name: 'P99 Response Time',
        pass: stats.latency.p99 <= CONFIG.thresholds.p99ResponseTime,
        actual: `${stats.latency.p99.toFixed(2)}ms`,
        expected: `<= ${CONFIG.thresholds.p99ResponseTime}ms`
      },
      {
        name: 'Throughput',
        pass: stats.throughput >= CONFIG.thresholds.minThroughput,
        actual: `${stats.throughput.toFixed(2)} req/s`,
        expected: `>= ${CONFIG.thresholds.minThroughput} req/s`
      }
    ];

    checks.forEach(check => {
      const status = check.pass ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${status} - ${check.name}: ${check.actual} (expected ${check.expected})`);
    });

    const allPassed = checks.every(c => c.pass);
    console.log(`\nOverall: ${allPassed ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}\n`);

    return allPassed;
  }
}

// ===================================================================
// VIRTUAL USER
// ===================================================================

class VirtualUser {
  constructor(id, metrics) {
    this.id = id;
    this.metrics = metrics;
    this.authToken = null;
    this.client = axios.create({
      baseURL: CONFIG.baseURL,
      timeout: 30000
    });
  }

  async request(method, url, data = null, headers = {}) {
    const start = performance.now();
    
    try {
      const config = { method, url, headers };
      if (data) config.data = data;
      
      const response = await this.client.request(config);
      const duration = performance.now() - start;
      
      this.metrics.recordRequest(url, duration, response.status);
      
      return response.data;
    } catch (error) {
      const duration = performance.now() - start;
      const status = error.response?.status || 0;
      
      this.metrics.recordRequest(url, duration, status, error);
      
      throw error;
    }
  }

  async login() {
    const user = CONFIG.testUsers[this.id % CONFIG.testUsers.length];
    
    try {
      const data = await this.request('POST', '/user/login', user);
      this.authToken = data.token;
      return true;
    } catch (error) {
      console.error(`User ${this.id} login failed:`, error.message);
      return false;
    }
  }

  getAuthHeaders() {
    return this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {};
  }

  async browseFeed() {
    try {
      await this.request('GET', '/content/feed?page=1&limit=20', null, this.getAuthHeaders());
      await this.sleep(Math.random() * 2000); // Simulate read time
    } catch (error) {
      // Error already recorded
    }
  }

  async createPost() {
    try {
      const post = await this.request('POST', '/content/posts', {
        content: `Test post from user ${this.id} at ${Date.now()}`,
        visibility: 'public'
      }, this.getAuthHeaders());

      await this.sleep(500);
      
      // React to own post
      if (post.post?.id) {
        await this.request('POST', `/content/posts/${post.post.id}/react`, {
          type: 'like'
        }, this.getAuthHeaders());
      }
    } catch (error) {
      // Error already recorded
    }
  }

  async search() {
    try {
      await this.request('GET', '/content/search?q=test&type=posts&page=1');
    } catch (error) {
      // Error already recorded
    }
  }

  async getUserProfile() {
    try {
      await this.request('GET', '/user/profile', null, this.getAuthHeaders());
    } catch (error) {
      // Error already recorded
    }
  }

  async run(durationMs) {
    // Login first
    const loggedIn = await this.login();
    if (!loggedIn) return;

    const endTime = Date.now() + durationMs;
    
    // Simulate user behavior
    while (Date.now() < endTime) {
      // Random action selection (weighted)
      const action = Math.random();
      
      if (action < 0.4) {
        await this.browseFeed();
      } else if (action < 0.6) {
        await this.createPost();
      } else if (action < 0.8) {
        await this.getUserProfile();
      } else {
        await this.search();
      }
      
      // Think time between actions
      await this.sleep(Math.random() * 1000 + 500);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ===================================================================
// TEST ORCHESTRATOR
// ===================================================================

class LoadTestOrchestrator {
  constructor() {
    this.metrics = new MetricsCollector();
    this.users = [];
  }

  async run() {
    console.log('Starting Performance Test...');
    console.log(`Target: ${CONFIG.baseURL}`);
    console.log(`Concurrent Users: ${CONFIG.concurrentUsers}`);
    console.log(`Duration: ${CONFIG.duration}s`);
    console.log(`Ramp-up: ${CONFIG.rampUp}s\n`);

    this.metrics.start();

    // Ramp-up: gradually add users
    const rampUpDelay = (CONFIG.rampUp * 1000) / CONFIG.concurrentUsers;
    
    for (let i = 0; i < CONFIG.concurrentUsers; i++) {
      const user = new VirtualUser(i, this.metrics);
      this.users.push(user);
      
      // Start user session (don't await, run concurrently)
      user.run(CONFIG.duration * 1000).catch(err => {
        console.error(`User ${i} crashed:`, err.message);
      });
      
      // Delay before starting next user (ramp-up)
      if (i < CONFIG.concurrentUsers - 1) {
        await this.sleep(rampUpDelay);
      }
    }

    // Wait for all users to complete
    console.log('All users started, waiting for completion...\n');
    await this.sleep(CONFIG.duration * 1000);

    // Print report
    const passed = this.metrics.printReport();
    
    process.exit(passed ? 0 : 1);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ===================================================================
// MAIN
// ===================================================================

if (require.main === module) {
  const orchestrator = new LoadTestOrchestrator();
  orchestrator.run().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}

module.exports = { LoadTestOrchestrator, VirtualUser, MetricsCollector };
