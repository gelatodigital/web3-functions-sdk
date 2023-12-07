import { Web3FunctionContextData } from "./Web3FunctionContext";
import { Web3FunctionResult } from "./Web3FunctionResult";

export type Web3FunctionEvent =
  | {
      action: "start";
      data:
        | {
            operation: "onRun";
            context: Web3FunctionContextData<"onRun">;
          }
        | {
            operation: "onFail";
            context: Web3FunctionContextData<"onFail">;
          }
        | {
            operation: "onSuccess";
            context: Web3FunctionContextData<"onSuccess">;
          };
    }
  | {
      action: "error";
      data: {
        error: Error;
        storage: Web3FunctionStorage;
        callbacks: Web3FunctionCallbackStatus;
      };
    }
  | {
      action: "result";
      data: {
        result: Web3FunctionResult | undefined;
        storage: Web3FunctionStorage;
        callbacks: Web3FunctionCallbackStatus;
      };
    };

export type Web3FunctionCallbackStatus = {
  onSuccess: boolean;
  onFail: boolean;
};

export type Web3FunctionStorage = {
  state: "updated" | "last";
  storage: { [key: string]: string | undefined };
  diff: object;
};

export type Web3FunctionStorageWithSize = Web3FunctionStorage & {
  size: number;
};
