// Test setup for messaging schema integrity tests
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Global test timeout for property-based tests
jest.setTimeout(60000);

// Suppress console warnings during tests unless in verbose mode
if (!process.env.VERBOSE_TESTS) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (!args[0]?.includes?.('Cleanup warning')) {
      originalWarn(...args);
    }
  };
}

// Global teardown - close database connections after all tests
afterAll(async () => {
  // Give async operations time to complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    const { closeDatabase } = require('../config/database');
    await closeDatabase();
  } catch (error) {
    // Database might not be initialized in all test files
    if (process.env.VERBOSE_TESTS) {
      console.log('ℹ️ Database cleanup skipped (not initialized)');
    }
  }
  
  // Clear any remaining timers
  jest.clearAllTimers();
});