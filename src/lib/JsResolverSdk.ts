import { BigNumber, ethers } from "ethers";
import { JsResolverHttpServer } from "./net/JsResolverHttpServer";
import {
  JsResolverContext,
  JsResolverContextData,
} from "./types/JsResolverContext";
import { JsResolverResult } from "./types/JsResolverResult";
import { JsResolverEvent, JsResolverStorage } from "./types/JsResolverEvent";
import objectHash = require("object-hash");
export class JsResolverSdk {
  private static Instance?: JsResolverSdk;
  private static _debug = false;
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
        let storage: JsResolverStorage = {
          state: "last",
          storage: { ...event.data.context.storage },
        };

        try {
          const { result, ctxData } = await this._runChecker(
            event.data.context
          );

          const lastStorageHash = objectHash(storage.storage, {
            algorithm: "md5",
            unorderedObjects: true,
          });

          const returnedStoragehash = objectHash(ctxData.storage, {
            algorithm: "md5",
            unorderedObjects: true,
          });

          if (lastStorageHash !== returnedStoragehash)
            storage = { state: "updated", storage: ctxData.storage };

          // ToDo: validate result format
          return {
            action: "result",
            data: { result, storage },
          };
        } catch (error) {
          return {
            action: "error",
            data: {
              error: {
                name: error.name,
                message: `${error.name}: ${error.message}`,
              },
              storage,
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
    const ctxData = { ...contextData };
    if (!this._checker)
      throw new Error("JsResolver.onChecker function is not registered");

    const context: JsResolverContext = {
      gelatoArgs: {
        ...ctxData.gelatoArgs,
        gasPrice: BigNumber.from(ctxData.gelatoArgs.gasPrice),
      },
      provider: new ethers.providers.StaticJsonRpcProvider(
        ctxData.rpcProviderUrl
      ),
      userArgs: ctxData.userArgs,
      secrets: {
        get: async (key: string) => {
          JsResolverSdk._log(`secrets.get(${key})`);
          return ctxData.secrets[key];
        },
      },
      storage: {
        get: async (key: string) => {
          JsResolverSdk._log(`storage.get(${key})`);
          return ctxData.storage[key];
        },
        set: async (key: string, value: string) => {
          JsResolverSdk._log(`storage.set(${key},${value})`);
          ctxData.storage[key] = value;
        },
        delete: async (key: string) => {
          JsResolverSdk._log(`storage.delete(${key})`);
          ctxData.storage[key] = undefined;
        },
      },
    };

    const result = await this._checker(context);
    return { result, ctxData };
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
