import { Contract } from "@ethersproject/contracts";
import { StaticJsonRpcProvider } from "@ethersproject/providers";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import ky from "ky";

const assert = {
  match: (a: string, b: RegExp) => {
    if (!b.test(a)) {
      console.error(`AssertFail: ${a} is not matching ${b}`);
      Deno.exit(1);
    }
  },
  instanceOf: (a: any, b: ObjectConstructor) => {
    if (!(a instanceof b)) {
      console.error(`AssertFail: ${a} is not an instance of ${b}`);
      Deno.exit(1);
    }
  },
};

const ORACLE_ABI = [
  "function lastUpdated() external view returns(uint256)",
  "function updatePrice(uint256)",
];

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { multiChainProvider } = context;

  const provider = multiChainProvider.default();
  // Test sending invalid request
  let failure = "";
  try {
    await provider.send("eth_test", []);
  } catch (err) {
    failure = err.message;
    console.log("Invalid Rpc method error:", failure);
  }
  assert.match(failure, /"code":-32601/);
  assert.match(failure, /the method eth_test does not exist|Method not found/);

  // Test sending invalid params
  try {
    await provider.send("eth_call", ["", "", ""]);
  } catch (err) {
    failure = err.message;
    console.log("Invalid Rpc params error:", err.message);
  }
  assert.match(failure, /"code":-32602/);
  assert.match(failure, /invalid argument 0/);

  // Test sending http query
  try {
    const res = await ky
      .post((provider as StaticJsonRpcProvider).connection.url)
      .text();
    console.log(res);
    failure = res;
  } catch (err) {
    console.log("Invalid Rpc request error:", err.message);
  }
  assert.match(failure, /"code":-32600/);
  assert.match(failure, /The JSON sent is not a valid Request object/);

  // Test soft rate limits
  const oracleAddress = "0x6a3c82330164822A8a39C7C0224D20DB35DD030a";
  const oracle = new Contract(oracleAddress, ORACLE_ABI, provider);
  let value;
  try {
    const promises: Promise<any>[] = [];
    for (let i = 0; i < 5; i++) promises.push(oracle.lastUpdated());
    value = await Promise.race(promises);
  } catch (err) {
    console.log("Throttling RPC calls error:", err.message);
    value = err.message;
  }
  assert.match(value.toString(), /\d+/);

  // Test hard rate limits
  for (let j = 0; j < 20; j++) {
    try {
      await Promise.all(Array.from({ length: 10 }, () => oracle.lastUpdated()));
    } catch (err) {
      failure = err.message;
      console.log("Throttling RPC calls error:", err.message);
    }
  }
  assert.match(failure, /"code":-32005/);
  assert.match(failure, /Request limit exceeded/);

  return { canExec: false, message: "RPC providers tests ok!" };
});
