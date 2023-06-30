import { StaticJsonRpcProvider } from "@ethersproject/providers";

export interface MultiChainProviderConfig {
  [key: number]: StaticJsonRpcProvider;
}
