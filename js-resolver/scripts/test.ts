import "dotenv/config";
import colors from "colors/safe";
import { JsResolverContextData, JsResolverBuilder } from "../lib";
import { JsResolverRunner } from "../lib/runtime";

const jsResolverSrcPath = process.argv[2] ?? "./src/resolvers/index.ts";

let runtime: "docker" | "thread" = "docker";
let debug = false;
let showLogs = false;
const inputUserArgs: { [key: string]: string } = {};
if (process.argv.length > 2) {
  process.argv.slice(3).forEach((arg) => {
    if (arg.startsWith("--debug")) {
      debug = true;
    } else if (arg.startsWith("--show-logs")) {
      showLogs = true;
    } else if (arg.startsWith("--runtime=")) {
      const type = arg.split("=")[1];
      runtime = type === "thread" ? "thread" : "docker";
    } else if (arg.startsWith("--user-args=")) {
      const userArgParts = arg.split("=")[1].split(":");
      if (userArgParts.length < 2) {
        console.error("Invalid user-args:", arg);
        console.error("Please use format: --user-args=[key]:[value]");
        process.exit(1);
      }
      const key = userArgParts.shift() as string;
      const value = userArgParts.join(":");
      inputUserArgs[key] = value;
    }
  });
}

const OK = colors.green("✓");
const KO = colors.red("✗");
async function test() {
  // Build JsResolver
  console.log(`JsResolver building...`);

  const buildRes = await JsResolverBuilder.build(jsResolverSrcPath, debug);
  console.log(`\nJsResolver Build result:`);
  if (buildRes.success) {
    console.log(` ${OK} Schema: ${buildRes.schemaPath}`);
    console.log(` ${OK} Built file: ${buildRes.filePath}`);
    console.log(` ${OK} File size: ${buildRes.fileSize.toFixed(2)}mb`);
    console.log(` ${OK} Build time: ${buildRes.buildTime.toFixed(2)}ms`);
  } else {
    console.log(` ${KO} Error: ${buildRes.error.message}`);
    return;
  }

  // Prepare mock content for test
  const context: JsResolverContextData = {
    secrets: {},
    storage: {},
    gelatoArgs: {
      chainId: 5,
      blockTime: Date.now() / 1000,
      gasPrice: "10",
    },
    userArgs: {},
  };

  // Fill up test secrets with `SECRETS_*` env
  Object.keys(process.env)
    .filter((key) => key.startsWith("SECRETS_"))
    .forEach((key) => {
      context.secrets[key.replace("SECRETS_", "")] = process.env[key];
    });

  // Configure JsResolver runner
  const runner = new JsResolverRunner(debug);
  const memory = buildRes.schema.memory;
  const timeout = buildRes.schema.timeout * 1000;
  const options = { runtime, showLogs, memory, timeout };

  // Validate input user args against schema
  if (Object.keys(inputUserArgs).length > 0) {
    console.log(`\nJsResolver user args validation:`);
    try {
      context.userArgs = await runner.validateUserArgs(
        buildRes.schema.userArgs,
        inputUserArgs
      );
      Object.keys(context.userArgs).forEach((key) => {
        console.log(` ${OK} ${key}:`, context.userArgs[key]);
      });
    } catch (err) {
      console.log(` ${KO} ${err.message}`);
      return;
    }
  }

  // Run JsResolver
  console.log(`\nJsResolver running${showLogs ? " logs:" : "..."}`);
  const res = await runner.run({ script: buildRes.filePath, context, options });
  console.log(`\nJsResolver Result:`);
  if (res.success) {
    console.log(` ${OK} Return value:`, res.result);
  } else {
    console.log(` ${KO} Error: ${res.error.message}`);
  }

  // Show runtime stats
  console.log(`\nJsResolver Runtime stats:`);
  const durationStatus = res.duration < 0.9 * buildRes.schema.timeout ? OK : KO;
  console.log(` ${durationStatus} Duration: ${res.duration.toFixed(2)}s`);
  const memoryStatus = res.memory < 0.9 * memory ? OK : KO;
  console.log(` ${memoryStatus} Memory: ${res.memory.toFixed(2)}mb`);
}

test().catch((err) => console.error("Error running JsResolver:", err));
