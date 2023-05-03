import { ethers } from "ethers";

export class Web3FunctionMultiChainProvider {
  private _proxyRpcUrlBase: string | undefined;
  private _providers: Map<number, ethers.providers.StaticJsonRpcProvider>;
  private _defaultProvider: ethers.providers.StaticJsonRpcProvider;

  constructor(proxyRpcUrlBase: string | undefined) {
    this._proxyRpcUrlBase = proxyRpcUrlBase;
    this._providers = new Map();
    this._defaultProvider = new ethers.providers.StaticJsonRpcProvider(
      proxyRpcUrlBase
    );
  }

  public default(): ethers.providers.StaticJsonRpcProvider {
    return this._defaultProvider;
  }

  public chainId(chainId: number): ethers.providers.StaticJsonRpcProvider {
    return this._getProviderOfChainId(chainId);
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
}
