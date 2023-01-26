export type Web3FunctionResult =
  | { canExec: true; callData: string }
  | { canExec: false; message: string };
