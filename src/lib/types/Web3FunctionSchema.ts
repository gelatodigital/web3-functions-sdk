export interface JsResolverSchema {
  jsResolverVersion: string;
  runtime: string;
  memory: number;
  timeout: number;
  userArgs: JsResolverUserArgsSchema;
}

export interface JsResolverUserArgsSchema {
  [key: string]:
    | "string"
    | "number"
    | "boolean"
    | "string[]"
    | "number[]"
    | "boolean[]";
}
