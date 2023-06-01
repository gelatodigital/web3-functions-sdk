// src/lib/builder/__test__/valid-schema/index.ts
import {
  Web3Function
} from "@gelatonetwork/web3-functions-sdk";
Web3Function.onRun(async (context) => {
  return {
    canExec: false,
    message: "simple-test"
  };
});
