import { ethers } from "ethers";

export interface MultiChainProviders {
  [key: number]: ethers.providers.StaticJsonRpcProvider;
}

// modify ChainIdOfNetwork as well when adding/removing networks
export type Network =
  | "ethereum"
  | "polygon"
  | "bsc"
  | "avalanche"
  | "arbitrum"
  | "optimism"
  | "fantom"
  | "goerli"
  | "mumbai"
  | "arbGoerli"
  | "baseGoerli";
