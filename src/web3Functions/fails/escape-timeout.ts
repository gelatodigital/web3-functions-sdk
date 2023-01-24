import {
  Web3FunctionSdk,
  Web3FunctionContext,
} from "@gelatonetwork/web3-function-sdk";

const delay = (time: number) => new Promise((res) => setTimeout(res, time));

Web3FunctionSdk.onChecker(async (context: Web3FunctionContext) => {
  await delay(3600_000);
  return { canExec: false, message: "Sandbox escaped timeout" };
});
