import {
  Web3FunctionSdk,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

Web3FunctionSdk.onChecker(async (context: Web3FunctionContext) => {
  const proc = Deno.run({ cmd: ["whoami"] });
  console.log(proc);
  return { canExec: false, message: "Sandbox escaped cpu" };
});
