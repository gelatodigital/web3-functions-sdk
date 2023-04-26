import { ethers } from "ethers";
import { EthereumProvider, HardhatRuntimeEnvironment } from "hardhat/types";
import { MultiChainProviderConfig } from "../../lib/provider";

export async function getMultiChainProviderConfigs(
  hre: HardhatRuntimeEnvironment
) {
  const multiChainProviderConfig: MultiChainProviderConfig = {};

  try {
    const networks = hre.config.w3f.networks;
    for (const network of networks) {
      if (network != "hardhat") {
        const networkConfig = hre.userConfig.networks?.[network];
        if (!networkConfig)
          throw new Error(`Config for network ${network} not found`);

        const url = networkConfig["url"];
        if (!url) throw new Error(`'url' for network ${network} not found`);

        const provider = new ethers.providers.StaticJsonRpcProvider(url);
        const chainId =
          networkConfig.chainId ?? (await provider.getNetwork()).chainId;

        multiChainProviderConfig[chainId] = provider;
      } else {
        const provider = new EthersProviderWrapper(hre.network.provider);
        const chainId = 31337; //hardhat chain id

        multiChainProviderConfig[chainId] = provider;
      }
    }
  } catch (err) {
    console.error(
      `Fail to start Web3FunctionMultiChainProvider: ${err.message}`
    );
  }

  return multiChainProviderConfig;
}

export class EthersProviderWrapper extends ethers.providers.JsonRpcProvider {
  private readonly _hardhatProvider: EthereumProvider;

  constructor(hardhatProvider: EthereumProvider) {
    super();
    this._hardhatProvider = hardhatProvider;
  }

  public async send(method: string, params: any): Promise<any> {
    const result = await this._hardhatProvider.send(method, params);

    // We replicate ethers' behavior.
    this.emit("debug", {
      action: "send",
      request: {
        id: 42,
        jsonrpc: "2.0",
        method,
        params,
      },
      response: result,
      provider: this,
    });

    return result;
  }
}
