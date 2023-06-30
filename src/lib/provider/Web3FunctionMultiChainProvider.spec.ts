import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { Web3FunctionMultiChainProvider } from "./Web3FunctionMultiChainProvider";
import { Web3FunctionProxyProvider } from "./Web3FunctionProxyProvider";

describe("Web3FunctionMultiChainProvider", () => {
  enum TestChainIds {
    Goerli = 5,
    Mumbai = 80001,
  }
  enum TestChainProviders {
    Goerli = "https://rpc.ankr.com/eth_goerli",
    Mumbai = "https://rpc.ankr.com/polygon_mumbai",
  }

  let proxyProvider: Web3FunctionProxyProvider;
  let multichainProvider: Web3FunctionMultiChainProvider;

  let rateLimitInvoked = false;

  const rpcLimit = 5;
  beforeAll(async () => {
    const proxyProviderHost = "http://127.0.0.1";
    const proxyProviderPort = 3000;

    const multiChainProviderConfig = {
      5: new StaticJsonRpcProvider(TestChainProviders.Goerli),
      80001: new StaticJsonRpcProvider(TestChainProviders.Mumbai),
    };

    proxyProvider = new Web3FunctionProxyProvider(
      proxyProviderHost,
      proxyProviderPort,
      rpcLimit,
      TestChainIds.Goerli,
      multiChainProviderConfig,
      false
    );

    await proxyProvider.start();

    multichainProvider = new Web3FunctionMultiChainProvider(
      proxyProvider.getProxyUrl(),
      5,
      () => {
        rateLimitInvoked = true;
      }
    );
  });

  afterAll(() => {
    proxyProvider.stop();
  });

  test("should get default provider with chainId", async () => {
    const chainNetwork = await multichainProvider.chainId(5).getNetwork();
    const mainChainNetwork = await multichainProvider.default().getNetwork();

    expect(chainNetwork.chainId).toEqual(mainChainNetwork.chainId);
  });

  test("should invoke rate limit callback when rate limit exceed", async () => {
    rateLimitInvoked = false;

    const limitingRequests = Array.from(
      { length: rpcLimit },
      async () => await multichainProvider.default().getBlock("latest")
    );

    try {
      await Promise.all(limitingRequests);
    } catch (error) {
      expect(rateLimitInvoked).toBeTruthy();
    }
  });

  test("should fail when RPC is not configured for the chainId", async () => {
    try {
      await multichainProvider.chainId(100).getBlockNumber();
      throw new Error("Provider is connected");
    } catch (error) {
      expect(error.message.includes("provider is disconnected"));
    }
  });
});
