import { ethers } from "ethers";

export interface MultiChainProviderConfig {
  [key: number]: ethers.providers.StaticJsonRpcProvider;
}
