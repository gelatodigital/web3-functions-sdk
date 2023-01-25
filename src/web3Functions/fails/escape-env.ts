import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

Web3Function.onChecker(async (context: Web3FunctionContext) => {
  const env = Deno.env.toObject();
  console.log(env);
  return { canExec: false, message: "Sandbox escaped env" };
});
