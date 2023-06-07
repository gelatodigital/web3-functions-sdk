import { Web3FunctionProxyProvider } from "./Web3FunctionProxyProvider";
import { MultiChainProviderConfig } from "./types";

import axios from "axios";
import { ethers } from "ethers";

describe("Web3FunctionProxyProvider", () => {
  enum TestChainIds {
    Goerli = 5,
    Mumbai = 80001,
  }
  enum TestChainProviders {
    Goerli = "https://rpc.ankr.com/eth_goerli",
    Mumbai = "https://rpc.ankr.com/polygon_mumbai",
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
      5: new ethers.providers.JsonRpcProvider(TestChainProviders.Goerli),
      80001: new ethers.providers.JsonRpcProvider(TestChainProviders.Mumbai),
    };
  });

  beforeEach(async () => {
    proxyProvider = new Web3FunctionProxyProvider(
      proxyProviderHost,
      proxyProviderPort,
      rpcLimit,
      TestChainIds.Goerli,
      multiChainProviderConfig,
      false
    );

    await proxyProvider.start();
  });

  afterEach(() => {
    proxyProvider.stop();
  });

  test("proxy provider url", () => {
    const testAddress = `${proxyProviderHost}:${proxyProviderPort}`;

    expect(proxyProvider.getProxyUrl().includes(testAddress)).toBeTruthy();
  });

  test("should reject invalid request", async () => {
    const response = await axios.post(proxyProvider.getProxyUrl(), {
      id: 0,
      jsonrpc: "2.0",
    });

    expect(response.data.error).toBeDefined();
    expect(response.data.error.message).toBeDefined();

    expect(
      response.data.error.message.includes("not a valid Request object.")
    ).toBeTruthy();
  });

  test("should rate limit exceeding requests", async () => {
    const numRequests = rpcLimit * 2;

    const limitingRequests = Array.from({ length: rpcLimit * 2 }, () =>
      axios
        .post(proxyProvider.getProxyUrl(), {
          id: 0,
          jsonrpc: "2.0",
          method: "eth_getBlockByNumber",
          params: ["latest", false],
        })
        .then((response) => {
          let fulfilled = true;
          if (
            response.data.error &&
            response.data.error.message.includes("Request limit exceeded")
          ) {
            fulfilled = false;
          }

          return { fulfilled };
        })
    );

    const results = await Promise.all(limitingRequests);
    const numFulfilled = results.filter((result) => result.fulfilled).length;
    const numUnfulfilled = results.filter((result) => !result.fulfilled).length;

    expect(numFulfilled).toEqual(rpcLimit);
    expect(numUnfulfilled).toEqual(numRequests - rpcLimit);
  });

  test("should not rate limit whitelisted methods", async () => {
    const numRequests = rpcLimit * 2;

    const limitingRequests = Array.from({ length: rpcLimit * 2 }, () =>
      axios
        .post(proxyProvider.getProxyUrl(), {
          id: 0,
          jsonrpc: "2.0",
          method: "eth_chainId",
          params: [],
        })
        .then((response) => {
          let fulfilled = true;
          if (
            response.data.error &&
            response.data.error.message.includes("Request limit exceeded")
          ) {
            fulfilled = false;
          }

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
    const response = await axios.post(proxyProvider.getProxyUrl(), {
      id: 0,
      jsonrpc: "2.0",
      method: "eth_noRequest",
      params: [],
    });

    expect(response.data.error).toBeDefined();
    expect(response.data.error.message).toBeDefined();

    expect(response.data.error.message.includes("does not exist")).toBeTruthy();
  });

  test("should respond with main chain when chainId is not provided", async () => {
    const mainChainIdResponse = await axios.post(proxyProvider.getProxyUrl(), {
      id: 0,
      jsonrpc: "2.0",
      method: "eth_chainId",
      params: [],
    });

    const chainIdResponse = await axios.post(
      `${proxyProvider.getProxyUrl()}/${TestChainIds.Mumbai}`,
      {
        id: 0,
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
      }
    );

    const parsedMainChainId = parseInt(
      mainChainIdResponse.data.result.substring(2),
      16
    );
    const parsedChainId = parseInt(
      chainIdResponse.data.result.substring(2),
      16
    );

    expect(parsedMainChainId).toEqual(TestChainIds.Goerli);
    expect(parsedChainId).toEqual(TestChainIds.Mumbai);
  });

  test("should report RPC calls correctly", async () => {
    const numRequests = rpcLimit * 2;

    const limitingRequests = Array.from({ length: rpcLimit * 2 }, () =>
      axios.post(proxyProvider.getProxyUrl(), {
        id: 0,
        jsonrpc: "2.0",
        method: "eth_getBlockByNumber",
        params: ["latest", false],
      })
    );

    await Promise.all(limitingRequests);

    const rpcStats = proxyProvider.getNbRpcCalls();

    expect(rpcStats.total).toEqual(numRequests);
    expect(rpcStats.throttled).toEqual(numRequests - rpcLimit);
  });
});
