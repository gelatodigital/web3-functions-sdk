import { Web3Function } from "nothing";

Web3Function.onChecker(async (context) => {
  return { canExec: false, message: "Malformed import" };
});
