import { Web3FunctionEvent } from "../types/Web3FunctionEvent";

export class Web3FunctionHttpServer {
  private _server: any; //http.Server;
  private _eventHandler: (
    event: Web3FunctionEvent
  ) => Promise<Web3FunctionEvent>;
  private _port: number;
  private _debug: boolean;

  constructor(
    port: number,
    debug: boolean,
    eventHandler: (event: Web3FunctionEvent) => Promise<Web3FunctionEvent>
  ) {
    this._debug = debug;
    this._port = port;
    this._eventHandler = eventHandler;

    this._setupConnection(port);
  }

  private async _setupConnection(port: number) {
    const conns = Deno.listen({ port, hostname: "0.0.0.0" });
    this._log(`Listening on http://${conns.addr.hostname}:${conns.addr.port}`);

    for await (const conn of conns) {
      for await (const e of Deno.serveHttp(conn)) {
        const res = await this._onRequest(e.request);
        await e.respondWith(res);
      }
    }
  }

  private async _onRequest(req: Request) {
    switch (req.method) {
      case "GET":
        return new Response("ok");
      case "POST": {
        const event = await req.json();
        const res = await this._eventHandler(event);
        return new Response(JSON.stringify(res));
      }
      default:
        return new Response(`unsupported method: ${req.method}`, {
          status: 500,
        });
    }
  }

  private _log(message: string) {
    if (this._debug) console.log(`Web3FunctionHttpServer: ${message}`);
  }

  public close() {
    //this._server.close();
  }
}
