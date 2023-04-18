export type Web3FunctionResult<V extends "v1" | undefined = undefined> =
  | {
      canExec: true;
      callData: V extends "v1" ? string : Web3FunctionResultCallData[];
    }
  | { canExec: false; message: string };

export type Web3FunctionResultCallData = {
  to: string;
  data: string;
  value?: string;
};
