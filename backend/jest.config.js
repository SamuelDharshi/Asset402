module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  // Test files share one physical local_db.json fixture (the mock-DB
  // fallback) with no file locking — running them across parallel workers
  // races reads/writes on that file. Force serial execution rather than
  // adding ad-hoc locking to a fixture that's only ever meant to back a
  // single-process demo backend.
  maxWorkers: 1,
};
