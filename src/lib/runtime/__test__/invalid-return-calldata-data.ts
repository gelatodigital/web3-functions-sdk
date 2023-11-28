import { Web3Function } from "@gelatonetwork/web3-functions-sdk";

Web3Function.onRun(async () => {
  return {
    canExec: true,
    callData: [
      {
        to: "0x6a3c82330164822A8a39C7C0224D20DB35DD030a",
        data: "data",
      },
    ],
  };
});
