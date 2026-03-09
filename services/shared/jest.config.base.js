/**
 * Milonexa - Shared Jest Configuration for Backend Services
 * Phase 1: Foundation Testing Infrastructure
 * 
 * Each service can extend this via jest.config.js:
 * module.exports = require('../shared/jest.config.base.js');
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  
  coverageDirectory: 'coverage',
  
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html'
  ],
  
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  
  // Test patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Timeout for tests
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // Force exit after all tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true
};
