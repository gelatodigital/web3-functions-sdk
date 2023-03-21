import * as dotenv from "dotenv";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { Web3FunctionContextData, Web3FunctionUserArgs } from "../../lib";
import { Web3FunctionBuilder } from "../../lib/builder";
import { Web3FunctionExecSuccess, Web3FunctionRunner } from "../../lib/runtime";
import { GAS_PRICE_ARG, W3F_ENV_PATH } from "../constants";
import { EthersProviderWrapper } from "../provider";
import { getUserArgsFromJsonFile } from "../utils";

export class W3fHardhatPlugin {
  private hre: HardhatRuntimeEnvironment;
  private provider: EthersProviderWrapper;

  constructor(_hre: HardhatRuntimeEnvironment) {
    this.hre = _hre;
    this.provider = new EthersProviderWrapper(_hre.network.provider);
  }

  public async run(
    name: string,
    storage: { [key: string]: string } = {},
    userArgsOverride?: Web3FunctionUserArgs
  ): Promise<Web3FunctionExecSuccess> {
    const w3fPath = this.hre.config.w3f.functions[name].path;

    const userArgs =
      userArgsOverride ?? (await getUserArgsFromJsonFile(w3fPath));
    const debug = this.hre.config.w3f.debug;

    const buildRes = await Web3FunctionBuilder.build(w3fPath, debug);

    if (!buildRes.success)
      throw new Error(`Fail to build web3Function: ${buildRes.error}`);

    const runner = new Web3FunctionRunner(debug);
    const runtime: "docker" | "thread" = "thread";
    const memory = buildRes.schema.memory;
    const rpcLimit = 100;
    const timeout = buildRes.schema.timeout * 1000;

    const options = {
      runtime,
      showLogs: true,
      memory,
      rpcLimit,
      timeout,
    };
    const script = buildRes.filePath;

    const secrets = this.getSecrets();
    const gelatoArgs = await this.getGelatoArgs();
    const context: Web3FunctionContextData = {
      gelatoArgs,
      userArgs,
      secrets,
      storage,
    };

    const provider = this.hre.network.provider;

    const res = await runner.run({ script, context, options, provider });

    if (!res.success)
      throw new Error(`Fail to run web3 function: ${res.error.message}`);

    return res;
  }

  public async deploy(name: string) {
    const w3fPath = this.hre.config.w3f.functions[name].path;
    const cid = await Web3FunctionBuilder.deploy(w3fPath);

    return cid;
  }

  public async getUserArgsFromJsonFile(name: string) {
    const w3fPath = this.hre.config.w3f.functions[name].path;
    const userArgs = await getUserArgsFromJsonFile(w3fPath);

    return userArgs;
  }

  public async getGelatoArgs(gasPriceOverride?: string) {
    const block = await this.provider.getBlock("latest");
    const blockTime = block.timestamp;

    const chainId =
      this.hre.network.config.chainId ??
      (await this.provider.getNetwork()).chainId;

    const gasPrice = gasPriceOverride ?? GAS_PRICE_ARG;

    return { blockTime, chainId, gasPrice };
  }

  public getSecrets() {
    const secrets: { [key: string]: string } = {};
    const config = dotenv.config({ path: W3F_ENV_PATH }).parsed ?? {};
    Object.keys(config).forEach((key) => {
      secrets[key] = config[key];
    });

    return secrets;
  }
}
