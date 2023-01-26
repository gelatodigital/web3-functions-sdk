import { ethers } from "ethers";
import { Web3FunctionContextData } from "../../types/Web3FunctionContext";

export interface Web3FunctionRunnerOptions {
  memory: number;
  timeout: number;
  runtime: "thread" | "docker";
  showLogs: boolean;
  serverPort?: number;
}

export interface Web3FunctionRunnerPayload {
  script: string;
  context: Web3FunctionContextData;
  options: Web3FunctionRunnerOptions;
  provider: ethers.providers.StaticJsonRpcProvider;
}
