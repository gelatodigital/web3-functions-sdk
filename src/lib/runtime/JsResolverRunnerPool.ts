import { JsResolverTcpHelper } from "../tcp/JsResolverTcpHelper";
import { JsResolverExec } from "./types/JsResolverExecResult";
import { JsResolverRunnerPayload } from "./types";
import { JsResolverRunner } from "./JsResolverRunner";

export class JsResolverRunnerPool {
  private _poolSize: number;
  private _queuedRunners: (() => Promise<void>)[] = [];
  private _activeRunners = 0;
  private _debug: boolean;
  private _tcpPortsAvailable: number[] = [];

  constructor(poolSize = 10, debug = true) {
    this._poolSize = poolSize;
    this._debug = debug;
  }

  public async init() {
    this._tcpPortsAvailable = await JsResolverTcpHelper.getAvailablePorts(
      this._poolSize
    );
  }

  public async run(payload: JsResolverRunnerPayload): Promise<JsResolverExec> {
    return this._enqueueAndWait(payload);
  }

  private async _enqueueAndWait(
    payload: JsResolverRunnerPayload
  ): Promise<JsResolverExec> {
    return new Promise((resolve, reject) => {
      this._queuedRunners.push(async (): Promise<void> => {
        this._activeRunners = this._activeRunners + 1;
        const port = this._tcpPortsAvailable.pop();
        try {
          this._log(
            `Starting JsResolverRunner, active=${this._activeRunners} port=${port}`
          );
          const runner = new JsResolverRunner(this._debug);
          payload.options.serverPort = port;
          const exec = await runner.run(payload);
          resolve(exec);
        } catch (err) {
          reject(err);
        } finally {
          if (port) this._tcpPortsAvailable.push(port);
          this._activeRunners = this._activeRunners - 1;
        }
      });

      if (this._activeRunners < this._poolSize) {
        this._processNext();
      }
    });
  }

  private async _processNext() {
    this._log(`_processNext, active=${this._activeRunners}`);
    const runner = this._queuedRunners.pop();
    if (!runner) return;
    await runner();
    if (this._queuedRunners.length > 0) {
      return this._processNext();
    }
  }

  private _log(message: string) {
    if (this._debug) console.log(`JsResolverRunnerPool: ${message}`);
  }
}
