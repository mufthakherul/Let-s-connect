/**
 * Milonexa - Test Setup
 * Runs before all tests in a service
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.INTERNAL_GATEWAY_TOKEN = 'test-gateway-token';
process.env.LOG_LEVEL = 'error'; // Reduce noise in test output

// Mock console to reduce test output noise (optional)
// Uncomment if you want cleaner test output
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Close any open database connections
  // Add cleanup logic here as needed
  await new Promise(resolve => setTimeout(resolve, 100));
});
