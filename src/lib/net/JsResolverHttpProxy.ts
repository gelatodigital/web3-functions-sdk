import express from "express";
import http from "http";
import httpProxy from "http-proxy";
import crypto from "crypto";
import { setTimeout as delay } from "timers/promises";

export const SOFT_LIMIT = 5; // 5 rpc calls / second
export const HARD_LIMIT = 10; // 10 rpc calls / second
export const MAX_TIME_DIFFERENCE = 1_000;

export class JsResolverHttpProxy {
  private _debug: boolean;
  private _host: string;
  private _port: number;
  private _mountPath: string;
  private _proxyUrl: string;
  private _proxy: any;
  private _server: http.Server | undefined;
  private _isStopped = false;
  private _nbRpcCalls = 0;
  private _nbThrottledRpcCalls = 0;
  private _throttlingRequests = 0;
  private _lastIntervalStarted = new Date();

  constructor(host: string, port: number, debug = true) {
    this._host = host;
    this._port = port;
    this._debug = debug;
    this._mountPath = crypto.randomUUID();
    this._proxyUrl = `${this._host}:${this._port}/${this._mountPath}/`;
  }

  protected async _checkRateLimit() {
    const now = new Date();
    const timeSinceLastIntervalStarted =
      now.getTime() - this._lastIntervalStarted.getTime();
    if (timeSinceLastIntervalStarted > MAX_TIME_DIFFERENCE) {
      this._lastIntervalStarted = now;
      this._throttlingRequests = 1;
    } else {
      this._throttlingRequests++;
    }
    this._log(`throttlingRequests: ${this._throttlingRequests}`);

    if (this._throttlingRequests > HARD_LIMIT) {
      // Reject requests when reaching hard limit
      this._log(`Too many requests, blocking rpc call`);
      this._nbThrottledRpcCalls++;
      throw new Error("Too many request");
    } else if (this._throttlingRequests > SOFT_LIMIT) {
      // Slow down requests when reaching soft limit
      this._log(`Too many requests, slowing down`);
      await delay(Math.floor(MAX_TIME_DIFFERENCE / 2));
    }
  }

  protected async _requestHandler(req: express.Request, res: express.Response) {
    this._log(`RPC call: ${JSON.stringify(req.body)}`);
    const { method, params, id, jsonrpc } = req.body;
    try {
      this._nbRpcCalls++;

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
    } catch (error) {}
  }

  public async start(): Promise<void> {
    this._proxy = httpProxy.createProxyServer({});
    await new Promise<void>((resolve) => {
      this._server = http
        .createServer((req, res) => {
          this._log(`Listening on: ${this._proxyUrl}`);
          console.log("Request", req.method, req.url);
          this._proxy.web(req, res, {
            target: `${req.protocol}://${req.hostname}`,
          });
        })
        .listen(this._port, () => {
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
    if (this._debug) console.log(`JsResolverProxyProvider: ${message}`);
  }

  public stop() {
    if (!this._isStopped) {
      this._isStopped = true;
      if (this._server) this._server.close();
    }
  }
}
