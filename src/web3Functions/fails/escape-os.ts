import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/js-resolver-sdk";

Web3Function.onChecker(async (context: Web3FunctionContext) => {
  const os = await Deno.osRelease();
  console.log(os);
  return { canExec: false, message: "Sandbox escaped os" };
});
