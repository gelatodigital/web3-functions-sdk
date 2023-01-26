import { performance } from "perf_hooks";
import axios from "axios";
import { EventEmitter } from "stream";
import { Web3FunctionEvent } from "../types/Web3FunctionEvent";

const delay = (t: number) => new Promise((resolve) => setTimeout(resolve, t));

export class Web3FunctionHttpClient extends EventEmitter {
  private _debug: boolean;
  private _host: string;
  private _port: number;
  private _isStopped = false;

  constructor(host: string, port: number, debug = true) {
    super();
    this._host = host;
    this._port = port;
    this._debug = debug;
    this.on("input_event", this._safeSend.bind(this));
  }

  public async connect(timeout: number) {
    const retryInterval = 50;
    const end = performance.now() + timeout;
    let statusOk = false;
    while (!statusOk && !this._isStopped && performance.now() < end) {
      try {
        const res = await axios.get(`${this._host}:${this._port}/`, {
          timeout: 100,
        });
        statusOk = res.status === 200;
        this._log(`Connected to Web3FunctionHttpServer socket!`);
      } catch (err) {
        await delay(retryInterval);
      }
    }

    // Current instance has been stopped before we could connect
    if (this._isStopped) throw new Error(`Disconnected`);

    if (!statusOk) {
      throw new Error(
        `Web3FunctionHttpClient unable to connect (timeout=${timeout}ms)`
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
      res = await axios.post(`${this._host}:${this._port}`, event);
    } catch (err) {
      throw new Error(`Web3FunctionHttpClient request error: ${err.message}`);
    }
    try {
      const event = res.data as Web3FunctionEvent;
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
