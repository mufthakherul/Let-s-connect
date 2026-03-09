/**
 * Milonexa - Backend Test Harness Utility
 * Phase 1: Foundation Testing Infrastructure
 * 
 * Provides common utilities for backend service testing with Supertest
 */

const { createRequire } = require('module');

function resolveJsonWebToken() {
  try {
    return require('jsonwebtoken');
  } catch (_error) {
    const cwdRequire = createRequire(`${process.cwd()}/package.json`);
    return cwdRequire('jsonwebtoken');
  }
}

/**
 * Create a test JWT token for authentication
 * @param {Object} payload - Token payload (userId, role, etc.)
 * @param {string} secret - JWT secret (defaults to test secret)
 * @returns {string} JWT token
 */
function createTestToken(payload = {}, secret = 'test-jwt-secret-for-testing') {
  const jwt = resolveJsonWebToken();
  const defaultPayload = {
    userId: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    ...payload
  };
  
  return jwt.sign(defaultPayload, secret, { expiresIn: '1h' });
}

/**
 * Create an admin test token
 * @param {string} secret - JWT secret
 * @returns {string} Admin JWT token
 */
function createAdminToken(secret = 'test-jwt-secret-for-testing') {
  return createTestToken({
    userId: 999,
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    isAdmin: true
  }, secret);
}

/**
 * Create authenticated request headers
 * @param {string} token - JWT token (optional, creates one if not provided)
 * @returns {Object} Headers object with Authorization
 */
function authHeaders(token = null) {
  const authToken = token || createTestToken();
  return {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Create internal service headers (with gateway token)
 * @param {Object} userData - User data to forward
 * @param {string} gatewayToken - Internal gateway token
 * @returns {Object} Headers object with forwarded identity
 */
function internalServiceHeaders(userData = {}, gatewayToken = 'test-gateway-token') {
  return {
    'x-internal-gateway-token': gatewayToken,
    'x-user-id': userData.userId?.toString() || '1',
    'x-user-role': userData.role || 'user',
    'x-user-email': userData.email || 'test@example.com',
    'Content-Type': 'application/json'
  };
}

/**
 * Test helper to wait for async operations
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a Supertest agent for testing an Express app
 * @param {Object} app - Express app instance
 * @returns {Object} Supertest agent
 */
function createTestAgent(app) {
  let supertest;
  try {
    supertest = require('supertest');
  } catch (_error) {
    const cwdRequire = createRequire(`${process.cwd()}/`);
    supertest = cwdRequire('supertest');
  }

  return supertest(app);
}

/**
 * Common test data generators
 */
const testData = {
  user: (overrides = {}) => ({
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    displayName: 'Test User',
    ...overrides
  }),
  
  post: (overrides = {}) => ({
    content: 'This is a test post content',
    type: 'text',
    visibility: 'public',
    ...overrides
  }),
  
  comment: (overrides = {}) => ({
    content: 'This is a test comment',
    ...overrides
  }),
  
  message: (overrides = {}) => ({
    content: 'This is a test message',
    recipientId: 2,
    ...overrides
  })
};

/**
 * Assert response structure helpers
 */
const assertions = {
  /**
   * Assert response is successful
   */
  isSuccess: (response) => {
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
  },
  
  /**
   * Assert response has error
   */
  isError: (response) => {
    expect(response.status).toBeGreaterThanOrEqual(400);
  },
  
  /**
   * Assert response has specific status
   */
  hasStatus: (response, status) => {
    expect(response.status).toBe(status);
  },
  
  /**
   * Assert response body has data field
   */
  hasData: (response) => {
    expect(response.body).toHaveProperty('data');
  },
  
  /**
   * Assert response body has error field
   */
  hasError: (response) => {
    expect(response.body).toHaveProperty('error');
  }
};

module.exports = {
  createTestToken,
  createAdminToken,
  authHeaders,
  internalServiceHeaders,
  sleep,
  createTestAgent,
  testData,
  assertions
};
