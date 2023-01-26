export interface Web3FunctionSchema {
  web3FunctionVersion: string;
  runtime: string;
  memory: number;
  timeout: number;
  userArgs: Web3FunctionUserArgsSchema;
}

export interface Web3FunctionUserArgsSchema {
  [key: string]:
    | "string"
    | "number"
    | "boolean"
    | "string[]"
    | "number[]"
    | "boolean[]";
}
