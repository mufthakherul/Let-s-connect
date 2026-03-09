/**
 * User Service Test Setup
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.INTERNAL_GATEWAY_TOKEN = 'test-gateway-token';
process.env.ADMIN_JWT_SECRET = 'test-admin-jwt-secret';
process.env.ADMIN_API_SECRET = 'test-admin-api-secret';
process.env.LOG_LEVEL = 'error';

// Database config for tests (use test database or mock)
process.env.USER_DB_NAME = 'users_test';
process.env.USER_DB_USER = 'test_user';
process.env.USER_DB_PASSWORD = 'test_password';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';

// Disable database sync in tests
process.env.DB_SCHEMA_MODE = 'skip';

// Global test timeout
jest.setTimeout(10000);

// Cleanup after all tests
afterAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
});
