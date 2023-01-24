import {
  Web3FunctionSdk,
  Web3FunctionContext,
} from "@gelatonetwork/web3-function-sdk";

Web3FunctionSdk.onChecker(async (context: Web3FunctionContext) => {
  const env = Deno.env.toObject();
  console.log(env);
  return { canExec: false, message: "Sandbox escaped env" };
});
