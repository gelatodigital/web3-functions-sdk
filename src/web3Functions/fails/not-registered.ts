import { Web3FunctionContext } from "@gelatonetwork/js-resolver-sdk";

const main = async (context: Web3FunctionContext) => {
  return { canExec: false, message: "Sandbox escaped timeout" };
};
