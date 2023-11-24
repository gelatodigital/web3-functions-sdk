module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  module: "commonjs",
  transform: {},
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.ts"],
  coveragePathIgnorePatterns: [
    "node_modules",
    "jest.config.ts",
    "src/web3-functions",
    "lib/Web3Function.ts",
    "lib/polyfill",
    "hardhat",
    ".d.ts",
    "__test__",
  ],
  testPathIgnorePatterns: ["node_modules", "dist", "lib/binaries"],
  extensionsToTreatAsEsm: [".ts"],
  coverageReporters: ["lcov", "json", "html"],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  setupFilesAfterEnv: ["./jest.setup.ts"],
};
