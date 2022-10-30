import { performance } from "perf_hooks";
import net from "net";
import { setTimeout as delay } from "timers/promises";
import { EventEmitter } from "stream";
import { JsResolverEvent } from "../types/JsResolverEvent";
export class JsResolverTcpClient extends EventEmitter {
  private _debug: boolean;
  private _port: number;
  private _isStopped = false;
  private _client?: net.Socket;

  constructor(port: number, debug = true) {
    super();
    this._debug = debug;
    this._port = port;
  }

  public async connect(timeout: number) {
    const retryInterval = 50;
    const end = performance.now() + timeout;
    while (!this._client && !this._isStopped && performance.now() < end) {
      try {
        this._client = await this._createClientIfLive();
        this._log(`Connected to JsResolverTcpServer socket!`);
      } catch (err) {
        await delay(retryInterval);
      }
    }

    // Current instance has been stopped before we could connect
    if (this._isStopped) throw new Error(`Disconnected`);

    if (!this._client) {
      throw new Error(
        `JsResolverTcpClient unable to connect (timeout=${timeout}ms)`
      );
    }

    this._client.on("data", this._onData.bind(this));
    this._client.on("error", this._onError.bind(this));
    this._client.on("end", this._onEnd.bind(this));
    this.on("input_event", this._send.bind(this));
  }

  private async _createClientIfLive(
    livenessTimeout = 100
  ): Promise<net.Socket> {
    return new Promise<net.Socket>((resolve, reject) => {
      const client = net.createConnection({ port: this._port }, () => {
        // Send ping/pong handshake and expect response in less 100ms response
        client.write("ping");
        client.on("data", (data) => {
          if (data.toString() === "pong") resolve(client);
        });
        setTimeout(reject, livenessTimeout);
      });
      client.on("error", reject);
    });
  }

  private async _send(event: JsResolverEvent) {
    this._client?.write(JSON.stringify(event));
  }

  private async _onData(data) {
    this._log(`Received socket msg: ${data.toString()}`);
    const rawEvents = data.toString().split("\n");
    for (const rawEvent of rawEvents) {
      if (!rawEvent) continue;
      try {
        const event = JSON.parse(rawEvent) as JsResolverEvent;
        this._log(`Received JsResolverEvent: ${event.action}`);
        this.emit("output_event", event);
      } catch (err) {
        this._log(`Error parsing message: ${err.message}`);
      }
    }
  }

  private _onError(err: Error) {
    this._log(`Error: ${err.message}`);
    throw err;
  }

  private _onEnd() {
    this._log(`Connection closed`);
  }

  private _log(message: string) {
    if (this._debug) console.log(`JsResolverTcpClient: ${message}`);
  }

  public end() {
    if (!this._isStopped) {
      this._isStopped = true;
      this._client?.end();
    }
  }
}
