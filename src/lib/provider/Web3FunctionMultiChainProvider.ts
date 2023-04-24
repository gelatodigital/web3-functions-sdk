import { ethers } from "ethers";
import { Network } from "./types";
import { ChainIdOfNetwork, Networks } from "./utils";

export class Web3FunctionMultiChainProvider {
  private _proxyRpcUrlBase: string | undefined;

  constructor(proxyRpcUrlBase: string | undefined) {
    this._proxyRpcUrlBase = proxyRpcUrlBase;
  }

  public network(network: Network): ethers.providers.StaticJsonRpcProvider {
    const chainId = ChainIdOfNetwork[network];

    if (this._isSupportedNetwork(network)) {
      return new ethers.providers.StaticJsonRpcProvider(
        `${this._proxyRpcUrlBase}/${chainId}`
      );
    } else
      throw new Error(
        `Web3FunctionMultiChainProvider: No provider for network: ${network}`
      );
  }

  private _isSupportedNetwork(network: Network) {
    return Networks.includes(network);
  }
}
