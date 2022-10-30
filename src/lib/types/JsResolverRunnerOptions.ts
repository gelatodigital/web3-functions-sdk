export interface JsResolverRunnerOptions {
  memory: number;
  timeout: number;
  runtime: "thread" | "docker";
  showLogs: boolean;
}
