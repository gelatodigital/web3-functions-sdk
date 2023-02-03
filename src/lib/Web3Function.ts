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
export class Web3Function {
  private static Instance?: Web3Function;
  private static _debug = false;
  private _server: Web3FunctionHttpServer;
  private _onRun?: (ctx: Web3FunctionContext) => Promise<Web3FunctionResult>;

  constructor() {
    const port = Number(Deno.env.get("WEB3_FUNCTION_SERVER_PORT") ?? 80);
    this._server = new Web3FunctionHttpServer(
      port,
      Web3Function._debug,
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
          const { result, ctxData } = await this._run(event.data.context);

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
        Web3Function._log(`Unrecognized parent process event: ${event.action}`);
        throw new Error(`Unrecognized parent process event: ${event.action}`);
    }
  }

  private async _run(ctxData: Web3FunctionContextData) {
    if (!this._onRun)
      throw new Error("Web3Function.onRun function is not registered");

    const context: Web3FunctionContext = {
      gelatoArgs: {
        ...ctxData.gelatoArgs,
        gasPrice: BigNumber.from(ctxData.gelatoArgs.gasPrice),
      },
      provider: this._initProvider(ctxData.rpcProviderUrl),
      userArgs: ctxData.userArgs,
      secrets: {
        get: async (key: string) => {
          Web3Function._log(`secrets.get(${key})`);
          return ctxData.secrets[key];
        },
      },
      storage: {
        get: async (key: string) => {
          Web3Function._log(`storage.get(${key})`);
          return ctxData.storage[key];
        },
        set: async (key: string, value: string) => {
          if (typeof value !== "string") {
            throw new Error("Web3FunctionStorageError: value must be a string");
          }
          Web3Function._log(`storage.set(${key},${value})`);
          ctxData.storage[key] = value;
        },
        delete: async (key: string) => {
          Web3Function._log(`storage.delete(${key})`);
          ctxData.storage[key] = undefined;
        },
      },
    };

    const result = await this._onRun(context);
    return { result, ctxData };
  }

  private _exit(code = 0) {
    setTimeout(() => {
      this._server.close();
      Deno.exit(code);
    });
  }

  static getInstance(): Web3Function {
    if (!Web3Function.Instance) {
      Web3Function.Instance = new Web3Function();
    }
    return Web3Function.Instance;
  }

  static onRun(
    onRun: (ctx: Web3FunctionContext) => Promise<Web3FunctionResult>
  ): void {
    Web3Function._log("Registering onRun function");
    Web3Function.getInstance()._onRun = onRun;
  }

  static setDebug(debug: boolean) {
    Web3Function._debug = debug;
  }

  private static _log(message: string) {
    if (Web3Function._debug) console.log(`Web3Function: ${message}`);
  }

  private _initProvider(
    providerUrl: string | undefined
  ): ethers.providers.StaticJsonRpcProvider {
    const provider = new ethers.providers.StaticJsonRpcProvider(providerUrl);
    // Listen to response to check for rate limit error
    provider.on("debug", (data) => {
      if (data.action === "response" && data.error) {
        if (/Request limit exceeded/.test(data.error.message)) {
          console.error("Web3FunctionError: RPC requests limit exceeded");
          this._exit(250);
        }
      }
    });
    return provider;
  }
}
