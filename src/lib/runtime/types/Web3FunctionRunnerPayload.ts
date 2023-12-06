import { MultiChainProviderConfig } from "../../provider";
import { Web3FunctionOperation, Web3FunctionVersion } from "../../types";
import { Web3FunctionContextData } from "../../types/Web3FunctionContext";

export interface Web3FunctionRunnerOptions {
  memory: number;
  timeout: number;
  rpcLimit: number;
  downloadLimit: number;
  uploadLimit: number;
  requestLimit: number;
  storageLimit: number;
  runtime: "thread" | "docker";
  showLogs: boolean;
  serverPort?: number;
  blacklistedHosts?: string[];
}

export interface Web3FunctionRunnerPayload<T extends Web3FunctionOperation> {
  script: string;
  context: Web3FunctionContextData<T>;
  options: Web3FunctionRunnerOptions;
  multiChainProviderConfig: MultiChainProviderConfig;
  version: Web3FunctionVersion;
}

export type Web3FunctionRunnerPayloadAny =
  Web3FunctionRunnerPayload<Web3FunctionOperation>;
