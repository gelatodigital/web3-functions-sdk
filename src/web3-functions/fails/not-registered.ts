import { Web3FunctionContext } from "@gelatonetwork/web3-functions-sdk";

const main = async (context: Web3FunctionContext) => {
  return { canExec: false, message: "Sandbox escaped timeout" };
};

const delay = (time: number) => new Promise((res) => setTimeout(res, time));
delay(3600_000).then(() => console.log("Not registered"));
