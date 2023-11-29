import {
  Web3Function,
  Web3FunctionContext,
  Web3FunctionFailContext,
  Web3FunctionSuccessContext,
} from "@gelatonetwork/web3-functions-sdk";

const ORACLE_ABI = [
  "function lastUpdated() external view returns(uint256)",
  "function updatePrice(uint256)",
];

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, multiChainProvider } = context;

  const provider = multiChainProvider.default();

  const canExec = Boolean(userArgs.canExec);

  if (canExec) {
    return { canExec, callData: "0x00000000" };
  } else {
    return { canExec, message: "onRun" };
  }
});

Web3Function.onFail(async (context: Web3FunctionFailContext) => {
  const { userArgs, reason } = context;

  console.log("userArgs: ", userArgs.canExec);

  if (reason === "ExecutionReverted") {
    console.log(`onFail: ${reason} txHash: ${context.transactionHash}`);
  } else if (reason === "SimulationFailed") {
    console.log(`onFail: ${reason} callData: ${context.callData}`);
  } else {
    console.log(`onFail: ${reason}`);
  }
});

Web3Function.onSuccess(async (context: Web3FunctionSuccessContext) => {
  const { userArgs, transactionHash } = context;

  console.log("userArgs: ", userArgs.canExec);
  console.log("onSuccess: txHash: ", transactionHash);
});
