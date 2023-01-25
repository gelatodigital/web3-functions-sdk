import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

Web3Function.onChecker(async (context: Web3FunctionContext) => {
  const proc = Deno.run({ cmd: ["whoami"] });
  console.log(proc);
  return { canExec: false, message: "Sandbox escaped cpu" };
});
