# JsResolver Proof Of Concept
Playground repo to prototype JsResolvers
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

## Write a Js Resolver

- Create a new file in `src/resolvers`
- Register your resolver main function using `JsResolverSdk.onChecker`
- Example:
```typescript
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
  console.log('ChainId:', context.gelatoArgs.chainId)
  const rpcProvider = ethers.getDefaultProvider(context.gelatoArgs.chainId, {
    alchemy: await secrets.get("ALCHEMY_ID"),
  });

  // Retrieve Last oracle update time
  const oracleAddress = "0x6a3c82330164822A8a39C7C0224D20DB35DD030a";
  const oracle = new Contract(oracleAddress, ORACLE_ABI, rpcProvider);
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
  const priceData = await axios.get(
    `https://api.coingecko.com/api/v3/simple/price?ids=${currency}&vs_currencies=usd`
  );
  const price = Math.floor(priceData.data[currency].usd);
  console.log(`Updating price: ${price}`);

  // Return execution call data
  return {
    canExec: true,
    callData: oracle.interface.encodeFunctionData("updatePrice", [price]),
  };
});
```
- create your resolver `schema.json` to specify your runtime configuration:
```json
{
  "jsResolverVersion": "1.0.0",
  "runtime": "node-18",
  "memory": 128, 
  "timeout": 60,
  "userArgs": {}
}
```


## Test your resolver

- Use `yarn test FILENAME` command to test your resolver

- Options:
  - `--show-logs` Show internal Resolver logs
  - `--runtime=thread|docker` Use `thread` if you don't have `docker`set up locally (default: `docker`)
  - `--debug` Show Runtime debug messages
  - `--user-args=[key]:[value]` Set your Resolver user args

- Example: `yarn test src/resolvers/index.ts --show-logs --runtime=thread`
- Output:
  ```
  JsResolver Build result:
  ✓ File: ./.tmp/resolver.cjs
  ✓ File size: 1.70mb
  ✓ Build time: 109.93ms

  JsResolver running logs:
  > ChainId: 5
  > Last oracle update: 1665512172
  > Next oracle update: 1665512472
  > Updating price: 1586

  JsResolver Result:
  ✓ Return value: {
    canExec: true,
    callData: '0x8d6cc56d0000000000000000000000000000000000000000000000000000000000000632'
  }

  JsResolver Runtime stats:
  ✓ Duration: 5.41s
  ✓ Memory: 57.77mb
  ```
## Upload / fetch Js Resolver
Use `yarn upload FILENAME` command to upload your resolver.

```
> yarn upload ./src/resolvers/index.ts

## Use User arguments
1. Declare your expected `userArgs` in you schema, accepted types are 'string', 'string[]', 'number', 'number[]', 'boolean', 'boolean[]':
```json
{
  "jsResolverVersion": "1.0.0",
  "runtime": "node-18",
  "memory": 128, 
  "timeout": 60,
  "userArgs": {
    "currency": "string",
    "oracle": "string"
  }
}
```

2. Access your `userArgs` from the JsResolver context:
```typescript
JsResolverSdk.onChecker(async (context: JsResolverContext) => {
  const { userArgs, gelatoArgs, secrets } = context;

  // User args:
  console.log('Currency:', userArgs.currency)
  console.log('Oracle:', userArgs.oracle)
  
});
```

3. Pass `user-args` to the CLI to test your resolver:
```
yarn test src/resolvers/oracle/index.ts --show-logs --user-args=currency:ethereum --user-args=oracle:0x6a3c82330164822A8a39C7C0224D20DB35DD030a
```

To pass array argument (eg `string[]`), you can use:
```
--user-args=arr:\[\"a\"\,\"b\"\]
```


## Benchmark / Load testing

- Use `yarn benchmark FILENAME` command to run a test load

- Options:
  - all `test` command options
  - `--load=100` configure the number of resolver you want to run for your load test (default: `10`)
  - `--pool=10` configure the pool size, ie max number of concurrent worker (default: `10`)

- Example: `yarn benchmark src/resolvers/index.ts --load=100 --pool=10`
- Output:
  ```  
  Benchmark result:
  - nb success: 100/100
  - duration: 64s
  ```



## Failure tests
Some example failing file to test error handling
- Syntax error in the resolver:
  - Run: `yarn test src/resolvers/fails/syntax-error.js`
  - Result:
  ```
  JsResolver building...
  ✘ [ERROR] Could not resolve "nothing"

      src/resolvers/fails/syntax-error.js:1:30:
        1 │ import { JsResolverSdk } from "nothing";
          ╵                               ~~~~~~~~~

    You can mark the path "nothing" as external to exclude it from the bundle, which will remove this
    error.


  JsResolver Build result:
  ✗ Error: Build failed with 1 error:
  src/resolvers/fails/syntax-error.js:1:30: ERROR: Could not resolve "nothing"
  ```

- No checker function registered in the resolver:
  - Run: `yarn test src/resolvers/fails/not-registered.ts`
  - Result:
  ```
  JsResolver Result:
  ✗ Error: JsResolver start-up timeout (5s)
  Make sure you registered your checker function correctly in your script.
  ```

- Resolver run out of memory:
  - Run: `yarn test src/resolvers/fails/escape-memory.ts`
  - Result
  ```
  JsResolver Result:
  ✗ Error: JsResolver sandbox exited with code=137

  JsResolver Runtime stats:
  ✓ Duration: 1.91s
  ✗ Memory: 31.97mb
  ```

- Resolver exceed timeout:
   - Run: `yarn test src/resolvers/fails/escape-timeout.ts`
   - Result:
  ```
  JsResolver Result:
  ✗ Error: JsResolver exceed execution timeout (10s)

  JsResolver Runtime stats:
  ✗ Duration: 10.97s
  ✓ Memory: 25.34mb
  ```

- Resolver ends without returning result:
  - Run: `yarn test src/resolvers/fails/no-result.ts`
  - Result:
  ```
  JsResolver Result:
  ✗ Error: JsResolver exited without returning result
  ```

- Resolver try to access env:
  - Run: `yarn test src/resolvers/fails/escape-env.ts`
  - Result:
  ```
  JsResolver Result:
 ✗ Error: PermissionDenied: Requires env access to all, run again with the --allow-env flag
  ```

- Resolver try to access file system:
  - Run: `yarn test src/resolvers/fails/escape-file.ts`
  - Result:
  ```
  JsResolver Result:
 ✗ Error: PermissionDenied: Requires read access to "./.env", run again with the --allow-read flag
  ```

- Resolver try to access os:
  - Run: `yarn test src/resolvers/fails/escape-os.ts`
  - Result:
  ```
  JsResolver Result:
 ✗ Error: PermissionDenied: Requires sys access to "osRelease", run again with the --allow-sys flag
  ```

- Resolver try to access cpu:
  - Run: `yarn test src/resolvers/fails/escape-cpu.ts`
  - Result:
  ```
  JsResolver Result:
 ✗ Error: PermissionDenied: Requires run access to "whoami", run again with the --allow-run flag
  ```