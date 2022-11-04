import { JsResolverSdk, JsResolverContext } from "../lib";
import { Contract, ethers } from "ethers";
import axios from "axios";

const ORACLE_ABI = [
  "function lastUpdated() external view returns(uint256)",
  "function updatePrice(uint256)",
];

JsResolverSdk.onChecker(async (context: JsResolverContext) => {
  const { userArgs, gelatoArgs, secrets } = context;

  // Use default ethers provider or your own using secrets api key
  console.log("ChainId:", context.gelatoArgs.chainId);
  const rpcProvider = ethers.getDefaultProvider(context.gelatoArgs.chainId, {
    alchemy: await secrets.get("ALCHEMY_ID"),
  });

  // Retrieve Last oracle update time
  let lastUpdated;
  let oracle;
  try {
    const oracleAddress =
      userArgs.oracleAddress ?? "0x6a3c82330164822A8a39C7C0224D20DB35DD030a";
    oracle = new Contract(oracleAddress, ORACLE_ABI, rpcProvider);
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
  const currency = userArgs.currency ?? "ethereum";
  let price = 0;
  try {
    const priceData = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${currency}&vs_currencies=usd`,
      { timeout: 5_000 }
    );
    price = Math.floor(priceData.data[currency].usd);
  } catch (err) {
    return { canExec: false, message: `Coingecko call failed` };
  }
  console.log(`Updating price: ${price}`);

  // Return execution call data
  return {
    canExec: true,
    callData: oracle.interface.encodeFunctionData("updatePrice", [price]),
  };
});
