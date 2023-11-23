import { BigNumber } from "@ethersproject/bignumber";
import { diff } from "deep-object-diff";
import { Web3FunctionHttpServer } from "./net/Web3FunctionHttpServer";
import "./polyfill/XMLHttpRequest";
import { Web3FunctionMultiChainProvider } from "./provider/Web3FunctionMultiChainProvider";
import {
  Web3FunctionContext,
  Web3FunctionContextData,
  Web3FunctionOnFailContextData,
  Web3FunctionOnRunContextData,
  Web3FunctionOnSuccessContextData,
} from "./types/Web3FunctionContext";
import { Web3FunctionEvent } from "./types/Web3FunctionEvent";
import {
  BaseRunHandler,
  EventRunHandler,
  FailHandler,
  RunHandler,
  SuccessHandler,
} from "./types/Web3FunctionHandler";

export class Web3Function {
  private static Instance?: Web3Function;
  private static _debug = false;
  private _server: Web3FunctionHttpServer;
  private _onRun?: RunHandler;
  private _onSuccess?: SuccessHandler;
  private _onFail?: FailHandler;

  constructor() {
    const port = Number(Deno.env.get("WEB3_FUNCTION_SERVER_PORT") ?? 80);
    const mountPath = Deno.env.get("WEB3_FUNCTION_MOUNT_PATH");
    this._server = new Web3FunctionHttpServer(
      port,
      mountPath,
      Web3Function._debug,
      this._onFunctionEvent.bind(this)
    );
  }

  private async _onFunctionEvent(
    event: Web3FunctionEvent
  ): Promise<Web3FunctionEvent> {
    if (event?.action === "start") {
      const prevStorage = { ...event.data.context.storage };

      try {
        const { result, ctxData } =
          event.data.context.operation === "onRun"
            ? await this._invokeOnRun(event.data.context)
            : event.data.context.operation === "onFail"
            ? await this._invokeOnFail(event.data.context)
            : await this._invokeOnSuccess(event.data.context);

        const { difference, state } = this._compareStorage(
          prevStorage,
          ctxData.storage
        );

        return {
          action: "result",
          data: {
            result,
            storage: {
              state,
              storage: ctxData.storage,
              diff: difference,
            },
            callbacks: {
              onFail: this._onFail !== undefined,
              onSuccess: this._onSuccess !== undefined,
            },
          },
        };
      } catch (error) {
        return {
          action: "error",
          data: {
            error: {
              name: error.name,
              message: `${error.name}: ${error.message}`,
            },
            storage: {
              state: "last",
              storage: prevStorage,
              diff: {},
            },
            callbacks: {
              onFail: this._onFail !== undefined,
              onSuccess: this._onSuccess !== undefined,
            },
          },
        };
      } finally {
        this._exit();
      }
    } else {
      Web3Function._log(`Unrecognized parent process event: ${event.action}`);
      throw new Error(`Unrecognized parent process event: ${event.action}`);
    }
  }

  private async _invokeOnRun(ctxData: Web3FunctionOnRunContextData) {
    const context = this._context(ctxData);

    if (ctxData.operation !== "onRun")
      throw new Error(
        `Invalid '${ctxData.operation}' operation for _invokeOnRun`
      );
    if (!this._onRun)
      throw new Error("Web3Function.onRun function is not registered");

    const result = ctxData.log
      ? await (this._onRun as EventRunHandler)({
          ...context,
          log: ctxData.log,
        })
      : await (this._onRun as BaseRunHandler)(context);

    return { result, ctxData };
  }

  private async _invokeOnFail(ctxData: Web3FunctionOnFailContextData) {
    const context = this._context(ctxData);

    if (ctxData.operation !== "onFail")
      throw new Error(
        `Invalid '${ctxData.operation}' operation for _invokeOnFail`
      );
    if (!this._onFail)
      throw new Error("Web3Function.onFail function is not registered");

    if (ctxData.onFailReason === "SimulationFailed") {
      await this._onFail({
        ...context,
        reason: ctxData.onFailReason,
        callData: ctxData.callData as string,
      });
    } else if (ctxData.onFailReason === "ExecutionReverted") {
      await this._onFail({
        ...context,
        reason: ctxData.onFailReason,
        transactionHash: ctxData.transactionHash as string,
      });
    }

    return {
      result: undefined,
      ctxData,
    };
  }

  private async _invokeOnSuccess(ctxData: Web3FunctionOnSuccessContextData) {
    const context = this._context(ctxData);

    if (ctxData.operation !== "onSuccess")
      throw new Error(
        `Invalid '${ctxData.operation}' operation for _invokeOnSuccess`
      );
    if (!this._onSuccess)
      throw new Error("Web3Function.onSuccess function is not registered");

    await this._onSuccess({
      ...context,
      transactionHash: ctxData.transactionHash,
    });

    return {
      result: undefined,
      ctxData,
    };
  }

  private _context(ctxData: Web3FunctionContextData) {
    const context: Web3FunctionContext = {
      gelatoArgs: {
        ...ctxData.gelatoArgs,
        gasPrice: BigNumber.from(ctxData.gelatoArgs.gasPrice),
      },
      multiChainProvider: this._initProvider(
        ctxData.rpcProviderUrl,
        ctxData.gelatoArgs.chainId
      ),
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

    return context;
  }

  private _compareStorage(
    prevStorage: object,
    afterStorage: object
  ): {
    difference: object;
    state: "last" | "updated";
  } {
    const difference = diff(prevStorage, afterStorage);
    for (const key in difference) {
      if (difference[key] === undefined) {
        difference[key] = null;
      }
    }

    const state = Object.keys(difference).length === 0 ? "last" : "updated";

    return { difference, state };
  }

  private _exit(code = 0, force = false) {
    if (force) {
      Deno.exit(code);
    } else {
      setTimeout(async () => {
        await this._server.waitConnectionReleased();
        Deno.exit(code);
      });
    }
  }

  static getInstance(): Web3Function {
    if (!Web3Function.Instance) {
      Web3Function.Instance = new Web3Function();
    }
    return Web3Function.Instance;
  }

  static onRun(onRun: BaseRunHandler): void;
  static onRun(onRun: EventRunHandler): void;
  static onRun(onRun: any): void {
    Web3Function._log("Registering onRun function");
    Web3Function.getInstance()._onRun = onRun;
  }

  static onSuccess(onSuccess: SuccessHandler): void;
  static onSuccess(onSuccess: any): void {
    Web3Function._log("Registering onSuccess function");
    Web3Function.getInstance()._onSuccess = onSuccess;
  }

  static onFail(onFail: FailHandler): void;
  static onFail(onFail: any): void {
    Web3Function._log("Registering onFail function");
    Web3Function.getInstance()._onFail = onFail;
  }

  static setDebug(debug: boolean) {
    Web3Function._debug = debug;
  }

  private static _log(message: string) {
    if (Web3Function._debug) console.log(`Web3Function: ${message}`);
  }

  private _onRpcRateLimit() {
    console.log("_onRpcRateLimit");
    this._exit(250, true);
  }

  private _initProvider(
    providerUrl: string | undefined,
    defaultChainId: number
  ): Web3FunctionMultiChainProvider {
    if (!providerUrl) throw new Error("Missing providerUrl");
    return new Web3FunctionMultiChainProvider(
      providerUrl,
      defaultChainId,
      this._onRpcRateLimit.bind(this)
    );
  }
}
