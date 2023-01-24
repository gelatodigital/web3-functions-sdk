import {
  Web3FunctionSdk,
  Web3FunctionContext,
} from "@gelatonetwork/web3-function-sdk";

const delay = (time: number) => new Promise((res) => setTimeout(res, time));

Web3FunctionSdk.onChecker(async (_context: Web3FunctionContext) => {
  await delay(1000);
  Deno.exit(0);
  return { canExec: false, message: "Exit before result" };
});
