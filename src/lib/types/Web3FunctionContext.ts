import { BigNumber } from "@ethersproject/bignumber";
import { Log } from "@ethersproject/providers";
import { Web3FunctionMultiChainProvider } from "../provider/Web3FunctionMultiChainProvider";
import { Web3FunctionOperation } from "./Web3FunctionOperation";
import { Web3FunctionUserArgs } from "./Web3FunctionUserArgs";

export type Web3FunctionContextData =
  | Web3FunctionOnRunContextData
  | Web3FunctionOnFailContextData
  | Web3FunctionOnSuccessContextData;
export interface Web3FunctionOnRunContextData
  extends Web3FunctionContextDataBase {
  operation: "onRun";
}
export interface Web3FunctionOnFailContextData
  extends Web3FunctionContextDataBase {
  operation: "onFail";
  onFailReason: FailReason;
}
export interface Web3FunctionOnSuccessContextData
  extends Web3FunctionContextDataBase {
  operation: "onSuccess";
  transactionHash?: string;
}
export interface Web3FunctionContextDataBase {
  operation: Web3FunctionOperation;
  gelatoArgs: {
    chainId: number;
    gasPrice: string;
    taskId?: string;
  };
  rpcProviderUrl?: string;
  userArgs: Web3FunctionUserArgs;
  secrets: { [key: string]: string | undefined };
  storage: { [key: string]: string | undefined };
  log?: Log;
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

export interface Web3FunctionEventContext extends Web3FunctionContext {
  log: Log;
}
export interface Web3FunctionSuccessContext extends Web3FunctionContext {
  transactionHash?: string;
}
export interface Web3FunctionEventSuccessContext
  extends Web3FunctionEventContext {
  transactionHash?: string;
}

type FailReason =
  | "InsufficientFunds"
  | "SimulationFailed"
  | "ExecutionReverted";

export interface Web3FunctionFailContext extends Web3FunctionContext {
  reason: FailReason;
}
export interface Web3FunctionEventFailContext extends Web3FunctionEventContext {
  reason: FailReason;
}
