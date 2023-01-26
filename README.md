# Web3 Functions SDK
SDK to build & run Web3 Functions
<br /><br />

## Project Setup
1. Install project dependencies
```
yarn install
```

2. If you want to use a private RPC provider, 
   - Copy `.env_example` to init your own `.env` file
  ```
  cp .env_example .env
  ```
   - Complete your `.env` file with your private settings

## Write a Web3Function

- Create a new file in `src/web3Functions`
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
  const timestamp = gelatoArgs.blockTime;
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
  "web3FunctionVersion": "1.0.0",
  "runtime": "js-1.0",
  "memory": 128, 
  "timeout": 30,
  "userArgs": {}
}
```


## Test your web3Function

- Use `yarn test FILENAME` command to test your web3Function

- Options:
  - `--show-logs` Show internal Web3Function logs
  - `--runtime=thread|docker` Use `thread` if you don't have `docker`set up locally (default: `docker`)
  - `--debug` Show Runtime debug messages
  - `--chain-id=[number]` Specify the chainId to be used for your Web3Function (default: `5`)
  - `--user-args=[key]:[value]` Set your Web3Function user args

- Example: `yarn test src/web3Functions/index.ts --show-logs --runtime=thread`
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

## Deploy / Fetch Web3Function
Use `yarn deploy FILENAME` command to upload your web3Function.

```
> yarn deploy ./src/web3Functions/index.ts
```

## Use User arguments
1. Declare your expected `userArgs` in you schema, accepted types are 'string', 'string[]', 'number', 'number[]', 'boolean', 'boolean[]':
```json
{
  "web3FunctionVersion": "1.0.0",
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

3. Pass `user-args` to the CLI to test your web3Function:
```
yarn test src/web3Function/oracle/index.ts --show-logs --user-args=currency:ethereum --user-args=oracle:0x6a3c82330164822A8a39C7C0224D20DB35DD030a
```

To pass array argument (eg `string[]`), you can use:
```
--user-args=arr:\[\"a\"\,\"b\"\]
```

## Use State / Storage

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
yarn test src/web3Functions/storage/index.ts --show-logs
```

You will see your updated key/values:
```
Web3Function Storage updated:
 ✓ lastBlockNumber: '8321923'
```

## Benchmark / Load testing

- Use `yarn benchmark FILENAME` command to run a test load

- Options:
  - all `test` command options
  - `--load=100` configure the number of web3Functions you want to run for your load test (default: `10`)
  - `--pool=10` configure the pool size, ie max number of concurrent worker (default: `10`)

- Example: `yarn benchmark src/web3Functions/index.ts --load=100 --pool=10`
- Output:
  ```  
  Benchmark result:
  - nb success: 100/100
  - duration: 64s
  ```



## Failure tests
Some example failing file to test error handling
- Syntax error in the web3Function:
  - Run: `yarn test src/web3Functions/fails/syntax-error.js`
  - Result:
  ```
  Web3Function building...
  ✘ [ERROR] Could not resolve "nothing"

      src/web3Functions/fails/syntax-error.js:1:30:
        1 │ import { Web3Function } from "nothing";
          ╵                               ~~~~~~~~~

    You can mark the path "nothing" as external to exclude it from the bundle, which will remove this
    error.


  Web3Function Build result:
  ✗ Error: Build failed with 1 error:
  src/web3Functions/fails/syntax-error.js:1:30: ERROR: Could not resolve "nothing"
  ```

- No `onRun` function registered in the web3Function:
  - Run: `yarn test src/web3Functions/fails/not-registered.ts`
  - Result:
  ```
  Web3Function Result:
  ✗ Error: Web3Function start-up timeout (5s)
  Make sure you registered your web3 function correctly in your script.
  ```

- Web3Function run out of memory:
  - Run: `yarn test src/web3Functions/fails/escape-memory.ts`
  - Result
  ```
  Web3Function Result:
  ✗ Error: Web3Function sandbox exited with code=137

  Web3Function Runtime stats:
  ✓ Duration: 1.91s
  ✗ Memory: 31.97mb
  ```

- Web3Function exceed timeout:
   - Run: `yarn test src/web3Functions/fails/escape-timeout.ts`
   - Result:
  ```
  Web3Function Result:
  ✗ Error: Web3Function exceed execution timeout (10s)

  Web3Function Runtime stats:
  ✗ Duration: 10.97s
  ✓ Memory: 25.34mb
  ```

- Web3Function ends without returning result:
  - Run: `yarn test src/web3Functions/fails/no-result.ts`
  - Result:
  ```
  Web3Function Result:
  ✗ Error: Web3Function exited without returning result
  ```

- Web3Function try to access env:
  - Run: `yarn test src/web3Functions/fails/escape-env.ts`
  - Result:
  ```
  Web3Function Result:
  ✗ Error: PermissionDenied: Requires env access to all, run again with the --allow-env flag
  ```

- Web3Function try to access file system:
  - Run: `yarn test src/web3Functions/fails/escape-file.ts`
  - Result:
  ```
  Web3Function Result:
  ✗ Error: PermissionDenied: Requires read access to "./.env", run again with the --allow-read flag
  ```

- Web3Function try to access os:
  - Run: `yarn test src/web3Functions/fails/escape-os.ts`
  - Result:
  ```
  Web3Function Result:
  ✗ Error: PermissionDenied: Requires sys access to "osRelease", run again with the --allow-sys flag
  ```

- Web3Function try to access cpu:
  - Run: `yarn test src/web3Functions/fails/escape-cpu.ts`
  - Result:
  ```
  Web3Function Result:
  ✗ Error: PermissionDenied: Requires run access to "whoami", run again with the --allow-run flag
  ```