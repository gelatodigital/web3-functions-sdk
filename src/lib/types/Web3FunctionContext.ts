import { BigNumber } from "@ethersproject/bignumber";
import { Log } from "@ethersproject/providers";
import { Web3FunctionMultiChainProvider } from "../provider/Web3FunctionMultiChainProvider";
import { Web3FunctionOperation } from "./Web3FunctionOperation";
import { Web3FunctionResultCallData } from "./Web3FunctionResult";
import { Web3FunctionUserArgs } from "./Web3FunctionUserArgs";

export type Web3FunctionContextData<T extends Web3FunctionOperation> =
  T extends "onRun"
    ? Web3FunctionOnRunContextData
    : T extends "onFail"
    ? Web3FunctionOnFailContextData
    : T extends "onSuccess"
    ? Web3FunctionOnSuccessContextData
    : never;

export type Web3FunctionOnRunContextData = Web3FunctionContextDataBase;
export interface Web3FunctionOnFailContextData
  extends Web3FunctionContextDataBase {
  onFailReason: FailReason;
  callData?: Web3FunctionResultCallData[];
  transactionHash?: string;
}
export interface Web3FunctionOnSuccessContextData
  extends Web3FunctionContextDataBase {
  transactionHash?: string;
}
export interface Web3FunctionContextDataBase {
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
    getKeys(): Promise<string[]>;
    getSize(): Promise<number>;
  };
}

export interface Web3FunctionEventContext extends Web3FunctionContext {
  log: Log;
}
export interface Web3FunctionSuccessContext extends Web3FunctionContext {
  transactionHash?: string;
}

export type FailReason =
  | "InsufficientFunds"
  | "SimulationFailed"
  | "ExecutionReverted";

export interface Web3FunctionFailContextBase extends Web3FunctionContext {
  reason: FailReason;
}

export interface Web3FunctionSimulationFailContext
  extends Web3FunctionFailContextBase {
  reason: "SimulationFailed";
  callData: Web3FunctionResultCallData[];
}
export interface Web3FunctionExecutionRevertedContext
  extends Web3FunctionFailContextBase {
  reason: "ExecutionReverted";
  transactionHash: string;
}

export interface Web3FunctionInsufficientFundsContext
  extends Web3FunctionFailContextBase {
  reason: "InsufficientFunds";
}

export type Web3FunctionFailContext =
  | Web3FunctionSimulationFailContext
  | Web3FunctionExecutionRevertedContext
  | Web3FunctionInsufficientFundsContext;
