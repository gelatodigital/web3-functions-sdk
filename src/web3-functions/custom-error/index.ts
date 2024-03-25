import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

import { Contract } from "@ethersproject/contracts";

export const abi = [
  {
    inputs: [{ internalType: "uint256", name: "random", type: "uint256" }],
    name: "CustomError",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "_param", type: "uint256" }],
    name: "throwCustom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// To run against Arbitrum Sepolia:
// yarn test src/web3-functions/custom-error/index.ts --logs --chain-id=421614

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const ERRORS_CONTRACT = "0xac9f91277cCbb5d270e27246b203B221023A0e06";

  const { multiChainProvider } = context;
  let provider = multiChainProvider.default();

  const errorContract = new Contract(ERRORS_CONTRACT, abi, provider);

  try {
    const res = await errorContract.callStatic.throwCustom(10);
  } catch (error: any) {
    console.log("error message ", error.message);
    console.log("error data: ", error.data);
    const ei = errorContract.interface.parseError(error.data);
    console.log("error name: ", ei.name);
    console.log("error args: ", ei.args);
  }

  return {
    canExec: false,
    message: "executed",
  };
});
