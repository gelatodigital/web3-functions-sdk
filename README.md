# Web3 Functions SDK && Web3 Functions Hardhat Plugin
This SDK allows builders to build & run Web3 Functions as well as provides a [hardhat plugin](#hardhat-plugin) for ease integration in Hardhat developer environments:

- [Getting Started with Web3 Functions](#getting-started-with-web3-functions)
- [Hardhat Plugin](#speed-run-devx-with-the-web3-function-hardhat-plugin)


<br /><br />

## Getting Started with Web3 Functions

### Project Setup
1. Install project dependencies
```
yarn install
```

2. If you want to use a private RPC provider, 
   - Copy `.env.example` to init your own `.env` file
  ```
  cp .env.example .env
  ```
   - Complete your `.env` file with your private settings

### Write a Web3Function

- Create a new file in `src/web3-functions`
- Register your web3Function main function using `Web3Function.onRun`
- Example:
```typescript
import { Web3Function, Web3FunctionContext } from "../lib";
import { Contract, ethers } from "ethers";
import ky from "ky"; // we recommend using ky as axios doesn't support fetch by default

const ORACLE_ABI = [
  "function lastUpdated() external view returns(uint256)",
  "function updatePrice(uint256)",
];

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, provider } = context;

  // Retrieve Last oracle update time
  const oracleAddress = "0x6a3c82330164822A8a39C7C0224D20DB35DD030a";
  const oracle = new Contract(oracleAddress, ORACLE_ABI, provider);
  const lastUpdated = parseInt(await oracle.lastUpdated());
  console.log(`Last oracle update: ${lastUpdated}`);

  // Check if it's ready for a new update
  const nextUpdateTime = lastUpdated + 300; // 5 min
  const timestamp = (await provider.getBlock("latest")).timestamp;
  console.log(`Next oracle update: ${nextUpdateTime}`);
  if (timestamp < nextUpdateTime) {
    return { canExec: false, message: `Time not elapsed` };
  }

  // Get current price on coingecko
  const currency = "ethereum";
  const priceData: any = await ky
    .get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${currency}&vs_currencies=usd`,
      { timeout: 5_000, retry: 0 }
    )
    .json();
  price = Math.floor(priceData[currency].usd);
  console.log(`Updating price: ${price}`);

  // Return execution call data
  return {
    canExec: true,
    callData: oracle.interface.encodeFunctionData("updatePrice", [price]),
  };
});
```
- create your web3Function `schema.json` to specify your runtime configuration:
```json
{
  "web3FunctionVersion": "2.0.0",
  "runtime": "js-1.0",
  "memory": 128, 
  "timeout": 30,
  "userArgs": {}
}
```


### Test your web3Function

- Use `yarn test FILENAME` command to test your web3Function

- Options:
  - `--logs` Show internal Web3Function logs
  - `--runtime=thread|docker` Use `thread` if you don't have `docker`set up locally (default: `thread`)
  - `--debug` Show Runtime debug messages
  - `--chain-id=[number]` Specify the chainId to be used for your Web3Function (default: `5`)

- Example: `yarn test src/web3-functions/index.ts --logs --runtime=thread`
- Output:
  ```
  Web3Function Build result:
  ✓ File: ./.tmp/index.js
  ✓ File size: 1.70mb
  ✓ Build time: 109.93ms

  Web3Function running logs:
  > ChainId: 5
  > Last oracle update: 1665512172
  > Next oracle update: 1665512472
  > Updating price: 1586

  Web3Function Result:
  ✓ Return value: {
    canExec: true,
    callData: '0x8d6cc56d0000000000000000000000000000000000000000000000000000000000000632'
  }

  Web3Function Runtime stats:
  ✓ Duration: 0.91s
  ✓ Memory: 57.77mb
  ```

### Deploy / Fetch Web3Function
Use `yarn deploy FILENAME` command to upload your web3Function.

```
> yarn deploy ./src/web3-functions/index.ts
```

### Use User arguments
1. Declare your expected `userArgs` in you schema, accepted types are 'string', 'string[]', 'number', 'number[]', 'boolean', 'boolean[]':
```json
{
  "web3FunctionVersion": "2.0.0",
  "runtime": "js-1.0",
  "memory": 128, 
  "timeout": 30,
  "userArgs": {
    "currency": "string",
    "oracle": "string"
  }
}
```

2. Access your `userArgs` from the Web3Function context:
```typescript
Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, secrets } = context;

  // User args:
  console.log('Currency:', userArgs.currency)
  console.log('Oracle:', userArgs.oracle)
  
});
```

3. Add `userArgs.json` in your web3 function folder:
```
{
  "oracle": "0x6a3c82330164822A8a39C7C0224D20DB35DD030a",
  "currency": "ethereum"
}
```

### Use Secrets (ie: environment variables)

Use secrets to store any private credentials that should not be published on IPFS with your web3 function.

1. Create a `.env` file in your web3 function folder, containing your key / value secrets:
```bash
API_KEY="XXXX"
```

2. Access your `secrets` from the Web3Function context:
```typescript
Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { secrets } = context;

  // Get api key from secrets
  const apiKey = await context.secrets.get("API_KEY");
  if (!apiKey)
    return { canExec: false, message: `API_KEY not set in secrets` };
    
});
```

3. When creating a task on Gelato UI, you will be asked to enter secrets. They will be store securely in Gelato Network.


### Use State / Storage

Web3Functions are stateless scripts, that will run in a new & empty memory context on every execution.
If you need to manage some state variable, we provide a simple key/value store that you can access from your web3Function `context`.

See the above example to read & update values from your storage:

```typescript
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { storage, provider } = context;

  // Use storage to retrieve previous state (stored values are always string)
  const lastBlockStr = (await storage.get("lastBlockNumber")) ?? "0";
  const lastBlock = parseInt(lastBlockStr);
  console.log(`Last block: ${lastBlock}`);

  const newBlock = await provider.getBlockNumber();
  console.log(`New block: ${newBlock}`);
  if (newBlock > lastBlock) {
    // Update storage to persist your current state (values must be cast to string)
    await storage.set("lastBlockNumber", newBlock.toString());
  }

  return {
    canExec: false,
    message: `Updated block number: ${newBlock.toString()}`,
  };
});
```

Test storage execution:
```
yarn test src/web3-functions/storage/index.ts --logs
```

You will see your updated key/values:
```
Simulated Web3Function Storage update:
 ✓ lastBlockNumber: '8321923'
```

To run your web3 function using mock storage values, add a `storage.json` in your web3 function folder:
```
{
  "lastBlockNumber": "8200000"
}
```



## Speed run DevX with the Web3 Function Hardhat Plugin

The Web3 Function Hardhat Plugin provides built-in hardhat tasks that wil speed your development as well as provide a great DevX for end to end testing.

In order to user the Hardhat Plugin you will need to:

### Config Hardhat 
Config `hardhat.config.ts` Web3 Functions Plugin

```ts
import "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
...
const config: HardhatUserConfig = {
w3f: {
  rootDir: "./web3-functions", //where your Web3 Function is located
  debug: false,
  networks: ["mumbai", "goerli", "baseGoerli"], //(multiChainProvider) injects provider for these networks
},
....
```

### Web3 Function Testing 
Use the following command to run your test:

`npx hardhat w3f-run W3F_NAME`

Example:<br/>
`npx hardhat w3f-run oracle`

### Deploy Web3 Function to IPFS

`npx hardhat w3f-deploy W3F_NAME`

Example:<br/>
`npx hardhat w3f-deploy oracle`

### e2e testing
The Web3 Function hardhat plugin exposes the `w3f` object that can be imported directly from hardhat.

This object will help you to instantiate your Web3 Function and run it.

```ts
  const { w3f } = hre;

  oracleW3f = w3f.get("W3F_NAME");

  userArgs = {
    currency: "ETH",
    oracleAddress: oracle.address,
  };
  let { result } = await oracleW3f.run({ userArgs });

  if (result.canExec) {
    const calldata = result.callData[0];
    await owner.sendTransaction({ to: calldata.to, data: calldata.data });
  }

  ```
