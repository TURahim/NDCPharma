/**
 * Jest Test Setup
 * Configuration and global setup for tests
 */

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.FIREBASE_PROJECT_ID = "ndc-calculator-test";
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.LOG_LEVEL = "error"; // Reduce noise in tests
process.env.ENABLE_REQUEST_LOGGING = "false";

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging test failures
  error: console.error,
};

// Set longer timeout for integration tests
jest.setTimeout(10000);

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

