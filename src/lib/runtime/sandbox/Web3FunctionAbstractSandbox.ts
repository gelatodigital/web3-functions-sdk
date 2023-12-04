import colors from "colors/safe";
import { EventEmitter } from "events";
import { Web3FunctionVersion } from "../../types";
import { Web3FunctionSandboxOptions } from "../types";

export abstract class Web3FunctionAbstractSandbox extends EventEmitter {
  protected _memoryLimit: number;
  protected _isStopped = false;
  protected _processExitCodePromise = Promise.resolve(0);
  protected _showStdout: boolean;
  protected _debug: boolean;
  protected _logs: string[] = [];

  constructor(
    options: Web3FunctionSandboxOptions,
    showStdout = true,
    debug = true
  ) {
    super();
    this._memoryLimit = options.memoryLimit;
    this._showStdout = showStdout;
    this._debug = debug;
  }

  public async stop() {
    if (!this._isStopped) {
      this._isStopped = true;
      await this._stop();
    }
  }

  protected abstract _stop(): Promise<void>;
  protected abstract _start(
    script: string,
    version: Web3FunctionVersion,
    serverPort: number,
    mountPath: string,
    httpProxyPort: number,
    args: string[]
  ): Promise<void>;
  protected abstract _getMemoryUsage(): Promise<number>;

  public async start(
    script: string,
    version: Web3FunctionVersion,
    serverPort: number,
    mountPath: string,
    httpProxyPort: number,
    blacklistedHosts?: string[]
  ) {
    const args: string[] = [];

    this._log("Starting sandbox");

    // Prepare common base args here
    args.push("run");

    if (version === Web3FunctionVersion.V1_0_0) {
      args.push(`--allow-env=WEB3_FUNCTION_SERVER_PORT`);
      args.push(`--unstable`);
    } else {
      args.push(
        `--allow-env=WEB3_FUNCTION_SERVER_PORT,WEB3_FUNCTION_MOUNT_PATH`
      );
    }

    args.push(`--allow-net`);
    if (blacklistedHosts && blacklistedHosts.length > 0) {
      args.push(`--deny-net=${blacklistedHosts?.toString()}`);
    }

    args.push(`--no-prompt`);
    args.push(`--no-npm`);
    args.push(`--no-remote`);
    args.push(`--v8-flags=--max-old-space-size=${this._memoryLimit}`);

    await this._start(
      script,
      version,
      serverPort,
      mountPath,
      httpProxyPort,
      args
    );
  }

  public async getMemoryUsage(): Promise<number> {
    try {
      return (await this._getMemoryUsage()) ?? 0;
    } catch (err) {
      return 0;
    }
  }

  public getLogs(): string[] {
    return this._logs;
  }

  protected _onStdoutData(data: string) {
    const output = data.toString();
    output
      .split("\n")
      .filter((line) => line !== "")
      .forEach((line) => {
        this._logs.push(line);
        if (this._showStdout)
          console.log(colors.cyan(`>`), colors.grey(`${line}`));
      });
  }

  public async waitForProcessEnd() {
    return await this._processExitCodePromise;
  }

  protected _log(message: string) {
    if (this._debug) console.log(`Web3FunctionSandbox: ${message}`);
  }
}
