import { task } from "hardhat/config";
import test, { CallConfig } from "../../lib/binaries/test";
import { W3F_ENV_PATH } from "../constants";
import { EthersProviderWrapper } from "../provider";

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
    const provider = new EthersProviderWrapper(hre.network.provider);

    const w3fPath = hre.config.w3f.functions[taskArgs.name].path;
    const debug = taskArgs.debug ?? hre.config.w3f.debug;

    let userArgs = {};
    const userArgsStr = taskArgs.userargs;

    if (!userArgsStr) {
      userArgs = hre.config.w3f.functions[taskArgs.name].userArgs ?? {};
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

    const callConfig: CallConfig = {
      w3fPath,
      w3fEnvPath: W3F_ENV_PATH,
      debug,
      showLogs: taskArgs.logs,
      runtime: "thread",
      userArgs,
      provider: hre.network.provider,
      chainId,
    };

    await test(callConfig);
  });
