/* eslint-disable no-empty */
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import path from "path";
import pidusage from "pidusage";
import { Web3FunctionVersion } from "../../types";
import { SANDBOX_SCRIPT } from "../types/LibStatic";
import { Web3FunctionAbstractSandbox } from "./Web3FunctionAbstractSandbox";

export class Web3FunctionThreadSandbox extends Web3FunctionAbstractSandbox {
  private _thread?: ChildProcessWithoutNullStreams;

  protected async _stop(): Promise<void> {
    if (!this._thread) return;
    this._thread.kill("SIGKILL");
  }

  protected async _start(
    script: string,
    version: Web3FunctionVersion,
    serverPort: number,
    mountPath: string,
    httpProxyHost: string,
    httpProxyPort: number,
    args: string[]
  ): Promise<void> {
    const cmd =
      process.env.DENO_PATH ??
      path.join(process.cwd(), "node_modules", "deno-bin", "bin", "deno");

    let env = {};

    if (version === Web3FunctionVersion.V1_0_0) {
      env = { WEB3_FUNCTION_SERVER_PORT: serverPort.toString() };
    } else {
      env = {
        WEB3_FUNCTION_SERVER_PORT: serverPort.toString(),
        WEB3_FUNCTION_MOUNT_PATH: mountPath,
      };
    }

    const httpProxyUrl = `${httpProxyHost}:${httpProxyPort}`;
    env["HTTP_PROXY"] = httpProxyUrl;
    env["HTTPS_PROXY"] = httpProxyUrl;

    args.push(`--allow-read=${script}`);
    args.push(SANDBOX_SCRIPT);
    args.push(`--script=${script}`);
    this._thread = spawn(cmd, args, {
      shell: true,
      cwd: process.cwd(),
      env,
    });

    let processExitCodeFunction;
    this._processExitCodePromise = new Promise((resolve) => {
      processExitCodeFunction = resolve;
    });

    this._thread.on("close", (code: number, signal: string) => {
      this._log(`Thread exited with code=${code} signal=${signal}`);
      processExitCodeFunction(code);
    });
    this._thread.stdout.on("data", this._onStdoutData.bind(this));
    this._thread.stderr.on("data", this._onStdoutData.bind(this));
  }

  protected async _getMemoryUsage(): Promise<number> {
    const stats = await pidusage(this._thread?.pid);
    return stats?.memory;
  }
}
