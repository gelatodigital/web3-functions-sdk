/* eslint-disable no-empty */
import path from "path";
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import pidusage from "pidusage";
import { Web3FunctionAbstractSandbox } from "./Web3FunctionAbstractSandbox";

export class Web3FunctionThreadSandbox extends Web3FunctionAbstractSandbox {
  private _thread?: ChildProcessWithoutNullStreams;

  protected async _stop(): Promise<void> {
    if (!this._thread) return;
    this._thread.kill();
  }

  protected async _start(
    script: string,
    serverPort: number,
    mountPath: string
  ): Promise<void> {
    const cmd =
      process.env.DENO_PATH ??
      path.join(process.cwd(), "node_modules", "deno-bin", "bin", "deno");
    const args: string[] = [];
    args.push("run");

    let env = {};

    if (this._web3FunctionvVersion === "1.0.0") {
      args.push(`--allow-env=WEB3_FUNCTION_SERVER_PORT`);
      args.push(`--unstable`);
      env = { WEB3_FUNCTION_SERVER_PORT: serverPort.toString() };
    } else {
      args.push(
        `--allow-env=WEB3_FUNCTION_SERVER_PORT,WEB3_FUNCTION_MOUNT_PATH`
      );
      env = {
        WEB3_FUNCTION_SERVER_PORT: serverPort.toString(),
        WEB3_FUNCTION_MOUNT_PATH: mountPath,
      };
    }

    args.push(`--allow-net`);
    args.push(`--no-prompt`);
    args.push(`--no-npm`);
    args.push(`--no-remote`);
    args.push(`--v8-flags=--max-old-space-size=${this._memoryLimit}`);
    args.push(script);
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
