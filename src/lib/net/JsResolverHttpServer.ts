import { JsResolverEvent } from "../types/JsResolverEvent";

export class JsResolverHttpServer {
  private _server: any; //http.Server;
  private _eventHandler: (event: JsResolverEvent) => Promise<JsResolverEvent>;
  private _port: number;
  private _debug: boolean;

  constructor(
    port: number,
    debug: boolean,
    eventHandler: (event: JsResolverEvent) => Promise<JsResolverEvent>
  ) {
    this._debug = debug;
    this._port = port;
    this._eventHandler = eventHandler;

    this._server = Deno.serve({
      port,
      hostname: "0.0.0.0",
      onListen: ({ port, hostname }) => {
        this._log(`Listening on http://${hostname}:${port}`);
      },
      handler: this._onRequest.bind(this),
    });
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
    if (this._debug) console.log(`JsResolverHttpServer: ${message}`);
  }

  public close() {
    //this._server.close();
  }
}
