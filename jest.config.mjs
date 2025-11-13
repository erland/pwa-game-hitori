// jest.config.mjs
/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // allows nested folders under __tests__
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
  ],
  // ts-jest options
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.spec.json',
      // If your project uses ESM (package.json "type":"module" or TS module ESNext), keep this true.
      useESM: true
    },
  },
};

export default config;