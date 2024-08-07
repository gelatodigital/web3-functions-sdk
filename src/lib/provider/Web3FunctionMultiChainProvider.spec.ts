import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { Web3FunctionMultiChainProvider } from "./Web3FunctionMultiChainProvider";
import { Web3FunctionProxyProvider } from "./Web3FunctionProxyProvider";

describe("Web3FunctionMultiChainProvider", () => {
  enum TestChainIds {
    Sepolia = 11155111,
    Amoy = 80002,
  }
  enum TestChainProviders {
    Sepolia = "https://rpc.ankr.com/eth_sepolia",
    Amoy = "https://rpc.ankr.com/polygon_amoy",
  }

  let proxyProvider: Web3FunctionProxyProvider;
  let multichainProvider: Web3FunctionMultiChainProvider;

  let rateLimitInvoked = false;

  const rpcLimit = 5;
  beforeAll(async () => {
    const proxyProviderHost = "http://127.0.0.1";
    const proxyProviderPort = 3000;

    const multiChainProviderConfig = {
      [TestChainIds.Sepolia]: new StaticJsonRpcProvider(
        TestChainProviders.Sepolia
      ),
      [TestChainIds.Amoy]: new StaticJsonRpcProvider(TestChainProviders.Amoy),
    };

    proxyProvider = new Web3FunctionProxyProvider(
      proxyProviderHost,
      rpcLimit,
      TestChainIds.Sepolia,
      multiChainProviderConfig,
      false
    );

    await proxyProvider.start(proxyProviderPort);

    multichainProvider = new Web3FunctionMultiChainProvider(
      proxyProvider.getProxyUrl(),
      TestChainIds.Sepolia,
      () => {
        rateLimitInvoked = true;
      }
    );
  });

  afterAll(() => {
    proxyProvider.stop();
  });

  test("should get remaining rpc calls", async () => {
    let nbRpcCallsRemaining = await multichainProvider.nbRpcCallsRemaining();
    expect(nbRpcCallsRemaining).toBe(rpcLimit);

    await multichainProvider.default().getBlock("latest");

    nbRpcCallsRemaining = await multichainProvider.nbRpcCallsRemaining();
    expect(nbRpcCallsRemaining).toBe(rpcLimit - 1);
  });

  test("should get default provider with chainId", async () => {
    const chainNetwork = await multichainProvider
      .chainId(11155111)
      .getNetwork();
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
      await Promise.allSettled(limitingRequests);
    } catch (error) {
      expect(rateLimitInvoked).toBeTruthy();
    }
  }, 20_000);

  test("should fail when RPC is not configured for the chainId", async () => {
    try {
      await multichainProvider.chainId(100).getBlockNumber();
      throw new Error("Provider is connected");
    } catch (error) {
      expect(error.message.includes("provider is disconnected"));
    }
  });
});
