import { JsResolverStorage } from "../../types";
import { JsResolverResult } from "../../types/JsResolverResult";

type JsResolverExecStats = {
  duration: number;
  memory: number;
  rpcCalls: { total: number; throttled: number };
  logs: string[];
};

type JsResolverExecSuccess = JsResolverExecStats & {
  success: true;
  result: JsResolverResult;
  storage: JsResolverStorage;
};

type JsResolverExecFail = JsResolverExecStats & {
  success: false;
  error: Error;
  storage: JsResolverStorage;
};

export type JsResolverExec = JsResolverExecSuccess | JsResolverExecFail;
