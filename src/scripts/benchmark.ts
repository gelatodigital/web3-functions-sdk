import "dotenv/config";
import colors from "colors/safe";
import { setTimeout as delay } from "timers/promises";
import { JsResolverContextData } from "../lib";
import { JsResolverBuilder } from "../lib/builder/JsResolverBuilder";
import { JsResolverRunner } from "../lib/runtime/JsResolverRunner";
import { JsResolverExec } from "../lib/types/JsResolverExecResult";
import { performance } from "perf_hooks";

const jsResolverSrcPath = process.argv[2] ?? "./src/resolvers/index.ts";

let runtime: "docker" | "thread" = "docker";
let debug = false;
let showLogs = false;
let memory = 128;
let timeoutSec = 30;
let load = 10;
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
    } else if (arg.startsWith("--load")) {
      load = parseInt(arg.split("=")[1]) ?? load;
    }
  });
}
const timeout = timeoutSec * 1000;

const OK = colors.green("✓");
const KO = colors.red("✗");
async function test() {
  // Build JsResolver
  const buildRes = await JsResolverBuilder.build(jsResolverSrcPath, debug);
  if (!buildRes.success) {
    console.log(`\nJsResolver Build result:`);
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
  const start = performance.now();
  const promises: Promise<JsResolverExec>[] = [];
  for (let i = 0; i < load; i++) {
    console.log(`#${i} Starting JsResolver`);
    const runner = new JsResolverRunner(debug);
    const options = { runtime, showLogs, memory, timeout };
    promises.push(runner.run(buildRes.filePath, mockContext, options));
    await delay(100);
  }

  const results = await Promise.all(promises);
  const duration = (performance.now() - start) / 1000;

  console.log(`\nJsResolver results:`);
  results.forEach((res, i) => {
    if (res.success) console.log(` ${OK} #${i} Success`);
    else console.log(` ${KO} #${i} Error:`, res.error);
  });
  const nbSuccess = results.filter((res) => res.success).length;
  console.log(`\nBenchmark result:`);
  console.log(`- nb success: ${nbSuccess}/${load}`);
  console.log(`- duration: ${duration.toFixed()}s`);
}

test().catch((err) => console.error("Error running benchmark:", err));
