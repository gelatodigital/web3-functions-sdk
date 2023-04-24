import { Network } from "../types";

// modify type Network as well when adding/removing networks
export const ChainIdOfNetwork: Record<Network, number> = {
  ethereum: 1,
  polygon: 137,
  bsc: 56,
  avalanche: 43114,
  arbitrum: 42161,
  optimism: 10,
  fantom: 250,
  goerli: 5,
  mumbai: 80001,
  arbGoerli: 421613,
  baseGoerli: 84531,
};

export const ChainIds = Object.values(ChainIdOfNetwork);
export const Networks = Object.keys(ChainIdOfNetwork);
