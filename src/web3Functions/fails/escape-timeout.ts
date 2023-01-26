import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

const delay = (time: number) => new Promise((res) => setTimeout(res, time));

Web3Function.onRun(async (context: Web3FunctionContext) => {
  await delay(3600_000);
  return { canExec: false, message: "Sandbox escaped timeout" };
});
