import { BigNumber, ethers } from "ethers";
import { JsResolverHttpServer } from "./net/JsResolverHttpServer";
import {
  JsResolverContext,
  JsResolverContextData,
} from "./types/JsResolverContext";
import { JsResolverResult } from "./types/JsResolverResult";
import { JsResolverEvent } from "./types/JsResolverEvent";

export class JsResolverSdk {
  private static Instance?: JsResolverSdk;
  private static _debug = true;
  private _server: JsResolverHttpServer;
  private _checker?: (ctx: JsResolverContext) => Promise<JsResolverResult>;

  constructor() {
    const port = Number(Deno.env.get("JS_RESOLVER_SERVER_PORT") ?? 80);
    this._server = new JsResolverHttpServer(
      port,
      JsResolverSdk._debug,
      this._onEvent.bind(this)
    );
  }

  private async _onEvent(event: JsResolverEvent): Promise<JsResolverEvent> {
    switch (event?.action) {
      case "start": {
        try {
          const result = await this._runChecker(event.data.context);
          // ToDo: validate result format
          return {
            action: "result",
            data: { result },
          };
        } catch (error) {
          return {
            action: "error",
            data: {
              error: {
                name: error.name,
                message: `${error.name}: ${error.message}`,
              },
            },
          };
        } finally {
          this._exit();
        }
        break;
      }
      default:
        JsResolverSdk._log(
          `Unrecognized parent process event: ${event.action}`
        );
        throw new Error(`Unrecognized parent process event: ${event.action}`);
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
      provider: new ethers.providers.StaticJsonRpcProvider(
        contextData.rpcProviderUrl
      ),
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

  private _exit(code = 0) {
    setTimeout(() => {
      this._server.close();
      Deno.exit(code);
    });
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
