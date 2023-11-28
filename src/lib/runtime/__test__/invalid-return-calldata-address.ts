import { Web3Function } from "@gelatonetwork/web3-functions-sdk";

Web3Function.onRun(async () => {
  return {
    canExec: true,
    callData: [
      {
        to: "address",
        data: "0x0",
      },
    ],
  };
});
