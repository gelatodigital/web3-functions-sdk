import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { jest } from "@jest/globals";
import path from "path";

import { Web3FunctionBuilder } from "../builder";
import {
  Web3FunctionContextData,
  Web3FunctionRunnerOptions,
  Web3FunctionVersion,
} from "../types";
import { Web3FunctionRunnerPool } from "./Web3FunctionRunnerPool";

const MAX_RPC_LIMIT = 100;
const MAX_DOWNLOAD_LIMIT = 10 * 1024 * 1024;
const MAX_UPLOAD_LIMIT = 5 * 1024 * 1024;
const MAX_REQUEST_LIMIT = 110;
const MAX_STORAGE_LIMIT = 1024; // kb

describe("Web3FunctionRunnerPool", () => {
  const LOCAL_BASE_PATH = path.join(
    process.cwd(),
    "src",
    "lib",
    "runtime",
    "__test__"
  );
  test("runner pool", async () => {
    const consoleSpy = jest.spyOn(console, "log");

    const buildRes = await Web3FunctionBuilder.build(
      path.join(LOCAL_BASE_PATH, "simple.ts")
    );

    if (buildRes.success) {
      const multiChainProviderConfig = {
        5: new StaticJsonRpcProvider("https://eth-goerli.public.blastapi.io"),
      };

      const runner = new Web3FunctionRunnerPool(2, true);
      const options: Web3FunctionRunnerOptions = {
        runtime: "thread",
        showLogs: false,
        memory: buildRes.schema.memory,
        rpcLimit: MAX_RPC_LIMIT,
        timeout: buildRes.schema.timeout * 1000,
        downloadLimit: MAX_DOWNLOAD_LIMIT,
        uploadLimit: MAX_UPLOAD_LIMIT,
        requestLimit: MAX_REQUEST_LIMIT,
        storageLimit: MAX_STORAGE_LIMIT,
        blacklistedHosts: ["testblacklistedhost.com"],
      };

      const context: Web3FunctionContextData = {
        secrets: {},
        storage: {},
        gelatoArgs: {
          chainId: 5,
          gasPrice: "10",
        },
        userArgs: {},
      };

      await runner.run({
        script: buildRes.filePath,
        version: Web3FunctionVersion.V2_0_0,
        context,
        options,
        multiChainProviderConfig,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Web3FunctionRunnerPool")
      );
    } else {
      expect(true).toBeFalsy();
    }
  });
});
