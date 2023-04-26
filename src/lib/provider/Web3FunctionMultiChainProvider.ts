import { ethers } from "ethers";
import { Network } from "./types";
import { ChainIdOfNetwork, Networks } from "./utils";

export class Web3FunctionMultiChainProvider {
  private _proxyRpcUrlBase: string | undefined;
  private _providers: Map<number, ethers.providers.StaticJsonRpcProvider>;

  constructor(proxyRpcUrlBase: string | undefined) {
    this._proxyRpcUrlBase = proxyRpcUrlBase;
    this._providers = new Map();
  }

  public network(network: Network): ethers.providers.StaticJsonRpcProvider {
    const chainId = ChainIdOfNetwork[network];

    if (this._isSupportedNetwork(network)) {
      return this._getProviderOfChainId(chainId);
    } else
      throw new Error(
        `Web3FunctionMultiChainProvider: Network ${network} not supported.`
      );
  }

  private _getProviderOfChainId(chainId: number) {
    let provider = this._providers.get(chainId);

    if (!provider) {
      provider = new ethers.providers.StaticJsonRpcProvider(
        `${this._proxyRpcUrlBase}/${chainId}`
      );

      this._providers.set(chainId, provider);
    }

    return provider;
  }

  private _isSupportedNetwork(network: Network) {
    return Networks.includes(network);
  }
}
