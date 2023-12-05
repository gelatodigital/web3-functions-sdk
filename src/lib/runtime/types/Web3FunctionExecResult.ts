import {
  Web3FunctionCallbackStatus,
  Web3FunctionOperation,
  Web3FunctionStorageWithSize,
  Web3FunctionVersion,
} from "../../types";
import {
  Web3FunctionResultV1,
  Web3FunctionResultV2,
} from "../../types/Web3FunctionResult";

export type Web3FunctionThrottled = {
  memory?: boolean;
  storage?: boolean;
  duration?: boolean;
  rpcRequest?: boolean;
  networkRequest?: boolean;
  download?: boolean;
  upload?: boolean;
};

type Web3FunctionExecStats = {
  version: Web3FunctionVersion;
  duration: number;
  memory: number;
  rpcCalls: { total: number; throttled: number };
  logs: string[];
  network: {
    nbRequests: number;
    nbThrottled: number;
    download: number; // in KB
    upload: number; // in KB
  };
  throttled: Web3FunctionThrottled;
};

export type Web3FunctionExecSuccessBase = Web3FunctionExecStats & {
  success: true;
  storage: Web3FunctionStorageWithSize;
  callbacks: Web3FunctionCallbackStatus;
};

export type Web3FunctionExecSuccessV1 = Web3FunctionExecSuccessBase & {
  version: Web3FunctionVersion.V1_0_0;
  result: Web3FunctionResultV1;
};

export type Web3FunctionExecSuccessV2 = Web3FunctionExecSuccessBase & {
  version: Web3FunctionVersion.V2_0_0;
  result: Web3FunctionResultV2;
};

export type Web3FunctionExecSuccessCallback = Web3FunctionExecSuccessBase & {
  result: undefined;
};

export type Web3FunctionExecSuccess<T> = T extends "onRun"
  ? Web3FunctionExecSuccessV1 | Web3FunctionExecSuccessV2
  : Web3FunctionExecSuccessCallback;

export class Web3FunctionRuntimeError extends Error {
  throttledReason?: "memory" | "duration" | "rpcRequest";

  constructor(
    message: string,
    throttledReason?: "memory" | "duration" | "rpcRequest"
  ) {
    super(message);
    this.throttledReason = throttledReason;
  }
}

type Web3FunctionExecFail = Web3FunctionExecStats & {
  success: false;
  error: Web3FunctionRuntimeError;
  callbacks?: Web3FunctionCallbackStatus;
};

export type Web3FunctionExec<T extends Web3FunctionOperation = "onRun"> =
  | Web3FunctionExecSuccess<T>
  | Web3FunctionExecFail;
