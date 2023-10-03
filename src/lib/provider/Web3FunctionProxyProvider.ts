import { StaticJsonRpcProvider } from "@ethersproject/providers";
import bodyParser from "body-parser";
import crypto from "crypto";
import { ethErrors, serializeError } from "eth-rpc-errors";
import express from "express";
import http from "http";
import { MultiChainProviderConfig } from "./types";

export class Web3FunctionProxyProvider {
  private _debug: boolean;
  private _host: string;
  private _mountPath: string;
  private _proxyUrl!: string;
  private _app: express.Application = express();
  private _server: http.Server | undefined;
  private _isStopped = false;
  private _nbRpcCalls = 0;
  private _nbThrottledRpcCalls = 0;
  private _limit: number;
  private _whitelistedMethods = ["eth_chainId", "net_version"];
  private _providers: Map<number, StaticJsonRpcProvider>;
  private _mainChainId: number;

  constructor(
    host: string,
    limit: number,
    mainChainId: number,
    multiChainProviderConfig: MultiChainProviderConfig,
    debug = true
  ) {
    this._mainChainId = mainChainId;
    this._host = host;
    this._debug = debug;
    this._limit = limit;
    this._mountPath = crypto.randomUUID();
    this._providers = new Map();
    this._instantiateProvider(multiChainProviderConfig);
  }

  protected async _checkRateLimit() {
    if (this._nbRpcCalls > this._limit) {
      // Reject requests when reaching hard limit
      this._log(`Too many requests, blocking rpc call`);
      this._nbThrottledRpcCalls++;
      throw ethErrors.rpc.limitExceeded();
    }
  }

  protected async _requestHandler(req: express.Request, res: express.Response) {
    this._log(`RPC call: ${JSON.stringify(req.body)}`);
    const { method, params, id, jsonrpc } = req.body;
    const chainId = req.params.chainId
      ? parseInt(req.params.chainId)
      : this._mainChainId;

    try {
      // Reject invalid JsonRPC requests
      if (!method || !params) throw ethErrors.rpc.invalidRequest();

      this._nbRpcCalls++;

      // Apply rate limiting for non whitelisted methods
      if (!this._whitelistedMethods.includes(method)) {
        await this._checkRateLimit();
      }

      // Forward RPC call to internal provider
      try {
        const provider = this._providers.get(chainId);

        if (!provider) throw ethErrors.provider.chainDisconnected();

        const result = await provider.send(method, params);
        // Send result as valid JsonRPC response
        res.send({ result, id, jsonrpc });
      } catch (providerError) {
        // Extract internal provider error
        let parsedProviderError;
        if (providerError.body) {
          try {
            const jsonResponse = JSON.parse(providerError.body);
            parsedProviderError = jsonResponse.error;
          } catch (_err) {
            parsedProviderError = providerError;
          }
          throw parsedProviderError;
        }
        throw providerError;
      }
    } catch (_error) {
      // Standardizing RPC error before returning to the user
      // If the serializer cannot extract a valid error, it will fallback to: { code: -32603, message: 'Internal JSON-RPC error.'}
      const { code, message } = serializeError(_error);
      // Send result as valid JsonRPC error
      res.send({ id, jsonrpc, error: { code, message } });
    }
  }

  private _instantiateProvider(multiChainProviders: MultiChainProviderConfig) {
    const chainIds: number[] = [];
    for (const [chainIdStr, provider] of Object.entries(multiChainProviders)) {
      const chainId = parseInt(chainIdStr);
      this._providers.set(chainId, provider);
      chainIds.push(chainId);
    }

    this._log(`Providers injected for chainIds: ${JSON.stringify(chainIds)}`);

    if (!chainIds.includes(this._mainChainId)) {
      throw new Error(
        `Proxy provider cannot be instantiated, default chainId ${this._mainChainId} doesn't have a provider configured`
      );
    }
  }

  public async start(port = 3000): Promise<void> {
    await new Promise<void>((resolve) => {
      this._server = this._app.listen(port, () => {
        this._log(`Listening on: ${this._proxyUrl}`);
        resolve();
      });
    });

    this._app.use(bodyParser.json());
    this._app.post(`/${this._mountPath}/`, this._requestHandler.bind(this));
    this._app.post(
      `/${this._mountPath}/:chainId`,
      this._requestHandler.bind(this)
    );

    this._proxyUrl = `${this._host}:${port}/${this._mountPath}`;
  }

  public getNbRpcCalls(): { total: number; throttled: number } {
    return {
      total: this._nbRpcCalls,
      throttled: this._nbThrottledRpcCalls,
    };
  }

  public getProxyUrl(): string {
    return this._proxyUrl;
  }

  private _log(message: string) {
    if (this._debug) console.log(`Web3FunctionProxyProvider: ${message}`);
  }

  public stop() {
    if (!this._isStopped) {
      this._isStopped = true;
      if (this._server) this._server.close();
    }
  }
}
