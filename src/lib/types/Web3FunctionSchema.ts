export enum Web3FunctionVersion {
  V1_0_0 = "1.0.0",
  V2_0_0 = "2.0.0",
}

export enum Web3FunctionExecutionMode {
  SEQUENTIAL = "sequential",
  PARALLEL = "parallel",
}

export interface Web3FunctionSchema {
  web3FunctionVersion: Web3FunctionVersion;
  runtime: string;
  memory: number;
  timeout: number;
  userArgs: Web3FunctionUserArgsSchema;
  executionMode?: Web3FunctionExecutionMode;
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
