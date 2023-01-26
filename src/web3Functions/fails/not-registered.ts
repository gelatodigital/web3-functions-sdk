import { Web3FunctionContext 
} from "@gelatonetwork/web3-functions-sdk";

const main = async (context: Web3FunctionContext) => {
  return { canExec: false, message: "Sandbox escaped timeout" };
};
