import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

Web3Function.onRun(async (context: Web3FunctionContext) => {
  // Return execution call data
  return {
    canExec: false,
    message: "simple-test",
  };
});
