import "dotenv/config";
import colors from "colors/safe";
import { JsResolverContextData } from "../lib";
import { JsResolverBuilder } from "../lib/builder/JsResolverBuilder";
import { JsResolverRunner } from "../lib/runtime/JsResolverRunner";

const jsResolverSrcPath = process.argv[2] ?? "./src/resolvers/index.ts";

let runtime: "docker" | "thread" = "docker";
let debug = false;
let showLogs = false;
let memory = 128;
let timeoutSec = 30;
if (process.argv.length > 2) {
  process.argv.slice(3).forEach((arg) => {
    if (arg.startsWith("--debug")) {
      debug = true;
    } else if (arg.startsWith("--show-logs")) {
      showLogs = true;
    } else if (arg.startsWith("--runtime=")) {
      const type = arg.split("=")[1];
      runtime = type === "thread" ? "thread" : "docker";
    } else if (arg.startsWith("--memory=")) {
      memory = parseInt(arg.split("=")[1]) ?? memory;
    } else if (arg.startsWith("--timeout=")) {
      timeoutSec = parseInt(arg.split("=")[1]) ?? timeoutSec;
    }
  });
}
const timeout = timeoutSec * 1000;

const OK = colors.green("✓");
const KO = colors.red("✗");
async function test() {
  // Build JsResolver
  console.log(`JsResolver building...`);
  const buildRes = await JsResolverBuilder.build(jsResolverSrcPath, debug);
  console.log(`\nJsResolver Build result:`);
  if (buildRes.success) {
    console.log(` ${OK} File: ${buildRes.filePath}`);
    console.log(` ${OK} File size: ${buildRes.fileSize.toFixed(2)}mb`);
    console.log(` ${OK} Build time: ${buildRes.buildTime.toFixed(2)}ms`);
  } else {
    console.log(` ${KO} Error: ${buildRes.error.message}`);
    return;
  }

  // Prepare mock content for test
  const mockContext: JsResolverContextData = {
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
      mockContext.secrets[key.replace("SECRETS_", "")] = process.env[key];
    });

  // Run JsResolver
  console.log(`\nJsResolver running${showLogs ? " logs:" : "..."}`);
  const runner = new JsResolverRunner(debug);
  const options = { runtime, showLogs, memory, timeout };
  const res = await runner.run(buildRes.filePath, mockContext, options);
  console.log(`\nJsResolver Result:`);
  if (res.success) {
    console.log(` ${OK} Return value:`, res.result);
  } else {
    console.log(` ${KO} Error: ${res.error.message}`);
  }

  // Show runtime stats
  console.log(`\nJsResolver Runtime stats:`);
  const durationStatus = res.duration < 0.9 * timeoutSec ? OK : KO;
  console.log(` ${durationStatus} Duration: ${res.duration.toFixed(2)}s`);
  const memoryStatus = res.memory < 0.9 * memory ? OK : KO;
  console.log(` ${memoryStatus} Memory: ${res.memory.toFixed(2)}mb`);
}

test().catch((err) => console.error("Error running JsResolver:", err));
