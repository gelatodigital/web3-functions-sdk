import { JsResolverContextData } from "./Web3FunctionContext";
import { JsResolverResult } from "./Web3FunctionResult";

export type JsResolverEvent =
  | { action: "start"; data: { context: JsResolverContextData } }
  | {
      action: "error";
      data: {
        error: Error;
        storage: JsResolverStorage;
      };
    }
  | {
      action: "result";
      data: {
        result: JsResolverResult;
        storage: JsResolverStorage;
      };
    };

export type JsResolverStorage = {
  state: "updated" | "last";
  storage: { [key: string]: string | undefined };
};
