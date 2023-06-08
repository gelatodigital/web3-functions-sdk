import { ethers } from "ethers";

export class Web3FunctionMultiChainProvider {
  private _proxyRpcUrlBase: string;
  private _rateLimitCallback: () => void;
  private _providers: Map<number, ethers.providers.StaticJsonRpcProvider>;
  private _defaultProvider: ethers.providers.StaticJsonRpcProvider;

  constructor(
    proxyRpcUrlBase: string,
    defaultChainId: number,
    rateLimitCallBack: () => void
  ) {
    this._proxyRpcUrlBase = proxyRpcUrlBase;
    this._rateLimitCallback = rateLimitCallBack;
    this._providers = new Map();
    this._defaultProvider = new ethers.providers.StaticJsonRpcProvider(
      proxyRpcUrlBase,
      defaultChainId
    );
    this._providers.set(defaultChainId, this._defaultProvider);
    this._subscribeProviderEvents(this._defaultProvider);
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
        `${this._proxyRpcUrlBase}/${chainId}`,
        chainId
      );

      this._subscribeProviderEvents(provider);
      this._providers.set(chainId, provider);
    }

    return provider;
  }

  private _subscribeProviderEvents(
    provider: ethers.providers.StaticJsonRpcProvider
  ) {
    provider.on("debug", (data) => {
      if (data.action === "response" && data.error) {
        if (/Request limit exceeded/.test(data.error.message)) {
          console.error("Web3FunctionError: RPC requests limit exceeded");
          this._rateLimitCallback();
        }
      }
    });
  }
}
