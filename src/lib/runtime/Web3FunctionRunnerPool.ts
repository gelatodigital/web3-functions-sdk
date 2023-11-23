import { Web3FunctionNetHelper } from "../net/Web3FunctionNetHelper";
import { Web3FunctionExec, Web3FunctionRunnerPayload } from "./types";
import { Web3FunctionRunner } from "./Web3FunctionRunner";

export class Web3FunctionRunnerPool {
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
    this._tcpPortsAvailable = await Web3FunctionNetHelper.getAvailablePorts(
      this._poolSize + 10
    );
  }

  public async run(
    payload: Web3FunctionRunnerPayload
  ): Promise<Web3FunctionExec> {
    return this._enqueueAndWait(payload);
  }

  private async _enqueueAndWait(
    payload: Web3FunctionRunnerPayload
  ): Promise<Web3FunctionExec> {
    return new Promise((resolve, reject) => {
      this._queuedRunners.push(async (): Promise<void> => {
        this._activeRunners = this._activeRunners + 1;
        const port = this._tcpPortsAvailable.shift();
        try {
          this._log(
            `Starting Web3FunctionRunner, active=${this._activeRunners} port=${port}`
          );
          const runner = new Web3FunctionRunner(this._debug);
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
    for (
      let runner = this._queuedRunners.shift();
      runner;
      runner = this._queuedRunners.shift()
    ) {
      this._log(`_processNext, active=${this._activeRunners}`);
      await runner();
    }
  }

  private _log(message: string) {
    if (this._debug) console.log(`Web3FunctionRunnerPool: ${message}`);
  }
}
