import {
  Web3FunctionSdk,
  Web3FunctionContext,
} from "@gelatonetwork/web3-function-sdk";

Web3FunctionSdk.onChecker(async (context: Web3FunctionContext) => {
  const os = await Deno.osRelease();
  console.log(os);
  return { canExec: false, message: "Sandbox escaped os" };
});
