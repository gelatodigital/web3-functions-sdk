import {
  JsResolverSdk,
  JsResolverContext,
} from "@gelatonetwork/js-resolver-sdk";
import ky from "ky";
import { BigNumber, Contract, ethers } from "ethers";

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

JsResolverSdk.onChecker(async (context: JsResolverContext) => {
  const { provider } = context;

  // Test sending invalid request
  let failure = "";
  try {
    await provider.send("eth_test", []);
  } catch (err) {
    failure = err.message;
    console.log("Invalid Rpc method error:", err.message);
  }
  assert.match(failure, /\"code\":-32600/);
  assert.match(failure, /Unsupported method: eth_test/);

  // Test sending invalid params
  try {
    await provider.send("eth_call", ["", "", ""]);
  } catch (err) {
    failure = err.message;
    console.log("Invalid Rpc params error:", err.message);
  }
  assert.match(failure, /\"code\":-32602/);
  assert.match(failure, /invalid 1st argument/);

  // Test sending http query
  try {
    const res = await ky
      .post((provider as ethers.providers.JsonRpcProvider).connection.url)
      .text();
    console.log(res);
    failure = res;
  } catch (err) {
    console.log("Invalid Rpc request error:", err.message);
  }
  assert.match(failure, /\"code\":-32600/);
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
  try {
    const promises: Promise<any>[] = [];
    for (let i = 0; i < 100; i++) promises.push(oracle.lastUpdated());
    const values = await Promise.all(promises);
    console.log(`Call results:`, values);
  } catch (err) {
    failure = err.message;
    console.log("Throttling RPC calls error:", err.message);
  }
  assert.match(failure, /\"code\":-32005/);
  assert.match(failure, /Request limit exceeded/);

  return { canExec: false, message: "RPC providers tests ok!" };
});
