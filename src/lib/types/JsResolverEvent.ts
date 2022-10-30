import { JsResolverContextData } from "./JsResolverContext";
import { JsResolverResult } from "./JsResolverResult";

export type LogLevel = "info" | "debug" | "warn" | "error";

export type JsResolverEvent =
  | { action: "start"; data: { context: JsResolverContextData } }
  | { action: "error"; data: { error: Error } }
  | {
      action: "result";
      data: { result: JsResolverResult };
    };
