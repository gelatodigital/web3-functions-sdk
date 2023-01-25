import {
  Web3FunctionSdk,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { setTimeout as delay } from "timers/promises";

Web3FunctionSdk.onChecker(async (context: Web3FunctionContext) => {
  await delay(5_000);
  return { canExec: false, message: "Waiting..." };
});
