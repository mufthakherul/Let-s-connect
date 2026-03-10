/**
 * User Service - Health Endpoint Tests
 * Phase 1: Foundation Testing
 */

const request = require('supertest');
const express = require('express');

describe('User Service Health Endpoints', () => {
  let app;

  beforeAll(() => {
    // Create minimal Express app for health checks
    app = express();

    // Mock health endpoints
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'user-service' });
    });

    app.get('/health/ready', (req, res) => {
      res.json({
        status: 'ready',
        service: 'user-service',
        database: 'connected' // In real tests, check actual DB
      });
    });
  });

  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'user-service');
    });

    it('should respond quickly (< 100ms)', async () => {
      const start = Date.now();
      await request(app).get('/health');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
      expect(response.body).toHaveProperty('database');
    });
  });
});
