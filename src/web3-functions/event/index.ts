import {
  Web3Function,
  Web3FunctionEventContext,
} from "@gelatonetwork/web3-functions-sdk";

Web3Function.onRun(async (context: Web3FunctionEventContext) => {
  const { log } = context;

  if (log.blockNumber !== 9727562) {
    throw new Error("Log file fetched invalid");
  }

  return {
    canExec: false,
    message: `Log fetched from file`,
  };
});
