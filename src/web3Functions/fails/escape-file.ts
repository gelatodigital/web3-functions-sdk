import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

Web3Function.onChecker(async (context: Web3FunctionContext) => {
  const conf = await Deno.readTextFile("./.env");
  console.log(conf);
  return { canExec: false, message: "Sandbox escaped file system" };
});
