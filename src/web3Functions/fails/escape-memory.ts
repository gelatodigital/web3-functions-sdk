import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/js-resolver-sdk";

Web3Function.onChecker(async (context: Web3FunctionContext) => {
  const arr: string[] = [];
  while (arr.length < 1_000_000_000) {
    arr.push(`Do we have access to infinite memory?`);
  }
  return { canExec: false, message: "Sandbox escaped Memory" };
});
