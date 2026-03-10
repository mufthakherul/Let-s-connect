module.exports = {
  displayName: 'critical-path',
  testEnvironment: 'node',
  testMatch: ['**/tests/critical-path/**/*.test.js'],
  collectCoverageFrom: [
    'services/**/src/**/*.js',
    'frontend/src/**/*.js',
    'admin_frontend/src/**/*.js',
    '!**/*.config.js',
    '!**/index.js',
    '!**/__tests__/**'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/dist/',
    '/build/'
  ],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40
    },
    './services/user-service/src/**/*.js': {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    },
    './services/api-gateway/**/*.js': {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'junit-critical-path.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathAsClassName: 'true',
        suiteName: 'Workstream G Critical-Path Tests'
      }
    ]
  ],
  testTimeout: 10000,
  verbose: true
};
