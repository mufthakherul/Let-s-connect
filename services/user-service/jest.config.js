/**
 * Jest configuration for user-service
 * Extends the shared base configuration
 */

const baseConfig = require('../shared/jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'user-service',
  rootDir: './',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
