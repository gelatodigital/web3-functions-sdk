import express from "express";
import http from "http";
import bodyParser from "body-parser";
import crypto from "crypto";
import { ethers } from "ethers";
import { ethErrors, serializeError } from "eth-rpc-errors";

export class Web3FunctionProxyProvider {
  private _debug: boolean;
  private _host: string;
  private _port: number;
  private _mountPath: string;
  private _proxyUrl: string;
  private _provider: ethers.providers.StaticJsonRpcProvider;
  private _app: express.Application = express();
  private _server: http.Server | undefined;
  private _isStopped = false;
  private _nbRpcCalls = 0;
  private _nbThrottledRpcCalls = 0;
  private _limit: number;
  private _whitelistedMethods = ["eth_chainId", "net_version"];

  constructor(
    host: string,
    port: number,
    provider: ethers.providers.StaticJsonRpcProvider,
    limit: number,
    debug = true
  ) {
    this._host = host;
    this._port = port;
    this._provider = provider;
    this._debug = debug;
    this._limit = limit;
    this._mountPath = crypto.randomUUID();
    this._proxyUrl = `${this._host}:${this._port}/${this._mountPath}/`;
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
        const result = await this._provider.send(method, params);
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

  public async start(): Promise<void> {
    this._app.use(bodyParser.json());
    this._app.post(`/${this._mountPath}/`, this._requestHandler.bind(this));

    await new Promise<void>((resolve) => {
      this._server = this._app.listen(this._port, () => {
        this._log(`Listening on: ${this._proxyUrl}`);
        resolve();
      });
    });
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
