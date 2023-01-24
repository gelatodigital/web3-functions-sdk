import { JsResolverStorage } from "../../types";
import { JsResolverResult } from "../../types/Web3FunctionResult";

type JsResolverExecStats = {
  duration: number;
  memory: number;
  rpcCalls: { total: number; throttled: number };
  logs: string[];
  storage: JsResolverStorage;
};

type JsResolverExecSuccess = JsResolverExecStats & {
  success: true;
  result: JsResolverResult;
};

type JsResolverExecFail = JsResolverExecStats & {
  success: false;
  error: Error;
};

export type JsResolverExec = JsResolverExecSuccess | JsResolverExecFail;
