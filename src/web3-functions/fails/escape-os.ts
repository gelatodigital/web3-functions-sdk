import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const os = await Deno.osRelease();
  console.log(os);
  return { canExec: false, message: "Sandbox escaped os" };
});
