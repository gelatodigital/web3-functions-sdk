import { Web3FunctionStorage } from "../../types";
import { Web3FunctionResult } from "../../types/Web3FunctionResult";

export type Web3FunctionExecStats = {
  duration: number;
  memory: number;
  rpcCalls: { total: number; throttled: number };
  logs: string[];
  storage: Web3FunctionStorage & { size: number };
};

export type Web3FunctionExecSuccess = Web3FunctionExecStats & {
  success: true;
  result: Web3FunctionResult;
};

export type Web3FunctionExecFail = Web3FunctionExecStats & {
  success: false;
  error: Error;
};

export type Web3FunctionExec = Web3FunctionExecSuccess | Web3FunctionExecFail;
