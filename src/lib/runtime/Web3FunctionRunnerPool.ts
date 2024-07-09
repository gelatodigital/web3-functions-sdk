import { Web3FunctionNetHelper } from "../net/Web3FunctionNetHelper";
import { Web3FunctionOperation } from "../types";
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
      (this._poolSize + 5) * 3 // 3 ports per concurrent runner + 5 extra
    );
  }

  public async run<T extends Web3FunctionOperation>(
    operation: T,
    payload: Web3FunctionRunnerPayload<T>
  ): Promise<Web3FunctionExec<T>> {
    return this._enqueueAndWait(operation, payload);
  }

  private async _enqueueAndWait<T extends Web3FunctionOperation>(
    operation: T,
    payload: Web3FunctionRunnerPayload<T>
  ): Promise<Web3FunctionExec<T>> {
    return new Promise((resolve, reject) => {
      this._queuedRunners.push(async (): Promise<void> => {
        this._activeRunners = this._activeRunners + 1;
        const port1 = this._tcpPortsAvailable.shift();
        const port2 = this._tcpPortsAvailable.shift();
        const port3 = this._tcpPortsAvailable.shift();
        try {
          this._log(
            `Starting Web3FunctionRunner, active=${this._activeRunners} ports=${port1},${port2},${port3}`
          );
          const runner = new Web3FunctionRunner(
            this._debug,
            this._tcpPortsAvailable
          );
          payload.options.serverPort = port1;
          payload.options.httpProxyPort = port2;
          payload.options.rpcProxyPort = port3;
          const exec = await runner.run(operation, payload);
          resolve(exec);
        } catch (err) {
          reject(err);
        } finally {
          if (port1) this._tcpPortsAvailable.push(port1);
          if (port2) this._tcpPortsAvailable.push(port2);
          if (port3) this._tcpPortsAvailable.push(port3);
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
