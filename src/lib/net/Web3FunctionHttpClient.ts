// Use undici client as node@20.http has keepAlive errors
// See github issue: https://github.com/nodejs/node/issues/47130
import { Agent, request } from "undici";

import { EventEmitter } from "events";
import { performance } from "perf_hooks";
import { Web3FunctionEvent } from "../types/Web3FunctionEvent";
const delay = (t: number) => new Promise((resolve) => setTimeout(resolve, t));

export class Web3FunctionHttpClient extends EventEmitter {
  private _debug: boolean;
  private _host: string;
  private _port: number;
  private _mountPath: string;
  private _isStopped = false;

  constructor(host: string, port: number, mountPath: string, debug = true) {
    super();
    this._host = host;
    this._port = port;
    this._debug = debug;
    this._mountPath = mountPath;
    this.on("input_event", this._safeSend.bind(this));
  }

  public async connect(timeout: number) {
    const retryInterval = 50;
    const end = performance.now() + timeout;
    let statusOk = false;
    let lastErrMsg = "";
    while (!statusOk && !this._isStopped && performance.now() < end) {
      try {
        const status = await new Promise<number>(async (resolve, reject) => {
          const requestAbortController = new AbortController();
          const timeoutId = setTimeout(() => {
            requestAbortController.abort();
            reject(new Error("Timeout"));
          }, 100);
          try {
            const { statusCode } = await request(
              `${this._host}:${this._port}/${this._mountPath}`,
              {
                dispatcher: new Agent({ pipelining: 0 }),
                signal: requestAbortController.signal,
              }
            );
            resolve(statusCode);
          } catch (err) {
            reject(err);
          } finally {
            clearTimeout(timeoutId);
          }
        });
        statusOk = status === 200;
        this._log(`Connected to Web3FunctionHttpServer socket!`);
      } catch (err) {
        let errMsg = `${err.message} `;

        lastErrMsg = errMsg;
        await delay(retryInterval);
      }
    }

    // Current instance has been stopped before we could connect
    if (this._isStopped) throw new Error(`Disconnected`);

    if (!statusOk) {
      throw new Error(
        `Web3FunctionHttpClient unable to connect (timeout=${timeout}ms): ${lastErrMsg}`
      );
    }
  }

  private async _safeSend(event: Web3FunctionEvent) {
    try {
      await this._send(event);
    } catch (error) {
      this.emit("error", error);
    }
  }

  private async _send(event: Web3FunctionEvent) {
    let res;

    try {
      const { body } = await request(
        `${this._host}:${this._port}/${this._mountPath}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(event),
          dispatcher: new Agent({ pipelining: 0 }),
        }
      );
      res = body;
    } catch (err) {
      const errMsg = err.toString();
      throw new Error(`Web3FunctionHttpClient request error: ${errMsg}`);
    }
    try {
      const event = (await res.json()) as Web3FunctionEvent;
      this._log(`Received Web3FunctionEvent: ${event.action}`);
      this.emit("output_event", event);
    } catch (err) {
      this._log(`Error parsing message: ${err.message}`);
      console.log(res.data);
      throw new Error(`Web3FunctionHttpClient response error: ${err.message}`);
    }
  }
  private _log(message: string) {
    if (this._debug) console.log(`Web3FunctionHttpClient: ${message}`);
  }

  public end() {
    if (!this._isStopped) {
      this._isStopped = true;
    }
  }
}
