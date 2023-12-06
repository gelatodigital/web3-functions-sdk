import { StaticJsonRpcProvider } from "@ethersproject/providers";
import colors from "colors/safe";
import "dotenv/config";
import path from "path";
import { performance } from "perf_hooks";

import {
  MAX_DOWNLOAD_LIMIT,
  MAX_REQUEST_LIMIT,
  MAX_STORAGE_LIMIT,
  MAX_UPLOAD_LIMIT,
} from "../../hardhat/constants";
import { Web3FunctionBuilder } from "../builder";
import { Web3FunctionLoader } from "../loader";
import { MultiChainProviderConfig } from "../provider";
import {
  Web3FunctionExec,
  Web3FunctionRunner,
  Web3FunctionRunnerPool,
} from "../runtime";
import {
  Web3FunctionContextData,
  Web3FunctionContextDataBase,
  Web3FunctionOperation,
} from "../types";

const delay = (t: number) => new Promise((resolve) => setTimeout(resolve, t));

if (!process.env.PROVIDER_URLS) {
  console.error(`Missing PROVIDER_URLS in .env file`);
  process.exit();
}

const providerUrls = (process.env.PROVIDER_URLS as string).split(",");
const web3FunctionPath =
  process.argv[3] ??
  path.join(process.cwd(), "src", "web3-functions", "index.ts");
let operation: Web3FunctionOperation = "onRun";
let chainId = 5;
let runtime: "docker" | "thread" = "thread";
let debug = false;
let showLogs = false;
let load = 10;
let pool = 10;
if (process.argv.length > 2) {
  process.argv.slice(3).forEach((arg) => {
    if (arg.startsWith("--debug")) {
      debug = true;
    } else if (arg.startsWith("--logs")) {
      showLogs = true;
    } else if (arg.startsWith("--runtime=")) {
      const type = arg.split("=")[1];
      runtime = type === "docker" ? "docker" : "thread";
    } else if (arg.startsWith("--chain-id")) {
      chainId = parseInt(arg.split("=")[1]) ?? chainId;
    } else if (arg.startsWith("--load")) {
      load = parseInt(arg.split("=")[1]) ?? load;
    } else if (arg.startsWith("--pool")) {
      pool = parseInt(arg.split("=")[1]) ?? pool;
    } else if (arg.startsWith("--onFail")) {
      operation = "onFail";
    } else if (arg.startsWith("--onSuccess")) {
      operation = "onSuccess";
    }
  });
}
const OK = colors.green("✓");
const KO = colors.red("✗");
export default async function benchmark() {
  // Build Web3Function
  const buildRes = await Web3FunctionBuilder.build(web3FunctionPath, {
    debug,
  });
  if (!buildRes.success) {
    console.log(`\nWeb3Function Build result:`);
    console.log(` ${KO} Error: ${buildRes.error.message}`);
    return;
  }

  // Load Web3Function details (userArgs, secrets, storage)
  const parsedPathParts = path.parse(web3FunctionPath).dir.split(path.sep);
  const w3fName = parsedPathParts.pop() ?? "";
  const w3fRootDir = parsedPathParts.join(path.sep);
  const w3fDetails = Web3FunctionLoader.load(w3fName, w3fRootDir);
  const userArgs = w3fDetails.userArgs;
  const secrets = w3fDetails.secrets;
  const storage = w3fDetails.storage;
  const log = w3fDetails.log;

  // Prepare mock content for test
  const baseContext: Web3FunctionContextDataBase = {
    secrets,
    storage,
    gelatoArgs: {
      chainId,
      gasPrice: "10",
    },
    userArgs,
    log,
  };

  let context: Web3FunctionContextData<typeof operation>;
  if (operation === "onFail") {
    //Todo: accept arguments
    context = {
      ...baseContext,
      onFailReason: "SimulationFailed",
      callData: [
        {
          to: "0x0000000000000000000000000000000000000000",
          data: "0x00000000",
        },
      ],
    };
  } else if (operation === "onSuccess") {
    context = {
      ...baseContext,
    };
  } else {
    context = {
      ...baseContext,
    };
  }

  // Validate user args against schema
  if (Object.keys(buildRes.schema.userArgs).length > 0) {
    const runner = new Web3FunctionRunner(debug);
    console.log(`\nWeb3Function user args validation:`);
    try {
      runner.validateUserArgs(buildRes.schema.userArgs, userArgs);

      Object.keys(context.userArgs).forEach((key) => {
        console.log(` ${OK} ${key}:`, context.userArgs[key]);
      });
    } catch (err) {
      console.log(` ${KO} ${err.message}`);
      return;
    }
  }

  const multiChainProviderConfig: MultiChainProviderConfig = {};
  for (const url of providerUrls) {
    const provider = new StaticJsonRpcProvider(url);
    const chainId = (await provider.getNetwork()).chainId;
    multiChainProviderConfig[chainId] = provider;
  }

  // Run Web3Function
  const start = performance.now();
  const memory = buildRes.schema.memory;
  const timeout = buildRes.schema.timeout * 1000;
  const version = buildRes.schema.web3FunctionVersion;
  const rpcLimit = 100;
  const options = {
    runtime,
    showLogs,
    memory,
    timeout,
    rpcLimit,
    downloadLimit: MAX_DOWNLOAD_LIMIT,
    uploadLimit: MAX_UPLOAD_LIMIT,
    requestLimit: MAX_REQUEST_LIMIT,
    storageLimit: MAX_STORAGE_LIMIT,
  };
  const script = buildRes.filePath;
  const runner = new Web3FunctionRunnerPool(pool, debug);
  await runner.init();
  const promises: Promise<Web3FunctionExec<typeof operation>>[] = [];

  for (let i = 0; i < load; i++) {
    console.log(`#${i} Queuing Web3Function`);
    promises.push(
      runner.run(operation, {
        script,
        version,
        context,
        options,
        multiChainProviderConfig,
      })
    );
    await delay(100);
  }

  const results = await Promise.all(promises);
  const duration = (performance.now() - start) / 1000;

  console.log(`\nWeb3Function results:`);
  results.forEach((res, i) => {
    if (res.success) console.log(` ${OK} #${i} Success`);
    else console.log(` ${KO} #${i} Error:`, res.error);
  });
  const nbSuccess = results.filter((res) => res.success).length;
  console.log(`\nBenchmark result:`);
  console.log(`- nb success: ${nbSuccess}/${load}`);
  console.log(`- duration: ${duration.toFixed()}s`);
}
