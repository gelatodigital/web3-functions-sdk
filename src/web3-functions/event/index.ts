import {
  Web3Function,
  Web3FunctionEventContext,
} from "@gelatonetwork/web3-functions-sdk";

import { Interface } from "@ethersproject/abi";

const abi = [
  `event ExecSuccess(
        uint256 indexed txFee,
        address indexed feeToken,
        address indexed execAddress,
        bytes execData,
        bytes32 taskId,
        bool callSuccess
    )`,
];

Web3Function.onRun(async (context: Web3FunctionEventContext) => {
  const { log } = context;

  if (log.blockNumber !== 9727562) {
    throw new Error("Log file fetched invalid");
  }

  const contractInterface = new Interface(abi);

  const description = contractInterface.parseLog(log);

  if (description.name !== "ExecSuccess") {
    throw new Error("Log is unexpected");
  }

  return {
    canExec: false,
    message: `Log fetched from file`,
  };
});
