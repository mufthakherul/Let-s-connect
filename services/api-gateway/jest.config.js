/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.js'],
  collectCoverageFrom: [
    'resilience-config.js',
    '!node_modules/**',
    '!tests/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
