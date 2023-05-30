import http, { IncomingMessage, Server, ServerResponse } from "http";
import net from "net";
import { Duplex } from "stream";

type BlacklistedHandler = (url: URL) => boolean;

interface Web3FunctionHttpProxyStats {
  nbRequests: number;
  download: number; // in KB
  upload: number; // in KB
}

export class Web3FunctionHttpProxy {
  private _debug: boolean;
  private _isStopped: boolean = true;

  private readonly _maxDownload: number;
  private readonly _maxUpload: number;
  private readonly _maxRequests: number;
  private _isBlacklisted: BlacklistedHandler;

  private _totalDownload = 0;
  private _totalUpload = 0;
  private _totalRequests = 0;

  private _server: Server;

  constructor(
    maxDownloadSize: number,
    maxUploadSize: number,
    maxRequests: number,
    blacklistedHandler: BlacklistedHandler,
    debug: boolean
  ) {
    this._debug = debug;

    this._maxDownload = maxDownloadSize;
    this._maxUpload = maxUploadSize;
    this._maxRequests = maxRequests;
    this._isBlacklisted = blacklistedHandler;

    this._server = http.createServer(this._handleServer.bind(this));
    this._server.on("connect", this._handleSecureServer.bind(this));
  }

  private _handleServer(req: IncomingMessage, res: ServerResponse) {
    if (req.url === undefined) {
      this._log("Request doesn't include any URL");
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Bad request");

      this._log(`Bad request received with no URL`);
      return;
    }

    if (this._totalRequests++ >= this._maxRequests) {
      res.writeHead(429, { "Content-Type": "text/plain" });
      res.end("Too many requests");

      this._log("Request limit exceeded");
      return;
    }

    try {
      const reqUrl = new URL(req.url);

      if (this._isBlacklisted(reqUrl)) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Destination is forbidden");

        this._log(`W3F requested a blacklisted address: ${req.url}`);
        return;
      }

      this._log(`Request url is proxied: ${req.url}`);

      const options = {
        hostname: reqUrl.hostname,
        port: reqUrl.port,
        path: reqUrl.pathname,
        method: req.method,
        headers: req.headers,
      };

      const serverConnection = http.request(
        options,
        (serverRes: IncomingMessage) => {
          serverRes.on("data", (chunk) => {
            this._totalDownload += chunk.length;
            if (this._totalDownload >= this._maxDownload) {
              this._log("Download limit exceeded");

              serverConnection.destroy();
              res.destroy();
            }
          });

          res.writeHead(serverRes.statusCode ?? 200, serverRes.headers);
          serverRes.pipe(res);
        }
      );

      req.on("data", (chunk) => {
        this._totalUpload += chunk.length;
        if (this._totalUpload >= this._maxUpload) {
          this._log("Upload limit exceeded");

          req.destroy();
        }
      });
      req.pipe(serverConnection);

      req.on("error", (err) => {
        this._log(`Connection error to W3F runner: ${err.message}`);
      });

      serverConnection.on("error", (err) => {
        this._log(`Connection error to target: ${err.message}`);
      });
    } catch (err) {
      this._log(`Error during handling proxy: ${err.message}`);
      return;
    }
  }

  private _handleSecureServer(
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ) {
    if (req.url === undefined) {
      this._log("Request doesn't include any URL");
      socket.end();
      return;
    }

    if (this._totalRequests++ >= this._maxRequests) {
      this._log("Request limit exceeded");
      socket.end();
      return;
    }

    try {
      const reqUrl = new URL(`https://${req.url}`);

      if (this._isBlacklisted(reqUrl)) {
        this._log(`W3F requested a blacklisted address: ${reqUrl}`);
        socket.end();
        return;
      }

      this._log(`Secure request url is proxied: ${reqUrl.toString()}`);

      const options = {
        port: reqUrl.port === "" ? 443 : parseInt(reqUrl.port),
        host: reqUrl.hostname,
      };

      const serverSocket = net.connect(options, () => {
        socket.write(
          `HTTP/${req.httpVersion} 200 Connection Established\r\nProxy-Agent: Gelato-W3F-Proxy\r\n\r\n`,
          "utf-8",
          () => {
            serverSocket.write(head);
            serverSocket.pipe(socket);
            socket.pipe(serverSocket);
          }
        );
      });

      serverSocket.on("data", (data: Buffer) => {
        this._totalDownload += data.length;

        if (this._totalDownload > this._maxDownload) {
          this._log("Download limit exceeded");
          req.destroy();
          serverSocket.destroy();
        }
      });

      socket.on("data", (data: Buffer) => {
        this._totalUpload += data.length;

        if (this._totalUpload >= this._maxUpload) {
          this._log("Upload limit exceeded");
          req.destroy();
          serverSocket.destroy();
        }
      });

      socket.on("error", (err) => {
        this._log(`Socket error to W3F runner: ${err.message}`);
        serverSocket.end();
      });

      serverSocket.on("error", (err) => {
        this._log(`Socket error to target: ${err.message}`);
        socket.end();
      });
    } catch (err) {
      this._log(`Error during handling HTTPs proxy: ${err.message}`);
    }
  }

  private _log(message: string) {
    if (this._debug) console.log(`Web3FunctionHttpProxy: ${message}`);
  }

  public start(port: number = 3000) {
    this._server
      .listen(port, () => {
        this._log(`Started listening on ${port}`);
        this._isStopped = false;
      })
      .on("error", (err) => {
        this._log(`Proxy server cannot be started: ${err}`);
        this.stop();
      });
  }

  public stop() {
    if (!this._isStopped) {
      this._isStopped = true;
      if (this._server) this._server.close();
    }
  }

  public getStats(): Web3FunctionHttpProxyStats {
    return {
      nbRequests: this._totalRequests,
      download: Math.trunc(this._totalDownload / 1024),
      upload: Math.trunc(this._totalUpload / 1024),
    };
  }
}
