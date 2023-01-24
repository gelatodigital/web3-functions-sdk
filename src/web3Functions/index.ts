import {
  JsResolverSdk,
  JsResolverContext,
} from "@gelatonetwork/js-resolver-sdk";
import { Contract } from "ethers";
import ky from "ky"; // we recommend using ky as axios doesn't support fetch by default

const ORACLE_ABI = [
  "function lastUpdated() external view returns(uint256)",
  "function updatePrice(uint256)",
];

JsResolverSdk.onChecker(async (context: JsResolverContext) => {
  const { gelatoArgs, provider } = context;

  // Retrieve Last oracle update time
  let lastUpdated;
  let oracle;
  try {
    const oracleAddress = "0x6a3c82330164822A8a39C7C0224D20DB35DD030a";
    oracle = new Contract(oracleAddress, ORACLE_ABI, provider);
    lastUpdated = parseInt(await oracle.lastUpdated());
    console.log(`Last oracle update: ${lastUpdated}`);
  } catch (err) {
    return { canExec: false, message: `Rpc call failed` };
  }

  // Check if it's ready for a new update
  const nextUpdateTime = lastUpdated + 300; // 5 min
  const timestamp = gelatoArgs.blockTime;
  console.log(`Next oracle update: ${nextUpdateTime}`);
  if (timestamp < nextUpdateTime) {
    return { canExec: false, message: `Time not elapsed` };
  }

  // Get current price on coingecko
  const currency = "ethereum";
  let price = 0;
  try {
    const priceData: any = await ky
      .get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${currency}&vs_currencies=usd`,
        { timeout: 5_000, retry: 0 }
      )
      .json();
    price = Math.floor(priceData[currency].usd);
  } catch (err) {
    console.log(`Coingecko call failed: ${err.message}`);
    return { canExec: false, message: `Coingecko call failed: ${err.message}` };
  }
  console.log(`Updating price: ${price}`);

  // Return execution call data
  return {
    canExec: true,
    callData: oracle.interface.encodeFunctionData("updatePrice", [price]),
  };
});
