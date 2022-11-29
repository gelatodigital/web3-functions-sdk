import { BigNumber } from "ethers";
import { JsResolverTcpServer } from "./tcp/JsResolverTcpServer";
import {
  JsResolverContext,
  JsResolverContextData,
} from "./types/JsResolverContext";
import { JsResolverResult } from "./types/JsResolverResult";
import { JsResolverEvent /* LogLevel */ } from "./types/JsResolverEvent";

export class JsResolverSdk {
  private static Instance?: JsResolverSdk;
  private static _debug = false;
  private _server: JsResolverTcpServer;
  private _checker?: (ctx: JsResolverContext) => Promise<JsResolverResult>;

  constructor() {
    const port = Number(process.env.JS_RESOLVER_SERVER_PORT ?? 80);
    this._server = new JsResolverTcpServer(port, JsResolverSdk._debug);
    this._server.on("input_event", this._onEvent.bind(this));
  }

  private async _onEvent(event: JsResolverEvent) {
    switch (event?.action) {
      case "start":
        {
          try {
            const result = await this._runChecker(event.data.context);
            // ToDo: validate result format
            this._server.emit("output_event", {
              action: "result",
              data: { result },
            });
          } catch (error) {
            this._server.emit("output_event", {
              action: "error",
              data: { error },
            });
          } finally {
            this._exit();
          }
        }
        break;
      default:
        JsResolverSdk._log(
          `Unrecognized parent process event: ${event.action}`
        );
    }
  }

  private async _runChecker(contextData: JsResolverContextData) {
    if (!this._checker)
      throw new Error("JsResolver.onChecker function is not registered");

    const context: JsResolverContext = {
      gelatoArgs: {
        ...contextData.gelatoArgs,
        gasPrice: BigNumber.from(contextData.gelatoArgs.gasPrice),
      },
      userArgs: contextData.userArgs,
      secrets: {
        get: async (key: string) => {
          JsResolverSdk._log(`secrets.get(${key})`);
          return contextData.secrets[key];
        },
      },
      storage: {
        get: async (key: string) => {
          JsResolverSdk._log(`storage.get(${key})`);
          return contextData.storage[key];
        },
        set: async (key: string, value: string) => {
          JsResolverSdk._log(`storage.set(${key},${value})`);
          contextData.storage[key] = value;
        },
        delete: async (key: string) => {
          JsResolverSdk._log(`storage.delete(${key})`);
          contextData.storage[key] = undefined;
        },
      },
    };

    return this._checker(context);
  }

  private _exit() {
    this._server.close();
    process.exit();
  }

  static getInstance(): JsResolverSdk {
    if (!JsResolverSdk.Instance) {
      JsResolverSdk.Instance = new JsResolverSdk();
    }
    return JsResolverSdk.Instance;
  }

  static onChecker(
    checker: (ctx: JsResolverContext) => Promise<JsResolverResult>
  ): void {
    JsResolverSdk._log("Registering checker function");
    JsResolverSdk.getInstance()._checker = checker;
  }

  static setDebug(debug: boolean) {
    JsResolverSdk._debug = debug;
  }

  private static _log(message: string) {
    if (JsResolverSdk._debug) console.log(`JsResolverSdk: ${message}`);
  }
}
