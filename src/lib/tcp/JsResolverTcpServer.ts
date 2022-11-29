import net from "net";
import { EventEmitter } from "stream";
import { JsResolverEvent } from "../types/JsResolverEvent";

export class JsResolverTcpServer extends EventEmitter {
  private _server: net.Server;
  private _debug: boolean;
  private _clients: Map<string, net.Socket> = new Map<string, net.Socket>();

  constructor(port: number, debug: boolean) {
    super();
    this._debug = debug;
    this._server = net.createServer(this._onConnection.bind(this));
    this._server.listen(port, this._onReady.bind(this));
    this._server.on("error", this._onError.bind(this));
    this.on("output_event", this._broadcastEvent.bind(this));
  }

  private _onReady() {
    this._log(`Server ready`);
  }

  private _onError(err: Error) {
    this._log(`Socket error: ${err.message}`);
    throw err;
  }

  private _broadcastEvent(event: JsResolverEvent) {
    this._clients.forEach((client) => {
      client.write(JSON.stringify(event) + "\n");
    });
  }

  private _onConnection(client: net.Socket) {
    const address = JSON.stringify(client.address());
    this._log(`Client connected ${address}`);
    this._clients.set(address, client);
    client.on("end", () => {
      this._log(`Client disconnected ${address}`);
      this._clients.delete(address);
    });
    client.on("data", (data) => {
      const input = data.toString();
      this._log("JsResolverTcpServer: received input data");
      if (input === "ping") {
        // Handshake ping/pong
        client.write("pong");
        return;
      }
      try {
        const event = JSON.parse(input);
        this.emit("input_event", event);
      } catch (err) {
        this._log(`Input parsing error ${err.message}`);
      }
    });
  }

  private _log(message: string) {
    if (this._debug) console.log(`JsResolverTcpServer: ${message}`);
  }

  public close() {
    this._server.close();
  }
}
