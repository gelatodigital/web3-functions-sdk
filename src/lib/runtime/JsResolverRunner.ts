import { performance } from "perf_hooks";
import { JsResolverNetHelper } from "../net/JsResolverNetHelper";
import { JsResolverHttpClient } from "../net/JsResolverHttpClient";
import { JsResolverContextData } from "../types/JsResolverContext";
import { JsResolverEvent, JsResolverStorage } from "../types/JsResolverEvent";
import { JsResolverAbstractSandbox } from "./sandbox/JsResolverAbstractSandbox";
import { JsResolverDockerSandbox } from "./sandbox/JsResolverDockerSandbox";
import { JsResolverThreadSandbox } from "./sandbox/JsResolverThreadSandbox";
import {
  JsResolverExec,
  JsResolverRunnerPayload,
  JsResolverRunnerOptions,
} from "./types";
import {
  JsResolverResult,
  JsResolverUserArgs,
  JsResolverUserArgsSchema,
} from "../types";
import { JsResolverProxyProvider } from "../provider/JsResolverProxyProvider";
import { ethers } from "ethers";

const START_TIMEOUT = 5_000;

export class JsResolverRunner {
  private _debug: boolean;
  private _memory = 0;
  private _proxyProvider?: JsResolverProxyProvider;
  private _client?: JsResolverHttpClient;
  private _sandbox?: JsResolverAbstractSandbox;
  private _execTimeoutId?: NodeJS.Timeout;
  private _memoryIntervalId?: NodeJS.Timer;

  constructor(debug = false) {
    this._debug = debug;
  }

  public async validateUserArgs(
    userArgsSchema: JsResolverUserArgsSchema,
    inputUserArgs: { [key: string]: string }
  ): Promise<JsResolverUserArgs> {
    const typedUserArgs: JsResolverUserArgs = {};
    for (const key in userArgsSchema) {
      const value = inputUserArgs[key];
      if (typeof value === "undefined") {
        throw new Error(`JsResolverSchemaError: Missing user arg '${key}'`);
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
                `JsResolverSchemaError: Invalid boolean[] value '${value}' for user arg '${key}' (use: '[true, false]')`
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
                `JsResolverSchemaError: Invalid string[] value '${value}' for user arg '${key}' (use: '["a", "b"]')`
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
              `JsResolverSchemaError: Invalid number value '${value}' for user arg '${key}'`
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
                `JsResolverSchemaError: Invalid number[] value '${value}' for user arg '${key}' (use: '[1, 2]')`
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
            `JsResolverSchemaError: Unrecognized type '${type}' for user arg '${key}'`
          );
      }
    }
    return typedUserArgs;
  }

  public async run(payload: JsResolverRunnerPayload): Promise<JsResolverExec> {
    const start = performance.now();
    let success;
    let result;
    let storage;
    let error;
    try {
      const { script, context, options, provider } = payload;
      const data = await this._runInSandbox(script, context, options, provider);
      result = data.result;
      storage = data.storage;
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
    context: JsResolverContextData,
    options: JsResolverRunnerOptions,
    provider: ethers.providers.StaticJsonRpcProvider
  ): Promise<{ result: JsResolverResult; storage: JsResolverStorage }> {
    const SandBoxClass =
      options.runtime === "thread"
        ? JsResolverThreadSandbox
        : JsResolverDockerSandbox;
    this._sandbox = new SandBoxClass(
      { memoryLimit: options.memory },
      options.showLogs ?? false,
      this._debug
    );

    const serverPort =
      options.serverPort ?? (await JsResolverNetHelper.getAvailablePort());
    try {
      this._log(`Sarting sandbox: ${script}`);
      await this._sandbox.start(script, serverPort);
    } catch (err) {
      this._log(`Fail to start JsResolver in sandbox ${err.message}`);
      throw new Error(`JsResolver failed to start sandbox: ${err.message}`);
    }

    // Attach process exit handler to clean runtime environment
    process.on("SIGINT", this.stop.bind(this));

    // Proxy RPC provider
    const proxyProviderPort = await JsResolverNetHelper.getAvailablePort();
    this._proxyProvider = new JsResolverProxyProvider(
      options.runtime === "thread"
        ? "http://127.0.0.1"
        : "http://host.docker.internal",
      proxyProviderPort,
      provider,
      this._debug
    );
    await this._proxyProvider.start();
    context.rpcProviderUrl = this._proxyProvider.getProxyUrl();

    // Start monitoring memory usage
    this._monitorMemoryUsage();

    this._client = new JsResolverHttpClient(
      "http://0.0.0.0",
      serverPort,
      this._debug
    );
    try {
      await this._client.connect(START_TIMEOUT);
    } catch (err) {
      this._log(`Fail to connect to JsResolver ${err.message}`);
      throw new Error(
        `JsResolver start-up timeout (${
          START_TIMEOUT / 1000
        }s) \nMake sure you registered your checker function correctly in your script.`
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
      this._client?.on("output_event", (event: JsResolverEvent) => {
        this._log(`Received event: ${event.action}`);
        switch (event.action) {
          case "result":
            isResolved = true;
            resolve(event.data);
            break;
          case "error":
            isResolved = true;
            reject(event.data);
            break;
          default:
            this._log(`Unknown event: ${event.action}`);
        }
      });

      // Stop waiting for result after timeout expire
      this._execTimeoutId = setTimeout(() => {
        reject(
          new Error(
            `JsResolver exceed execution timeout (${options.timeout / 1000}s)`
          )
        );
      }, options.timeout);

      // Listen to sandbox exit status code to detect runtime error
      this._sandbox?.waitForProcessEnd().then((signal: number) => {
        if (!isResolved)
          if (signal === 0) {
            reject(new Error(`JsResolver exited without returning result`));
          } else {
            reject(new Error(`JsResolver sandbox exited with code=${signal}`));
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

  public async stop() {
    this._log("Stopping runtime environment...");
    if (this._sandbox) await this._sandbox.stop();
    if (this._client) this._client.end();
    if (this._proxyProvider) this._proxyProvider.stop();
    if (this._execTimeoutId) clearTimeout(this._execTimeoutId);
    if (this._memoryIntervalId) clearInterval(this._memoryIntervalId);
    // Remove process exit handler
    process.off("SIGINT", this.stop.bind(this));
  }

  private _log(message: string) {
    if (this._debug) console.log(`JsResolverRunner: ${message}`);
  }
}
