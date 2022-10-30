import { performance } from "perf_hooks";
import net from "net";
import { JsResolverTcpClient } from "../tcp/JsResolverTcpClient";
import { JsResolverContextData } from "../types/JsResolverContext";
import { JsResolverEvent } from "../types/JsResolverEvent";
import { JsResolverAbstractSandbox } from "./sandbox/JsResolverAbstractSandbox";
import { JsResolverExec } from "../types/JsResolverExecResult";
import { JsResolverDockerSandbox } from "./sandbox/JsResolverDockerSandbox";
import { JsResolverThreadSandbox } from "./sandbox/JsResolverThreadSandbox";
import { JsResolverRunnerOptions } from "../types/JsResolverRunnerOptions";

const START_TIMEOUT = 5_000;
const EXEC_TIMEOUT = 30_000;
const MEMORY_LIMIT = 128;

export class JsResolverRunner {
  private _debug: boolean;
  private _memory = 0;
  private _client?: JsResolverTcpClient;
  private _sandbox?: JsResolverAbstractSandbox;
  private _execTimeoutId?: NodeJS.Timeout;
  private _memoryIntervalId?: NodeJS.Timer;

  constructor(debug = false) {
    this._debug = debug;
  }

  public async run(
    script: string,
    context: JsResolverContextData,
    options: JsResolverRunnerOptions
  ): Promise<JsResolverExec> {
    const start = performance.now();
    let success;
    let result;
    let error;
    try {
      result = await this._runInSandbox(script, context, options);
      success = true;
    } catch (err) {
      error = err;
      success = false;
    } finally {
      this.stop();
    }

    const logs = [];
    const duration = (performance.now() - start) / 1000;
    const memory = this._memory / 1024 / 1024;
    this._log(`Runtime duration=${duration.toFixed(2)}s`);
    this._log(`Runtime memory=${memory.toFixed(2)}mb`);
    if (success) {
      return { success, result, logs, duration, memory };
    } else {
      return { success, error, logs, duration, memory };
    }
  }

  private async _runInSandbox(
    script: string,
    context: JsResolverContextData,
    options: JsResolverRunnerOptions
  ) {
    const SandBoxClass =
      options.runtime === "thread"
        ? JsResolverThreadSandbox
        : JsResolverDockerSandbox;
    this._sandbox = new SandBoxClass(
      { memoryLimit: options.memory ?? MEMORY_LIMIT },
      options.showLogs ?? false,
      this._debug
    );

    const serverPort = await this._getAvailablePort();
    try {
      this._log(`Sarting sandbox: ${script}`);
      await this._sandbox.start(script, serverPort);
    } catch (err) {
      this._log(`Fail to start JsResolver in sandbox ${err.message}`);
      throw new Error(`JsResolver failed to start sandbox: ${err.message}`);
    }

    // Attach process exit handler to clean runtime environment
    process.on("SIGINT", this.stop.bind(this));

    // Start monitoring memory usage
    this._monitorMemoryUsage();

    this._client = new JsResolverTcpClient(serverPort, this._debug);
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
      this._client?.on("output_event", (event: JsResolverEvent) => {
        this._log(`Received event: ${event.action}`);
        switch (event.action) {
          case "result":
            isResolved = true;
            resolve(event.data.result);
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
      const execTimeout = options.timeout ?? EXEC_TIMEOUT;
      this._execTimeoutId = setTimeout(() => {
        reject(
          new Error(
            `JsResolver exceed execution timeout (${execTimeout / 1000}s)`
          )
        );
      }, execTimeout);

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
    }, 10);
  }

  private async _getAvailablePort(): Promise<number> {
    return new Promise((res, rej) => {
      const srv = net.createServer();
      srv.listen(0, () => {
        const address = srv.address();
        const port = address && typeof address === "object" ? address.port : -1;
        srv.close(() => (port ? res(port) : rej()));
      });
    });
  }

  public stop() {
    this._log("Stopping runtime environment...");
    if (this._sandbox) this._sandbox.stop();
    if (this._client) this._client.end();
    if (this._execTimeoutId) clearTimeout(this._execTimeoutId);
    if (this._memoryIntervalId) clearInterval(this._memoryIntervalId);
    // Remove process exit handler
    process.off("SIGINT", this.stop.bind(this));
  }

  private _log(message: string) {
    if (this._debug) console.log(`JsResolverRunner: ${message}`);
  }
}
