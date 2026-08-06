module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__test__/**/*.test.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'commonjs' } }] }
};
