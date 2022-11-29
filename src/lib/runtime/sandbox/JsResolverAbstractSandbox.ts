import { EventEmitter } from "node:stream";
import colors from "colors/safe";
import { JsResolverSandboxOptions } from "../../tcp";

export abstract class JsResolverAbstractSandbox extends EventEmitter {
  protected _memoryLimit: number;
  protected _isStopped = false;
  protected _processExitCode = Promise.resolve(0);
  protected _showStdout: boolean;
  protected _debug: boolean;
  protected _logs: string[] = [];

  constructor(
    options: JsResolverSandboxOptions,
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
  protected abstract _start(script: string, serverPort: number): Promise<void>;
  protected abstract _getMemoryUsage(): Promise<number>;

  public async start(script: string, serverPort: number) {
    this._log("Starting sandbox");
    await this._start(script, serverPort);
  }

  public async getMemoryUsage(): Promise<number> {
    try {
      return (await this._getMemoryUsage()) ?? 0;
    } catch (err) {
      return 0;
    }
  }

  protected _onStdoutData(data: string) {
    const output = data.toString();
    if (this._showStdout)
      output
        .split("\n")
        .filter((line) => line !== "")
        .forEach((line) =>
          console.log(colors.cyan(`>`), colors.grey(`${line}`))
        );
  }

  public async waitForProcessEnd() {
    return await this._processExitCode;
  }

  protected _log(message: string) {
    if (this._debug) console.log(`JsResolverSandbox: ${message}`);
  }
}
