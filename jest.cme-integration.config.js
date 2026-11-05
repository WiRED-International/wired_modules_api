'use strict';

module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/integration/**/*.integration.test.js'],
  setupFiles: [
    '<rootDir>/tests/integration/jest.setup.js',
    '<rootDir>/tests/jest.setup.js',
  ],
  automock: false,
  resetModules: false,
  maxWorkers: 1,
};
