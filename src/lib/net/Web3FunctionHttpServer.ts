import { Web3FunctionEvent } from "../types/Web3FunctionEvent";

export class Web3FunctionHttpServer {
  private _eventHandler: (
    event: Web3FunctionEvent
  ) => Promise<Web3FunctionEvent>;
  private _waitConnectionReleased: Promise<void> = Promise.resolve();
  private _debug: boolean;

  constructor(
    port: number,
    mountPath: string,
    debug: boolean,
    eventHandler: (event: Web3FunctionEvent) => Promise<Web3FunctionEvent>
  ) {
    this._debug = debug;
    this._eventHandler = eventHandler;
    this._setupConnection(port, mountPath);
  }

  private async _setupConnection(port: number, mountPath: string) {
    const conns = Deno.listen({ port, hostname: "0.0.0.0" });
    this._log(`Listening on http://${conns.addr.hostname}:${conns.addr.port}`);

    for await (const conn of conns) {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      let connectionReleaseResolver = () => {
        // Intentionally left empty to use as variable
      };
      this._waitConnectionReleased = new Promise((resolve) => {
        connectionReleaseResolver = () => {
          resolve();
        };
      });

      for await (const e of Deno.serveHttp(conn)) {
        const res = await this._onRequest(e.request, mountPath);
        await e.respondWith(res);
      }
      connectionReleaseResolver();
    }
  }

  private async _onRequest(req: Request, mountPath: string) {
    if (!this._isValidMountPath(req, mountPath)) {
      return new Response("invalid path", { status: 400 });
    }

    switch (req.method) {
      case "GET":
        return new Response("ok");
      case "POST": {
        const event = (await req.json()) as Web3FunctionEvent;
        const res = await this._eventHandler(event);
        return new Response(JSON.stringify(res));
      }
      default:
        return new Response(`unsupported method: ${req.method}`, {
          status: 500,
        });
    }
  }

  private _isValidMountPath(req: Request, mountPath: string) {
    const { pathname } = new URL(req.url);

    if (pathname === `/${mountPath}`) return true;
    return false;
  }

  private _log(message: string) {
    if (this._debug) console.log(`Web3FunctionHttpServer: ${message}`);
  }

  public async waitConnectionReleased() {
    await this._waitConnectionReleased;
  }
}
