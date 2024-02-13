import { jest } from "@jest/globals";
import colors from "colors/safe";
import path from "path";

import testRunner from "../binaries/test";
import { Web3FunctionUserArgsSchema } from "../types";
import { Web3FunctionRunner } from "./Web3FunctionRunner";

describe("Web3FunctionRunner", () => {
  const FUNCTIONS_BASE_PATH = path.join(process.cwd(), "src", "web3-functions");
  const LOCAL_BASE_PATH = path.join(
    process.cwd(),
    "src",
    "lib",
    "runtime",
    "__test__"
  );

  describe("Parse User arguments", () => {
    const userArgsSchema: Web3FunctionUserArgsSchema = {
      myArray: "string[]",
      myPrimitive: "boolean",
      myMissing: "number",
    };

    test("should throw for missing user argument", () => {
      const runner = new Web3FunctionRunner(false);

      try {
        runner.parseUserArgs(userArgsSchema, {
          myArray: '["hello", "world"]',
          myPrimitive: "false",
        });

        expect(false).toBeTruthy();
      } catch (err) {
        expect(err.message).toMatch(
          "Web3FunctionSchemaError: Missing user arg 'myMissing'"
        );
      }
    });

    test("should throw when primitive is provided for array expected user argument", () => {
      const runner = new Web3FunctionRunner(false);

      try {
        runner.parseUserArgs(userArgsSchema, {
          myArray: '"hello"',
          myPrimitive: "false",
          myMissing: "12",
        });

        expect(false).toBeTruthy();
      } catch (err) {
        expect(err.message).toMatch(
          "Web3FunctionSchemaError: Invalid string[] value"
        );
      }
    });

    test("should throw when array is provided for primitive expected user argument", () => {
      const runner = new Web3FunctionRunner(false);

      try {
        runner.parseUserArgs(userArgsSchema, {
          myArray: '["hello", "world"]',
          myPrimitive: "[false, true]",
          myMissing: "12",
        });

        expect(false).toBeTruthy();
      } catch (err) {
        expect(err.message).toMatch(
          "Web3FunctionSchemaError: Invalid boolean value"
        );
      }
    });

    test("should throw when unexpected typed value is provided for user argument", () => {
      const runner = new Web3FunctionRunner(false);

      try {
        runner.parseUserArgs(userArgsSchema, {
          myArray: '[false, "world"]',
          myPrimitive: "false",
          myMissing: "12",
        });

        expect(false).toBeTruthy();
      } catch (err) {
        expect(err.message).toMatch(
          "Web3FunctionSchemaError: Invalid string[]"
        );
      }

      try {
        runner.parseUserArgs(userArgsSchema, {
          myArray: '[false, "world"]',
          myPrimitive: "false",
          myMissing: "false",
        });

        expect(false).toBeTruthy();
      } catch (err) {
        expect(err.message).toMatch(
          "Web3FunctionSchemaError: Invalid string[]"
        );
      }
    });
  });

  describe("Validate Args", () => {
    const userArgsSchema: Web3FunctionUserArgsSchema = {
      myArray: "string[]",
      myPrimitive: "boolean",
      myMissing: "number",
    };

    test("should throw for missing user argument", () => {
      const runner = new Web3FunctionRunner(false);

      try {
        runner.validateUserArgs(userArgsSchema, {
          myArray: ["hello", "world"],
          myPrimitive: false,
        });

        expect(false).toBeTruthy();
      } catch (err) {
        expect(err.message).toMatch(
          "Web3FunctionSchemaError: Missing user arg 'myMissing'"
        );
      }
    });

    test("should throw when primitive is provided for array expected user argument", () => {
      const runner = new Web3FunctionRunner(false);

      try {
        runner.validateUserArgs(userArgsSchema, {
          myArray: "hello",
          myPrimitive: false,
          myMissing: 12,
        });

        expect(false).toBeTruthy();
      } catch (err) {
        expect(err.message).toMatch(
          "Web3FunctionSchemaError: Invalid string[] value"
        );
      }
    });

    test("should throw when array is provided for primitive expected user argument", () => {
      const runner = new Web3FunctionRunner(false);

      try {
        runner.validateUserArgs(userArgsSchema, {
          myArray: ["hello", "world"],
          myPrimitive: [false, true],
          myMissing: 12,
        });

        expect(false).toBeTruthy();
      } catch (err) {
        expect(err.message).toMatch(
          "Web3FunctionSchemaError: Invalid boolean value"
        );
      }
    });

    test("should throw when unexpected typed value is provided for user argument", () => {
      const runner = new Web3FunctionRunner(false);

      try {
        runner.validateUserArgs(userArgsSchema, {
          myArray: [false, "world"] as unknown as string[],
          myPrimitive: false,
          myMissing: 12,
        });

        expect(false).toBeTruthy();
      } catch (err) {
        expect(err.message).toMatch(
          "Web3FunctionSchemaError: Invalid string[]"
        );
      }

      try {
        runner.validateUserArgs(userArgsSchema, {
          myArray: [false, "world"] as unknown as string[],
          myPrimitive: false,
          myMissing: false,
        });

        expect(false).toBeTruthy();
      } catch (err) {
        expect(err.message).toMatch(
          "Web3FunctionSchemaError: Invalid string[]"
        );
      }
    });
  });

  describe("Function runs", () => {
    const consoleSpy = jest.spyOn(console, "log");

    beforeEach(() => {
      consoleSpy.mockClear();
    });

    test("should return canExec false with message", async () => {
      await testRunner({
        w3fPath: path.join(LOCAL_BASE_PATH, "simple.ts"),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Return value: {"canExec":false,"message":"Simple"}'
        )
      );
    });

    test("should report when function doesn't return a result", async () => {
      await testRunner({
        w3fPath: path.join(
          FUNCTIONS_BASE_PATH,
          "fails",
          "no-result",
          "index.ts"
        ),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Error: Web3Function exited without returning result"
        )
      );
    });

    test("should report rpc limit exceeded", async () => {
      await testRunner({
        w3fPath: path.join(
          FUNCTIONS_BASE_PATH,
          "fails",
          "rpc-provider-limit",
          "index.ts"
        ),
        rpcLimit: 20,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("RPC requests limit exceeded")
      );
    }, 30_000);

    test("should report network limit exceeded", async () => {
      await testRunner({
        w3fPath: path.join(
          FUNCTIONS_BASE_PATH,
          "fails",
          "request-limit",
          "index.ts"
        ),
        requestLimit: 20,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Please reduce your network usage")
      );
    }, 20_000);

    test("should report download limit exceeded", async () => {
      await testRunner({
        w3fPath: path.join(
          FUNCTIONS_BASE_PATH,
          "fails",
          "download-limit",
          "index.ts"
        ),
        downloadLimit: 20,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${colors.red("✗")} DL:`)
      );
    }, 20_000);

    test("should report storage exceeded", async () => {
      await testRunner({
        w3fPath: path.join(
          FUNCTIONS_BASE_PATH,
          "fails",
          "escape-storage",
          "index.ts"
        ),
        storage: {
          myLastMessage: "Lorem ipsum",
        },
        storageLimit: 1, // 1 kb
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Storage usage exceeds limit")
      );
    }, 20_000);

    test("should report memory exceeded", async () => {
      await testRunner({
        w3fPath: path.join(
          FUNCTIONS_BASE_PATH,
          "fails",
          "escape-memory",
          "index.ts"
        ),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Memory limit exceeded")
      );
    }, 20_000);

    test("should not start function with no run handler", async () => {
      await testRunner({
        w3fPath: path.join(
          FUNCTIONS_BASE_PATH,
          "fails",
          "not-registered",
          "index.ts"
        ),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Web3Function start-up timeout")
      );
    }, 20_000);

    test("should report invalid return", async () => {
      await testRunner({
        w3fPath: path.join(LOCAL_BASE_PATH, "invalid-return.ts"),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Web3Function must return")
      );
    }, 20_000);

    test("should report invalid return with no canExec", async () => {
      await testRunner({
        w3fPath: path.join(LOCAL_BASE_PATH, "invalid-return-no-canexec.ts"),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Web3Function must return")
      );
    }, 20_000);

    test("should report invalid address with calldata", async () => {
      await testRunner({
        w3fPath: path.join(
          LOCAL_BASE_PATH,
          "invalid-return-calldata-address.ts"
        ),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("returned invalid to address")
      );
    }, 20_000);

    test("should report invalid data with calldata", async () => {
      await testRunner({
        w3fPath: path.join(LOCAL_BASE_PATH, "invalid-return-calldata-data.ts"),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("returned invalid callData")
      );
    }, 20_000);

    test("should report invalid value with calldata", async () => {
      await testRunner({
        w3fPath: path.join(LOCAL_BASE_PATH, "invalid-return-calldata-value.ts"),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "returned invalid value (must be numeric string)"
        )
      );
    }, 20_000);
  });
});
