import { Web3Function } from "@gelatonetwork/web3-functions-sdk";

Web3Function.onRun(async () => {
  const msg = "hello" as unknown as boolean;
  return { canExec: msg, message: "Simple" };
});
