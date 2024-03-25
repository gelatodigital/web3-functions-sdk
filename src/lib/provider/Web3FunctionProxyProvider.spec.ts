import { Web3FunctionProxyProvider } from "./Web3FunctionProxyProvider";
import { MultiChainProviderConfig } from "./types";

import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { Agent, request } from "undici";

describe("Web3FunctionProxyProvider", () => {
  enum TestChainIds {
    Sepolia = 11155111,
    Amoy = 80002,
  }
  enum TestChainProviders {
    Sepolia = "https://rpc.ankr.com/eth_sepolia",
    Amoy = "https://rpc.ankr.com/polygon_amoy",
  }

  let proxyProvider: Web3FunctionProxyProvider;
  let multiChainProviderConfig: MultiChainProviderConfig;

  const proxyProviderHost = "http://127.0.0.1";
  let proxyProviderPort: number;
  const rpcLimit = 5;

  beforeAll(() => {
    // proxyProviderPort = await Web3FunctionNetHelper.getAvailablePort();
    proxyProviderPort = 3000;

    multiChainProviderConfig = {
      [TestChainIds.Sepolia]: new StaticJsonRpcProvider(
        TestChainProviders.Sepolia
      ),
      [TestChainIds.Amoy]: new StaticJsonRpcProvider(TestChainProviders.Amoy),
    };
  });

  beforeEach(async () => {
    proxyProvider = new Web3FunctionProxyProvider(
      proxyProviderHost,
      rpcLimit,
      TestChainIds.Sepolia,
      multiChainProviderConfig,
      false
    );

    await proxyProvider.start(proxyProviderPort);
  });

  afterEach(() => {
    proxyProvider.stop();
  });

  test("proxy provider url", () => {
    const testAddress = `${proxyProviderHost}:${proxyProviderPort}`;

    expect(proxyProvider.getProxyUrl().includes(testAddress)).toBeTruthy();
  });

  test("should reject invalid request", async () => {
    const { body } = await request(proxyProvider.getProxyUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: 0,
        jsonrpc: "2.0",
      }),
      dispatcher: new Agent({ pipelining: 0 }),
    });

    const response = (await body.json()) as any;
    expect(response.error).toBeDefined();
    expect(response.error.message).toBeDefined();

    expect(
      response.error.message.includes("not a valid Request object.")
    ).toBeTruthy();
  });

  test("should rate limit exceeding requests", async () => {
    const numRequests = rpcLimit * 2;

    const limitingRequests = Array.from({ length: rpcLimit * 2 }, () =>
      request(proxyProvider.getProxyUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: 0,
          jsonrpc: "2.0",
          method: "eth_getBlockByNumber",
          params: ["latest", false],
        }),
        dispatcher: new Agent({ pipelining: 0 }),
      })
        .then(({ body }) => body.json())
        .then((response: any) => {
          let fulfilled = true;
          if (
            response.error &&
            response.error.message.includes("Request limit exceeded")
          ) {
            fulfilled = false;
          }

          return { fulfilled };
        })
        .catch(() => {
          const fulfilled = false;
          return { fulfilled };
        })
    );

    const results = await Promise.all(limitingRequests);
    const numFulfilled = results.filter((result) => result.fulfilled).length;
    const numUnfulfilled = results.filter((result) => !result.fulfilled).length;

    expect(numFulfilled).toEqual(rpcLimit);
    expect(numUnfulfilled).toEqual(numRequests - rpcLimit);
  }, 20_000);

  test("should not rate limit whitelisted methods", async () => {
    const numRequests = rpcLimit * 2;

    const limitingRequests = Array.from({ length: rpcLimit * 2 }, () =>
      request(proxyProvider.getProxyUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: 0,
          jsonrpc: "2.0",
          method: "eth_chainId",
          params: [],
        }),
        dispatcher: new Agent({ pipelining: 0 }),
      })
        .then(({ body }) => body.json())
        .then((response: any) => {
          let fulfilled = true;
          if (
            response.error &&
            response.error.message.includes("Request limit exceeded")
          ) {
            fulfilled = false;
          }

          return { fulfilled };
        })
        .catch(() => {
          const fulfilled = false;
          return { fulfilled };
        })
    );

    const results = await Promise.all(limitingRequests);
    const numFulfilled = results.filter((result) => result.fulfilled).length;
    const numUnfulfilled = results.filter((result) => !result.fulfilled).length;

    expect(numFulfilled).toEqual(numRequests);
    expect(numUnfulfilled).toEqual(0);
  });

  test("should return provider error", async () => {
    const { body } = await request(proxyProvider.getProxyUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: 0,
        jsonrpc: "2.0",
        method: "eth_noRequest",
        params: [],
      }),
      dispatcher: new Agent({ pipelining: 0 }),
    });
    const response = (await body.json()) as any;

    expect(response.error).toBeDefined();
    expect(response.error.message).toBeDefined();

    expect(response.error.message.includes("does not exist")).toBeTruthy();
  });

  test("should respond with main chain when chainId is not provided", async () => {
    const { body } = await request(proxyProvider.getProxyUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: 0,
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
      }),
      dispatcher: new Agent({ pipelining: 0 }),
    });
    const mainChainIdResponse = (await body.json()) as any;

    const { body: body2 } = await request(
      `${proxyProvider.getProxyUrl()}/${TestChainIds.Amoy}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: 0,
          jsonrpc: "2.0",
          method: "eth_chainId",
          params: [],
        }),
        dispatcher: new Agent({ pipelining: 0 }),
      }
    );
    const chainIdResponse = (await body2.json()) as any;

    const parsedMainChainId = parseInt(
      mainChainIdResponse.result.substring(2),
      16
    );
    const parsedChainId = parseInt(chainIdResponse.result.substring(2), 16);

    expect(parsedMainChainId).toEqual(TestChainIds.Sepolia);
    expect(parsedChainId).toEqual(TestChainIds.Amoy);
  });

  test("should report RPC calls correctly", async () => {
    const numRequests = rpcLimit * 2;

    const limitingRequests = Array.from({ length: rpcLimit * 2 }, () =>
      request(proxyProvider.getProxyUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: 0,
          jsonrpc: "2.0",
          method: "eth_getBlockByNumber",
          params: ["latest", false],
        }),
        dispatcher: new Agent({ pipelining: 0 }),
      })
    );

    await Promise.all(limitingRequests);

    const rpcStats = proxyProvider.getNbRpcCalls();

    expect(rpcStats.total).toEqual(numRequests);
    expect(rpcStats.throttled).toEqual(numRequests - rpcLimit);
  }, 20_000);
});
