import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

const delay = (time: number) => new Promise((res) => setTimeout(res, time));

Web3Function.onRun(async (_context: Web3FunctionContext) => {
  Promise.resolve().then(() => JSON.parse("invalid json"));
  await delay(1000);
  return { canExec: false, message: "Throw uncaught exception" };
});
