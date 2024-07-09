import { Contract } from "@ethersproject/contracts";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import ky from "ky"; // we recommend using ky as axios doesn't support fetch by default

const ORACLE_ABI = [
  "function lastUpdated() external view returns(uint256)",
  "function updatePrice(uint256)",
];

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, multiChainProvider } = context;

  const provider = multiChainProvider.default();

  // Retrieve Last oracle update time
  let lastUpdated;
  let oracle;

  const oracleAddress = userArgs.oracle as string;

  try {
    oracle = new Contract(oracleAddress, ORACLE_ABI, provider);
    lastUpdated = parseInt(await oracle.lastUpdated());
    console.log(`Last oracle update: ${lastUpdated}`);

    // Check if it's ready for a new update
    const nextUpdateTime = lastUpdated + 300; // 5 min
    const timestamp = (await provider.getBlock("latest")).timestamp;
    console.log(`Next oracle update: ${nextUpdateTime}`);
    if (timestamp < nextUpdateTime) {
      return { canExec: false, message: `Time not elapsed` };
    }
  } catch (err) {
    console.log(`Error: ${err.message}`);
    return { canExec: false, message: `Rpc call failed` };
  }

  // Get current price on coingecko
  const currency = userArgs.currency as string;
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
    return { canExec: false, message: `Coingecko call failed` };
  }
  console.log(`Updating price: ${price}`);

  // Return execution call data
  return {
    canExec: true,
    callData: [
      {
        to: oracleAddress,
        data: oracle.interface.encodeFunctionData("updatePrice", [price]),
      },
    ],
  };
});
