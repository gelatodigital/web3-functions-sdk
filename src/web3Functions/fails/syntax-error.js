import { Web3FunctionSdk } from "nothing";

Web3FunctionSdk.onChecker(async (context) => {
  return { canExec: false, message: "Malformed import" };
});
