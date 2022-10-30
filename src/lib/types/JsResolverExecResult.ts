import { JsResolverResult } from "./JsResolverResult";

type JsResolverExecStats = {
  duration: number;
  memory: number;
  logs: string[];
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
