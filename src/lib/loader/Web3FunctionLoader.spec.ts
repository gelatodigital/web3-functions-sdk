import path from "node:path";
import { Web3FunctionLoader } from "./Web3FunctionLoader";

describe("Web3FunctionLoader.load", () => {
  const TEST_FOLDER_BASE = path.join(process.cwd(), "src/lib/loader/__test__/");

  test("should fail when source is missing", () => {
    try {
      Web3FunctionLoader.load("source-missing", TEST_FOLDER_BASE);
      throw Error("Test failed");
    } catch (error) {
      expect(error.message.includes("not found")).toBeTruthy();
    }
  });

  test("should load when TS source is available", () => {
    const details = Web3FunctionLoader.load("just-ts", TEST_FOLDER_BASE);

    expect(details.path.includes("just-ts/index.ts")).toBeTruthy();
  });

  test("should load when JS source is available", () => {
    const details = Web3FunctionLoader.load("just-js", TEST_FOLDER_BASE);

    expect(details.path.includes("just-js/index.js")).toBeTruthy();
  });

  test("should load userArgs file when is available", () => {
    const details = Web3FunctionLoader.load("just-ts", TEST_FOLDER_BASE);

    expect(details.userArgs).toHaveProperty("currency");
  });

  test("should load storage file when is available", () => {
    const details = Web3FunctionLoader.load("just-ts", TEST_FOLDER_BASE);

    expect(details.storage).toHaveProperty("lastBlockNumber");
  });

  test("should load secrets when is available", () => {
    const details = Web3FunctionLoader.load("just-ts", TEST_FOLDER_BASE);

    expect(details.secrets).toHaveProperty("COINGECKO_API");
  });
});
