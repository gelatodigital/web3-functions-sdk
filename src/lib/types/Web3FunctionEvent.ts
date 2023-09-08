import { Web3FunctionContextData } from "./Web3FunctionContext";
import { Web3FunctionResult } from "./Web3FunctionResult";

export type Web3FunctionEvent =
  | { action: "start"; data: { context: Web3FunctionContextData } }
  | {
      action: "error";
      data: {
        error: Error;
        storage: Web3FunctionStorage;
      };
    }
  | {
      action: "result";
      data: {
        result: Web3FunctionResult;
        storage: Web3FunctionStorage;
      };
    };

export type Web3FunctionStorage = {
  state: "updated" | "last";
  storage: { [key: string]: string | undefined };
  diff: object;
};

export type Web3FunctionStorageWithSize = Web3FunctionStorage & {
  size: number;
};
