export type Web3FunctionResult =
  | {
      canExec: true;
      callData: Web3FunctionResultCallData[];
    }
  | { canExec: false; message: string };

export type Web3FunctionResultCallData = {
  to: string;
  data: string;
};
