import { Web3Function } from "nothing";

Web3Function.onRun(async (context) => {
  return { canExec: false, message: "Malformed import" };
});
