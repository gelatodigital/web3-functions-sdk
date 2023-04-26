import { MultiChainProviderConfig } from "../../provider";
import { Web3FunctionContextData } from "../../types/Web3FunctionContext";

export interface Web3FunctionRunnerOptions {
  memory: number;
  timeout: number;
  rpcLimit: number;
  runtime: "thread" | "docker";
  showLogs: boolean;
  web3FunctionVersion: string;
  serverPort?: number;
}

export interface Web3FunctionRunnerPayload {
  script: string;
  context: Web3FunctionContextData;
  options: Web3FunctionRunnerOptions;
  multiChainProviderConfig: MultiChainProviderConfig;
}
