import { JsResolverUserArgs } from "./JsResolverUserArgs";

export interface JsResolverSchema {
  jsResolverVersion: string;
  runtime: string;
  memory: number;
  timeout: number;
  userArgs: JsResolverUserArgs;
}
