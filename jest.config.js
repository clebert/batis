module.exports = {
  silent: true,
  verbose: true,
  collectCoverage: true,
  coverageThreshold: {
    global: {branches: 100, functions: 100, lines: 100, statements: 100},
  },
  testMatch: ['**/src/**/*.test.ts'],
  restoreMocks: true,
};
