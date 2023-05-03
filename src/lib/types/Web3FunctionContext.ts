import { BigNumber } from "ethers";
import { Web3FunctionMultiChainProvider } from "../provider/Web3FunctionMultiChainProvider";
import { Web3FunctionUserArgs } from "./Web3FunctionUserArgs";
export interface Web3FunctionContextData {
  gelatoArgs: {
    chainId: number;
    gasPrice: string;
    taskId?: string;
  };
  rpcProviderUrl?: string;
  userArgs: Web3FunctionUserArgs;
  secrets: { [key: string]: string | undefined };
  storage: { [key: string]: string | undefined };
}

export interface Web3FunctionContext {
  gelatoArgs: {
    chainId: number;
    gasPrice: BigNumber;
    taskId?: string;
  };
  multiChainProvider: Web3FunctionMultiChainProvider;
  userArgs: Web3FunctionUserArgs;
  secrets: {
    get(key: string): Promise<string | undefined>;
  };
  storage: {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
}
