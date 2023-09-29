import { task } from "hardhat/config";
import test, { CallConfig } from "../../lib/binaries/test";
import { Web3FunctionLoader } from "../../lib/loader";
import {
  EthersProviderWrapper,
  getMultiChainProviderConfigs,
} from "../provider";

task("w3f-run", "Runs Gelato Web3 Function")
  .addFlag("debug", "Enable debug mode")
  .addFlag("logs", "Show Web3 Function logs")
  .addPositionalParam<string>(
    "name",
    "Web3 Function name defined in hardhat config"
  )
  .setAction(async (taskArgs, hre) => {
    const w3f = Web3FunctionLoader.load(taskArgs.name, hre.config.w3f.rootDir);

    const provider = new EthersProviderWrapper(hre.network.provider);

    const debug = taskArgs.debug ?? hre.config.w3f.debug;

    const chainId =
      hre.network.config.chainId ?? (await provider.getNetwork()).chainId;

    const multiChainProviderConfig = await getMultiChainProviderConfigs(hre);

    const callConfig: CallConfig = {
      w3fPath: w3f.path,
      debug,
      showLogs: taskArgs.logs,
      runtime: "thread",
      userArgs: w3f.userArgs,
      storage: w3f.storage,
      secrets: w3f.secrets,
      multiChainProviderConfig,
      chainId,
      log: w3f.log,
    };

    await test(callConfig);
  });
