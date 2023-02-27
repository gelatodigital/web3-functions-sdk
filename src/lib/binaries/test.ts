import "dotenv/config";
import colors from "colors/safe";
import { Web3FunctionContextData } from "../types";
import { Web3FunctionRunner } from "../runtime";
import { Web3FunctionBuilder } from "../builder";
import { ethers } from "ethers";

if (!process.env.PROVIDER_URL) {
  console.error(`Missing PROVIDER_URL in .env file`);
  process.exit();
}

const web3FunctionSrcPath = process.argv[3] ?? "./src/web3-functions/index.ts";
let chainId = 5;
let runtime: "docker" | "thread" = "thread";
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
      runtime = type === "docker" ? "docker" : "thread";
    } else if (arg.startsWith("--chain-id")) {
      chainId = parseInt(arg.split("=")[1]) ?? chainId;
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

const STD_TIMEOUT = 10;
const STD_RPC_LIMIT = 10;
const STD_STORAGE_LIMIT = 1024;
const MAX_RPC_LIMIT = 100;

const OK = colors.green("✓");
const KO = colors.red("✗");
const WARN = colors.yellow("⚠");
export default async function test() {
  // Build Web3Function
  console.log(`Web3Function building...`);

  const buildRes = await Web3FunctionBuilder.build(web3FunctionSrcPath, debug);
  console.log(`\nWeb3Function Build result:`);
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
  const context: Web3FunctionContextData = {
    secrets: {},
    storage: {},
    gelatoArgs: {
      chainId,
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

  // Configure Web3Function runner
  const runner = new Web3FunctionRunner(debug);
  const memory = buildRes.schema.memory;
  const timeout = buildRes.schema.timeout * 1000;
  const rpcLimit = MAX_RPC_LIMIT;
  const options = { runtime, showLogs, memory, rpcLimit, timeout };
  const script = buildRes.filePath;
  const provider = new ethers.providers.StaticJsonRpcProvider(
    process.env.PROVIDER_URL
  );

  // Validate input user args against schema
  if (Object.keys(inputUserArgs).length > 0) {
    console.log(`\nWeb3Function user args validation:`);
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

  // Run Web3Function
  console.log(`\nWeb3Function running${showLogs ? " logs:" : "..."}`);
  const res = await runner.run({ script, context, options, provider });

  // Show storage update
  if (res.storage?.state === "updated") {
    console.log(`\nSimulated Web3Function Storage update:`);
    Object.entries(res.storage.storage).forEach(([key, value]) =>
      console.log(` ${OK} ${key}: ${colors.green(`'${value}'`)}`)
    );
  }

  // Show Web3Function result
  console.log(`\nWeb3Function Result:`);
  if (res.success) {
    console.log(` ${OK} Return value:`, res.result);
  } else {
    console.log(` ${KO} Error: ${res.error.message}`);
  }

  // Show runtime stats
  console.log(`\nWeb3Function Runtime stats:`);
  if (res.duration > 0.9 * buildRes.schema.timeout) {
    console.log(` ${KO} Duration: ${res.duration.toFixed(2)}s`);
  } else if (res.duration > STD_TIMEOUT) {
    console.log(
      ` ${WARN} Duration: ${res.duration.toFixed(
        2
      )}s (Runtime is above Standard plan limit: ${STD_TIMEOUT}s!)`
    );
  } else {
    console.log(` ${OK} Duration: ${res.duration.toFixed(2)}s`);
  }
  const memoryStatus = res.memory < 0.9 * memory ? OK : KO;
  console.log(` ${memoryStatus} Memory: ${res.memory.toFixed(2)}mb`);

  if (res.storage?.size > STD_STORAGE_LIMIT) {
    console.log(
      ` ${KO} Storage: ${res.storage.size.toFixed(
        2
      )}kb (Storage usage is above Standard plan limit: ${STD_STORAGE_LIMIT}kb!)`
    );
  } else if (res.storage?.size > 0) {
    console.log(` ${OK} Storage: ${res.storage.size.toFixed(2)}kb`);
  }

  if (res.rpcCalls.throttled > 0) {
    console.log(
      ` ${KO} Rpc calls: ${
        res.rpcCalls.total
      } ${`(${res.rpcCalls.throttled} throttled - Please reduce your rpc usage!)`}`
    );
  } else if (res.rpcCalls.total > STD_RPC_LIMIT) {
    console.log(
      ` ${WARN} Rpc calls: ${
        res.rpcCalls.total
      } ${`(RPC usage is above Standard plan limit: ${STD_RPC_LIMIT}!)`}`
    );
  } else {
    console.log(` ${OK} Rpc calls: ${res.rpcCalls.total}`);
  }
}
