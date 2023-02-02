import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import ky from "ky";
import { Contract, ethers } from "ethers";
const delay = (time: number) => new Promise((res) => setTimeout(res, time));

const ORACLE_ABI = [
  "function lastUpdated() external view returns(uint256)",
  "function updatePrice(uint256)",
];

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { provider } = context;

  // Test soft rate limits
  const oracleAddress = "0x6a3c82330164822A8a39C7C0224D20DB35DD030a";
  const oracle = new Contract(oracleAddress, ORACLE_ABI, provider);
  try {
    const promises: Promise<any>[] = [];
    for (let i = 0; i < 20; i++) promises.push(oracle.lastUpdated());
    await Promise.race(promises);
  } catch (err) {
    console.log("Throttling RPC calls error:", err.message);
  }

  await delay(9000);

  return { canExec: false, message: "RPC providers tests ok!" };
});
