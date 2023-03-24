import { performance } from "perf_hooks";
import { Web3FunctionNetHelper } from "../net/Web3FunctionNetHelper";
import { Web3FunctionHttpClient } from "../net/Web3FunctionHttpClient";
import { Web3FunctionContextData } from "../types/Web3FunctionContext";
import {
  Web3FunctionEvent,
  Web3FunctionStorage,
} from "../types/Web3FunctionEvent";
import { Web3FunctionAbstractSandbox } from "./sandbox/Web3FunctionAbstractSandbox";
import { Web3FunctionDockerSandbox } from "./sandbox/Web3FunctionDockerSandbox";
import { Web3FunctionThreadSandbox } from "./sandbox/Web3FunctionThreadSandbox";
import {
  Web3FunctionExec,
  Web3FunctionRunnerPayload,
  Web3FunctionRunnerOptions,
} from "./types";
import {
  Web3FunctionResult,
  Web3FunctionUserArgs,
  Web3FunctionUserArgsSchema,
} from "../types";
import { Web3FunctionProxyProvider } from "../provider/Web3FunctionProxyProvider";
import { ethers } from "ethers";
import onExit from "signal-exit";

const START_TIMEOUT = 5_000;

export class Web3FunctionRunner {
  private _debug: boolean;
  private _memory = 0;
  private _proxyProvider?: Web3FunctionProxyProvider;
  private _client?: Web3FunctionHttpClient;
  private _sandbox?: Web3FunctionAbstractSandbox;
  private _execTimeoutId?: NodeJS.Timeout;
  private _memoryIntervalId?: NodeJS.Timer;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _exitRemover: () => void = () => {};

  constructor(debug = false) {
    this._debug = debug;
  }

  public async validateUserArgs(
    userArgsSchema: Web3FunctionUserArgsSchema,
    inputUserArgs: { [key: string]: string }
  ): Promise<Web3FunctionUserArgs> {
    const typedUserArgs: Web3FunctionUserArgs = {};
    for (const key in userArgsSchema) {
      const value = inputUserArgs[key];
      if (typeof value === "undefined") {
        throw new Error(`Web3FunctionSchemaError: Missing user arg '${key}'`);
      }
      const type = userArgsSchema[key];
      switch (type) {
        case "boolean":
          typedUserArgs[key] = !(value === "false");
          break;
        case "boolean[]": {
          try {
            const parsedValue = JSON.parse(value);
            if (
              !Array.isArray(parsedValue) ||
              parsedValue.some((a) => typeof a !== "boolean")
            ) {
              throw new Error(
                `Web3FunctionSchemaError: Invalid boolean[] value '${value}' for user arg '${key}' (use: '[true, false]')`
              );
            }
            typedUserArgs[key] = parsedValue;
          } catch (err) {
            throw new Error(
              `Parsing ${value} to boolean[] failed. \n${err.message}`
            );
          }
          break;
        }
        case "string":
          typedUserArgs[key] = value;
          break;
        case "string[]": {
          try {
            const parsedValue = JSON.parse(value);
            if (
              !Array.isArray(parsedValue) ||
              parsedValue.some((a) => typeof a !== "string")
            ) {
              throw new Error(
                `Web3FunctionSchemaError: Invalid string[] value '${value}' for user arg '${key}' (use: '["a", "b"]')`
              );
            }
            typedUserArgs[key] = parsedValue;
          } catch (err) {
            throw new Error(
              `Parsing ${value} to string[] failed. \n${err.message}`
            );
          }
          break;
        }
        case "number": {
          const parsedValue = value.includes(".")
            ? parseFloat(value)
            : parseInt(value);
          if (isNaN(parsedValue)) {
            throw new Error(
              `Web3FunctionSchemaError: Invalid number value '${value}' for user arg '${key}'`
            );
          }
          typedUserArgs[key] = parsedValue;
          break;
        }
        case "number[]":
          try {
            const parsedValue = JSON.parse(value);
            if (
              !Array.isArray(parsedValue) ||
              parsedValue.some((a) => typeof a !== "number")
            ) {
              throw new Error(
                `Web3FunctionSchemaError: Invalid number[] value '${value}' for user arg '${key}' (use: '[1, 2]')`
              );
            }
            typedUserArgs[key] = parsedValue;
          } catch (err) {
            throw new Error(
              `Parsing ${value} to number[] failed. \n${err.message}`
            );
          }
          break;
        default:
          throw new Error(
            `Web3FunctionSchemaError: Unrecognized type '${type}' for user arg '${key}'`
          );
      }
    }
    return typedUserArgs;
  }

  public async run(
    payload: Web3FunctionRunnerPayload
  ): Promise<Web3FunctionExec> {
    const start = performance.now();
    let success;
    let result;
    let storage;
    let error;
    try {
      const { script, context, options, provider } = payload;
      const data = await this._runInSandbox(script, context, options, provider);
      this._validateResult(data.result);

      result = data.result;
      storage = data.storage;
      storage.size =
        Buffer.byteLength(JSON.stringify(storage.storage), "utf-8") / 1024;
      success = true;
    } catch (err) {
      error = err;
      success = false;
    } finally {
      await this.stop();
    }

    const logs: string[] = this._sandbox?.getLogs() ?? [];
    const duration = (performance.now() - start) / 1000;
    const memory = this._memory / 1024 / 1024;
    const rpcCalls = this._proxyProvider?.getNbRpcCalls() ?? {
      total: 0,
      throttled: 0,
    };
    this._log(`Runtime duration=${duration.toFixed(2)}s`);
    this._log(`Runtime memory=${memory.toFixed(2)}mb`);
    this._log(`Runtime rpc calls=${JSON.stringify(rpcCalls)}`);
    this._log(`Runtime storage size=${storage?.size.toFixed(2)}kb`);
    if (success) {
      return {
        success,
        result,
        storage,
        logs,
        duration,
        memory,
        rpcCalls,
      };
    } else {
      return {
        success,
        storage,
        error,
        logs,
        duration,
        memory,
        rpcCalls,
      };
    }
  }

  private async _runInSandbox(
    script: string,
    context: Web3FunctionContextData,
    options: Web3FunctionRunnerOptions,
    provider: ethers.providers.StaticJsonRpcProvider
  ): Promise<{ result: Web3FunctionResult; storage: Web3FunctionStorage }> {
    const SandBoxClass =
      options.runtime === "thread"
        ? Web3FunctionThreadSandbox
        : Web3FunctionDockerSandbox;
    this._sandbox = new SandBoxClass(
      { memoryLimit: options.memory },
      options.showLogs ?? false,
      this._debug
    );

    const serverPort =
      options.serverPort ?? (await Web3FunctionNetHelper.getAvailablePort());
    try {
      this._log(`Sarting sandbox: ${script}`);
      await this._sandbox.start(script, serverPort);
    } catch (err) {
      this._log(`Fail to start Web3Function in sandbox ${err.message}`);
      throw new Error(`Web3Function failed to start sandbox: ${err.message}`);
    }

    // Attach process exit handler to clean runtime environment
    this._exitRemover = onExit(() => this.stop());

    // Proxy RPC provider
    const proxyProviderPort = await Web3FunctionNetHelper.getAvailablePort();
    this._proxyProvider = new Web3FunctionProxyProvider(
      options.runtime === "thread"
        ? "http://127.0.0.1"
        : "http://host.docker.internal",
      proxyProviderPort,
      provider,
      options.rpcLimit,
      this._debug
    );
    await this._proxyProvider.start();
    context.rpcProviderUrl = this._proxyProvider.getProxyUrl();

    // Start monitoring memory usage
    this._monitorMemoryUsage();

    this._client = new Web3FunctionHttpClient(
      "http://0.0.0.0",
      serverPort,
      this._debug
    );
    try {
      await Promise.race([
        this._client.connect(START_TIMEOUT),
        this._sandbox?.waitForProcessEnd(), // Early exit if sandbox is crashed
      ]);
    } catch (err) {
      this._log(`Fail to connect to Web3Function ${err.message}`);
      throw new Error(
        `Web3Function start-up timeout (${
          START_TIMEOUT / 1000
        }s) \nMake sure you registered your onRun function correctly in your script.`
      );
    }

    return new Promise((resolve, reject) => {
      let isResolved = false;
      this._client?.emit("input_event", { action: "start", data: { context } });
      this._client?.on("error", async (error: Error) => {
        this._log(`Client error: ${error.message}`);
        try {
          await this.stop();
        } catch (err) {
          this._log(`Error stopping sandbox: ${err.message}`);
        }
      });
      this._client?.on("output_event", (event: Web3FunctionEvent) => {
        this._log(`Received event: ${event.action}`);
        switch (event.action) {
          case "result":
            isResolved = true;
            resolve(event.data);
            break;
          case "error":
            isResolved = true;
            reject(event.data.error);
            break;
          default:
            this._log(`Unknown event: ${event.action}`);
        }
      });

      // Stop waiting for result after timeout expire
      this._execTimeoutId = setTimeout(() => {
        reject(
          new Error(
            `Web3Function exceed execution timeout (${options.timeout / 1000}s)`
          )
        );
      }, options.timeout);

      // Listen to sandbox exit status code to detect runtime error
      this._sandbox?.waitForProcessEnd().then((signal: number) => {
        if (!isResolved)
          if (signal === 0) {
            reject(new Error(`Web3Function exited without returning result`));
          } else if (signal === 250) {
            reject(
              new Error(
                `Web3Function exited with code=${signal} (RPC requests limit exceeded)`
              )
            );
          } else {
            reject(new Error(`Web3Function exited with code=${signal}`));
          }
      });
    });
  }

  private _monitorMemoryUsage() {
    this._memoryIntervalId = setInterval(async () => {
      try {
        const liveMemory = await this._sandbox?.getMemoryUsage();
        if (liveMemory && liveMemory > this._memory) this._memory = liveMemory;
      } catch (err) {
        // Ignore
      }
    }, 100);
  }

  private _validateResult(result: Web3FunctionResult) {
    if (!Object.keys(result).includes("canExec"))
      throw new Error(
        `Web3Function must return {canExec: bool, callData: string} or {canExec: bool, message: string}. Instead returned: ${JSON.stringify(
          result
        )}`
      );

    if (result.canExec) {
      if (!Object.keys(result).includes("callData"))
        throw new Error(
          `Web3Function must return {canExec: bool, callData: string}. Instead returned: ${JSON.stringify(
            result
          )}`
        );

      if (result.callData.length < 10 || result.callData.slice(0, 2) !== "0x") {
        throw new Error(
          `Web3Function returned invalid callData. Returned: ${JSON.stringify(
            result
          )}`
        );
      }
    }
  }

  public async stop() {
    this._log("Stopping runtime environment...");
    if (this._sandbox) await this._sandbox.stop();
    if (this._client) this._client.end();
    if (this._proxyProvider) this._proxyProvider.stop();
    if (this._execTimeoutId) clearTimeout(this._execTimeoutId);
    if (this._memoryIntervalId) clearInterval(this._memoryIntervalId);
    // Remove process exit handler
    this._exitRemover();
  }

  private _log(message: string) {
    if (this._debug) console.log(`Web3FunctionRunner: ${message}`);
  }
}
