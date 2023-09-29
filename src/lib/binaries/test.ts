import { Log, StaticJsonRpcProvider } from "@ethersproject/providers";
import colors from "colors/safe";
import path from "path";
import { Web3FunctionBuilder } from "../builder";
import { Web3FunctionLoader } from "../loader";
import { MultiChainProviderConfig } from "../provider";
import { Web3FunctionRunner } from "../runtime";
import { Web3FunctionContextData, Web3FunctionUserArgs } from "../types";

const STD_TIMEOUT = 10;
const STD_RPC_LIMIT = 10;
const STD_STORAGE_LIMIT = 1024;
const MAX_RPC_LIMIT = 100;
const MAX_DOWNLOAD_LIMIT = 10 * 1024 * 1024;
const MAX_UPLOAD_LIMIT = 5 * 1024 * 1024;
const MAX_REQUEST_LIMIT = 110;
const MAX_STORAGE_LIMIT = 1024; // kb

const OK = colors.green("✓");
const KO = colors.red("✗");
const WARN = colors.yellow("⚠");

export interface CallConfig {
  w3fPath: string;
  debug: boolean;
  showLogs: boolean;
  runtime: RunTime;
  userArgs: Web3FunctionUserArgs;
  storage: { [key: string]: string };
  secrets: { [key: string]: string };
  multiChainProviderConfig: MultiChainProviderConfig;
  chainId: number;
  log?: Log;
}

export type RunTime = "docker" | "thread";

export default async function test(callConfig?: Partial<CallConfig>) {
  let userArgs: Web3FunctionUserArgs = callConfig?.userArgs ?? {};
  let chainId = callConfig?.chainId ?? 5;
  const multiChainProviderConfig: MultiChainProviderConfig =
    callConfig?.multiChainProviderConfig ?? {
      5: new StaticJsonRpcProvider("https://eth-goerli.public.blastapi.io"),
    };
  let runtime: RunTime = callConfig?.runtime ?? "thread";
  let debug = callConfig?.debug ?? false;
  let showLogs = callConfig?.showLogs ?? false;
  let storage = callConfig?.storage ?? {};
  let secrets = callConfig?.secrets ?? {};
  let log = callConfig?.log;

  const web3FunctionPath =
    callConfig?.w3fPath ??
    process.argv[3] ??
    path.join(process.cwd(), "src", "web3-functions", "index.ts");

  if (!callConfig) {
    if (!process.env.PROVIDER_URLS) {
      console.error(`Missing PROVIDER_URLS in .env file`);
      process.exit();
    }

    const providerUrls = process.env.PROVIDER_URLS.split(",");
    for (const url of providerUrls) {
      const provider = new StaticJsonRpcProvider(url);
      const chainId = (await provider.getNetwork()).chainId;
      multiChainProviderConfig[chainId] = provider;
    }

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
        }
      });
    }

    // Load Web3Function details (userArgs, secrets, storage)
    const parsedPathParts = path.parse(web3FunctionPath).dir.split(path.sep);
    const w3fName = parsedPathParts.pop() ?? "";
    const w3fRootDir = parsedPathParts.join(path.sep);
    const w3fDetails = Web3FunctionLoader.load(w3fName, w3fRootDir);
    userArgs = w3fDetails.userArgs;
    secrets = w3fDetails.secrets;
    storage = w3fDetails.storage;
    log = w3fDetails.log;
  }

  // Build Web3Function
  console.log(`Web3Function building...`);

  const buildRes = await Web3FunctionBuilder.build(web3FunctionPath, { debug });
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
    secrets,
    storage,
    gelatoArgs: {
      chainId,
      gasPrice: "10",
    },
    userArgs,
    log,
  };

  // Configure Web3Function runner
  const runner = new Web3FunctionRunner(debug);
  const memory = buildRes.schema.memory;
  const timeout = buildRes.schema.timeout * 1000;
  const version = buildRes.schema.web3FunctionVersion;
  const rpcLimit = MAX_RPC_LIMIT;
  const options = {
    runtime,
    showLogs,
    memory,
    rpcLimit,
    timeout,
    downloadLimit: MAX_DOWNLOAD_LIMIT,
    uploadLimit: MAX_UPLOAD_LIMIT,
    requestLimit: MAX_REQUEST_LIMIT,
    storageLimit: MAX_STORAGE_LIMIT,
    blacklistedHosts: ["testblacklistedhost.com"],
  };
  const script = buildRes.filePath;

  // Validate user args against schema
  if (Object.keys(buildRes.schema.userArgs).length > 0) {
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

  // Run Web3Function
  console.log(`\nWeb3Function running${showLogs ? " logs:" : "..."}`);
  const res = await runner.run({
    script,
    version,
    context,
    options,
    multiChainProviderConfig,
  });

  // Show storage update
  if (res.success && res.storage?.state === "updated") {
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
  if (res.throttled.duration) {
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
  const memoryStatus = res.throttled.memory ? KO : OK;
  console.log(` ${memoryStatus} Memory: ${res.memory.toFixed(2)}mb`);

  if (res.success && res.throttled.storage) {
    console.log(
      ` ${KO} Storage: ${res.storage.size.toFixed(
        2
      )}kb - Storage usage exceeds limit!`
    );
  } else if (res.success && res.storage?.size > STD_STORAGE_LIMIT) {
    console.log(
      ` ${KO} Storage: ${res.storage.size.toFixed(
        2
      )}kb (Storage usage is above Standard plan limit: ${STD_STORAGE_LIMIT}kb!)`
    );
  } else if (res.success && res.storage?.size > 0) {
    console.log(` ${OK} Storage: ${res.storage.size.toFixed(2)}kb`);
  }

  let networkMessage = ` ${res.throttled.networkRequest ? KO : OK} Network: ${
    res.network.nbRequests
  } req [${res.throttled.download ? KO : ""} DL: ${res.network.download.toFixed(
    2
  )}kb / UL: ${res.throttled.upload ? KO : ""} ${res.network.upload.toFixed(
    2
  )}kb]`;

  if (res.throttled.networkRequest) {
    networkMessage += ` ${`(${res.network.nbThrottled} req throttled - Please reduce your network usage!)`}`;
  }
  console.log(networkMessage);

  if (res.throttled.rpcRequest) {
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
