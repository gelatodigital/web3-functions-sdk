import { Web3Function } from "@gelatonetwork/web3-functions-sdk";

Web3Function.onRun(async () => {
  return { canExec: false, message: "Simple" };
});
