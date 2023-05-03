import { HardhatRuntimeEnvironment } from "hardhat/types";

import { Web3FunctionContextData, Web3FunctionUserArgs } from "../../lib";
import { Web3FunctionBuilder } from "../../lib/builder";
import { Web3FunctionExecSuccess, Web3FunctionRunner } from "../../lib/runtime";
import { MAX_RPC_LIMIT } from "../constants";
import {
  EthersProviderWrapper,
  getMultiChainProviderConfigs,
} from "../provider";
import { W3fDetails } from "../types";
import { getW3fDetails } from "../utils";

export class W3fHardhatPlugin {
  private hre: HardhatRuntimeEnvironment;

  constructor(_hre: HardhatRuntimeEnvironment) {
    this.hre = _hre;
  }

  public get(_name: string) {
    const w3f = getW3fDetails(_name, this.hre.config.w3f.rootDir);

    return new Web3FunctionHardhat(this.hre, w3f);
  }
}

export class Web3FunctionHardhat {
  private w3f: W3fDetails;
  private hre: HardhatRuntimeEnvironment;
  private provider: EthersProviderWrapper;

  constructor(_hre: HardhatRuntimeEnvironment, _w3f: W3fDetails) {
    this.w3f = _w3f;
    this.hre = _hre;
    this.provider = new EthersProviderWrapper(_hre.network.provider);
  }

  public async run(override?: {
    storage?: { [key: string]: string };
    userArgs?: Web3FunctionUserArgs;
  }): Promise<Web3FunctionExecSuccess> {
    const userArgs = override?.userArgs ?? this.w3f.userArgs;
    const storage = override?.storage ?? this.w3f.storage;
    const secrets = this.w3f.secrets;
    const debug = this.hre.config.w3f.debug;

    const buildRes = await Web3FunctionBuilder.build(this.w3f.path, { debug });

    if (!buildRes.success)
      throw new Error(`Fail to build web3Function: ${buildRes.error}`);

    const runner = new Web3FunctionRunner(debug);
    runner.validateUserArgs(buildRes.schema.userArgs, userArgs);
    const web3FunctionVersion = buildRes.schema.web3FunctionVersion;

    const runtime: "docker" | "thread" = "thread";
    const memory = buildRes.schema.memory;
    const timeout = buildRes.schema.timeout * 1000;
    const version = buildRes.schema.web3FunctionVersion;

    const options = {
      runtime,
      showLogs: true,
      memory,
      rpcLimit: MAX_RPC_LIMIT,
      timeout,
      web3FunctionVersion,
    };
    const script = buildRes.filePath;

    const gelatoArgs = await this.getGelatoArgs();
    const context: Web3FunctionContextData = {
      gelatoArgs,
      userArgs,
      secrets,
      storage,
    };

    const multiChainProviderConfig = await getMultiChainProviderConfigs(
      this.hre
    );

    const res = await runner.run({
      script,
      context,
      options,
      version,
      multiChainProviderConfig,
    });

    if (!res.success)
      throw new Error(`Fail to run web3 function: ${res.error.message}`);

    return res;
  }

  public async deploy() {
    const cid = await Web3FunctionBuilder.deploy(this.w3f.path);

    return cid;
  }

  public async getGelatoArgs(gasPriceOverride?: string) {
    const block = await this.provider.getBlock("latest");
    const blockTime = block.timestamp;

    const chainId =
      this.hre.network.config.chainId ??
      (await this.provider.getNetwork()).chainId;

    const gasPrice =
      gasPriceOverride ?? (await this.provider.getGasPrice()).toString();

    return { blockTime, chainId, gasPrice };
  }

  public getSecrets() {
    return this.w3f.secrets;
  }

  public getUserArgs() {
    return this.w3f.userArgs;
  }

  public getStorage() {
    return this.w3f.storage;
  }

  public getPath() {
    return this.w3f.path;
  }
}
