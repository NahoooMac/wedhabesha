module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'services/**/*.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  testTimeout: 60000, // 60 seconds for property-based tests
  verbose: true,
  // Set NODE_ENV to test to suppress query logging
  setupFiles: ['<rootDir>/tests/jest.env.js'],
  // Force exit after tests complete
  forceExit: true,
  // Detect open handles
  detectOpenHandles: false
};