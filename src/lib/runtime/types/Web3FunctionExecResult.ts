import { Web3FunctionStorageWithSize, Web3FunctionVersion } from "../../types";
import {
  Web3FunctionResultV1,
  Web3FunctionResultV2,
} from "../../types/Web3FunctionResult";

type Web3FunctionExecStats = {
  version: Web3FunctionVersion;
  duration: number;
  memory: number;
  rpcCalls: { total: number; throttled: number };
  logs: string[];
  network: {
    nbRequests: number;
    download: number; // in KB
    upload: number; // in KB
  };
};

type Web3FunctionExecSuccessBase = Web3FunctionExecStats & {
  success: true;
  storage: Web3FunctionStorageWithSize;
};

type Web3FunctionExecSuccessV1 = Web3FunctionExecSuccessBase & {
  version: Web3FunctionVersion.V1_0_0;
  result: Web3FunctionResultV1;
};

type Web3FunctionExecSuccessV2 = Web3FunctionExecSuccessBase & {
  version: Web3FunctionVersion.V2_0_0;
  result: Web3FunctionResultV2;
};

export type Web3FunctionExecSuccess =
  | Web3FunctionExecSuccessV1
  | Web3FunctionExecSuccessV2;

type Web3FunctionExecFail = Web3FunctionExecStats & {
  success: false;
  error: Error;
};

export type Web3FunctionExec = Web3FunctionExecSuccess | Web3FunctionExecFail;
