/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
  // collectCoverageFrom: ["src/**/*.{ts,tsx}"],
  setupFiles: ["<rootDir>/tests/jest.setup.ts"],
};