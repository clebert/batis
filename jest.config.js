export default {
  collectCoverage: true,
  coverageThreshold: {
    global: {branches: 100, functions: 100, lines: 100, statements: 100},
  },
  resolver: '<rootDir>/jest.resolver.cjs',
  restoreMocks: true,
  silent: true,
  testMatch: ['**/src/**/*.test.ts'],
  verbose: true,
};
