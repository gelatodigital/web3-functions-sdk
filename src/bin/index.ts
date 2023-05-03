#! /usr/bin/env node
import * as semver from "semver";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require("../../package.json");
import colors from "colors/safe";

const KO = colors.red("✗");

const verifyNodeVersionAndRun = async () => {
  const supportedNodeVersionRange = packageJson.engines.node;
  const currentVersion = process.version;
  if (!semver.satisfies(currentVersion, supportedNodeVersionRange)) {
    console.error(
      `${KO}: You are using Node.js version ${currentVersion}, but w3f CLI requires Node.js version ${supportedNodeVersionRange}. Please upgrade your Node.js version.`
    );
  } else await runCliCommand();
};

const runCliCommand = async () => {
  const command = process.argv[2];

  const benchmark = await import("../lib/binaries/benchmark");
  const fetch = await import("../lib/binaries/fetch");
  const deploy = await import("../lib/binaries/deploy");
  const schema = await import("../lib/binaries/schema");
  const test = await import("../lib/binaries/test");

  switch (command) {
    case "test":
      test
        .default()
        .catch((err) =>
          console.error(` ${KO} Error running Web3Function: ${err.message}`)
        );
      break;
    case "benchmark":
      benchmark
        .default()
        .catch((err) =>
          console.error(` ${KO} Error running benchmark: ${err.message}`)
        );
      break;
    case "fetch":
      fetch
        .default()
        .catch((err) =>
          console.error(` ${KO} Fetching Web3Function failed: ${err.message}`)
        );
      break;
    case "deploy":
      deploy
        .default()
        .catch((err) =>
          console.error(` ${KO} Deploying Web3Function failed: ${err.message}`)
        );
      break;
    case "schema":
      schema
        .default()
        .catch((err) =>
          console.error(` ${KO} Fetching schema failed: ${err.message}`)
        );
      break;
    default:
      console.error(` ${KO} Unknown command: ${command}`);
  }
};

verifyNodeVersionAndRun();
