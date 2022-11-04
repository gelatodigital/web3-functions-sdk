import { JsResolverContextData } from "./JsResolverContext";

export interface JsResolverRunnerOptions {
  memory: number;
  timeout: number;
  runtime: "thread" | "docker";
  showLogs: boolean;
  serverPort?: number;
}

export interface JsResolverRunnerPayload {
  script: string;
  context: JsResolverContextData;
  options: JsResolverRunnerOptions;
}
