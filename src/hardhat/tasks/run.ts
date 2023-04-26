import { task } from "hardhat/config";
import test, { CallConfig } from "../../lib/binaries/test";
import {
  EthersProviderWrapper,
  getMultiChainProviderConfigs,
} from "../provider";
import { getW3fDetails } from "../utils";

task("w3f-run", "Runs Gelato Web3 Function")
  .addFlag("debug", "Enable debug mode")
  .addFlag("logs", "Show Web3 Function logs")
  .addOptionalParam<string>(
    "userargs",
    "Web3 Function user arguments",
    "" //default
  )
  .addPositionalParam<string>(
    "name",
    "Web3 Function name defined in hardhat config"
  )
  .setAction(async (taskArgs, hre) => {
    const w3f = getW3fDetails(taskArgs.name, hre.config.w3f.rootDir);

    const provider = new EthersProviderWrapper(hre.network.provider);

    const debug = taskArgs.debug ?? hre.config.w3f.debug;

    let userArgs = {};
    const userArgsStr = taskArgs.userargs;

    if (!userArgsStr) {
      userArgs = w3f.userArgs;
    } else {
      const kvs = userArgsStr.split("-");

      if (kvs.lenght > 1) {
        for (const kv of kvs) {
          const [key, value] = kv.split(":");
          userArgs[key] = value;
        }
      }
    }

    const chainId =
      hre.network.config.chainId ?? (await provider.getNetwork()).chainId;

    const multiChainProviderConfig = await getMultiChainProviderConfigs(hre);

    const callConfig: CallConfig = {
      w3fPath: w3f.path,
      debug,
      showLogs: taskArgs.logs,
      runtime: "thread",
      userArgs,
      storage: w3f.storage,
      secrets: w3f.secrets,
      multiChainProviderConfig,
      chainId,
    };

    await test(callConfig);
  });
