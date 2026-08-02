module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // The suite shares one Postgres database, so parallel workers would
  // truncate each other's rows mid-test.
  maxWorkers: 1,
  testTimeout: 20000,
};
