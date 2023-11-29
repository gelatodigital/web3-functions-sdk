import {
  Web3FunctionContext,
  Web3FunctionEventContext,
  Web3FunctionFailContext,
  Web3FunctionSuccessContext,
} from "./Web3FunctionContext";
import { Web3FunctionResult } from "./Web3FunctionResult";

export type BaseRunHandler = (
  ctx: Web3FunctionContext
) => Promise<Web3FunctionResult>;
export type EventRunHandler = (
  ctx: Web3FunctionEventContext
) => Promise<Web3FunctionResult>;
export type RunHandler = BaseRunHandler | EventRunHandler;

type BaseFailHandler = (ctx: Web3FunctionFailContext) => Promise<void>;
export type FailHandler = BaseFailHandler;

type BaseSuccessHandler = (ctx: Web3FunctionSuccessContext) => Promise<void>;
export type SuccessHandler = BaseSuccessHandler;
