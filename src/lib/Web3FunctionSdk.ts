import { BigNumber, ethers } from "ethers";
import { Web3FunctionHttpServer } from "./net/Web3FunctionHttpServer";
import {
  Web3FunctionContext,
  Web3FunctionContextData,
} from "./types/Web3FunctionContext";
import { Web3FunctionResult } from "./types/Web3FunctionResult";
import {
  Web3FunctionEvent,
  Web3FunctionStorage,
} from "./types/Web3FunctionEvent";
import objectHash = require("object-hash");
export class Web3FunctionSdk {
  private static Instance?: Web3FunctionSdk;
  private static _debug = false;
  private _server: Web3FunctionHttpServer;
  private _checker?: (ctx: Web3FunctionContext) => Promise<Web3FunctionResult>;

  constructor() {
    const port = Number(Deno.env.get("WEB3_FUNCTION_SERVER_PORT") ?? 80);
    this._server = new Web3FunctionHttpServer(
      port,
      Web3FunctionSdk._debug,
      this._onEvent.bind(this)
    );
  }

  private async _onEvent(event: Web3FunctionEvent): Promise<Web3FunctionEvent> {
    switch (event?.action) {
      case "start": {
        let storage: Web3FunctionStorage = {
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
        Web3FunctionSdk._log(
          `Unrecognized parent process event: ${event.action}`
        );
        throw new Error(`Unrecognized parent process event: ${event.action}`);
    }
  }

  private async _runChecker(ctxData: Web3FunctionContextData) {
    if (!this._checker)
      throw new Error("Web3Function.onChecker function is not registered");

    const context: Web3FunctionContext = {
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
          Web3FunctionSdk._log(`secrets.get(${key})`);
          return ctxData.secrets[key];
        },
      },
      storage: {
        get: async (key: string) => {
          Web3FunctionSdk._log(`storage.get(${key})`);
          return ctxData.storage[key];
        },
        set: async (key: string, value: string) => {
          if (typeof value !== "string") {
            throw new Error("Web3FunctionStorageError: value must be a string");
          }
          Web3FunctionSdk._log(`storage.set(${key},${value})`);
          ctxData.storage[key] = value;
        },
        delete: async (key: string) => {
          Web3FunctionSdk._log(`storage.delete(${key})`);
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

  static getInstance(): Web3FunctionSdk {
    if (!Web3FunctionSdk.Instance) {
      Web3FunctionSdk.Instance = new Web3FunctionSdk();
    }
    return Web3FunctionSdk.Instance;
  }

  static onChecker(
    checker: (ctx: Web3FunctionContext) => Promise<Web3FunctionResult>
  ): void {
    Web3FunctionSdk._log("Registering checker function");
    Web3FunctionSdk.getInstance()._checker = checker;
  }

  static setDebug(debug: boolean) {
    Web3FunctionSdk._debug = debug;
  }

  private static _log(message: string) {
    if (Web3FunctionSdk._debug) console.log(`Web3FunctionSdk: ${message}`);
  }
}
