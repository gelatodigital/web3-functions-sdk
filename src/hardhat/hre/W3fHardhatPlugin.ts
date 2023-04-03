import { HardhatRuntimeEnvironment } from "hardhat/types";

import { Web3FunctionContextData, Web3FunctionUserArgs } from "../../lib";
import { Web3FunctionBuilder } from "../../lib/builder";
import { Web3FunctionExecSuccess, Web3FunctionRunner } from "../../lib/runtime";
import { MAX_RPC_LIMIT } from "../constants";
import { EthersProviderWrapper } from "../provider";

export class W3fHardhatPlugin {
  private hre: HardhatRuntimeEnvironment;

  constructor(_hre: HardhatRuntimeEnvironment) {
    this.hre = _hre;
  }

  public get(_name: string) {
    const w3f = this.hre.config.w3f.functions[_name];
    if (!w3f) throw new Error(`Cannot find web3 function "${_name}"`);

    return new W3fHardhatClass(this.hre, _name);
  }
}

export class W3fHardhatClass {
  private name: string;
  private hre: HardhatRuntimeEnvironment;
  private provider: EthersProviderWrapper;

  constructor(_hre: HardhatRuntimeEnvironment, _name: string) {
    this.hre = _hre;
    this.name = _name;
    this.provider = new EthersProviderWrapper(_hre.network.provider);
  }

  public async run(override?: {
    storage?: { [key: string]: string };
    userArgs?: Web3FunctionUserArgs;
  }): Promise<Web3FunctionExecSuccess> {
    const w3f = this.hre.config.w3f.functions[this.name];

    const userArgs = override?.userArgs ?? w3f.userArgs;
    const storage = override?.storage ?? w3f.storage;
    const secrets = w3f.secrets;
    const debug = this.hre.config.w3f.debug;

    const buildRes = await Web3FunctionBuilder.build(w3f.path, debug);

    if (!buildRes.success)
      throw new Error(`Fail to build web3Function: ${buildRes.error}`);

    const runner = new Web3FunctionRunner(debug);
    runner.validateUserArgs(buildRes.schema.userArgs, userArgs);

    const runtime: "docker" | "thread" = "thread";
    const memory = buildRes.schema.memory;
    const timeout = buildRes.schema.timeout * 1000;

    const options = {
      runtime,
      showLogs: true,
      memory,
      rpcLimit: MAX_RPC_LIMIT,
      timeout,
    };
    const script = buildRes.filePath;

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

  public async deploy() {
    const w3f = this.hre.config.w3f.functions[this.name];

    const cid = await Web3FunctionBuilder.deploy(w3f.path);

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
    const secrets = this.hre.config.w3f.functions[this.name].secrets;
    return secrets;
  }

  public getUserArgs() {
    const secrets = this.hre.config.w3f.functions[this.name].userArgs;
    return secrets;
  }

  public getStorage() {
    const secrets = this.hre.config.w3f.functions[this.name].storage;
    return secrets;
  }

  public getPath() {
    const secrets = this.hre.config.w3f.functions[this.name].storage;
    return secrets;
  }
}
