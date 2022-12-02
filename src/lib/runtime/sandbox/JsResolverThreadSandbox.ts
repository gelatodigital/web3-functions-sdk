/* eslint-disable no-empty */
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import pidusage from "pidusage";
import { JsResolverAbstractSandbox } from "./JsResolverAbstractSandbox";

export class JsResolverThreadSandbox extends JsResolverAbstractSandbox {
  private _thread?: ChildProcessWithoutNullStreams;

  protected async _stop(): Promise<void> {
    if (!this._thread) return;
    this._thread.kill();
  }

  protected async _start(script: string, serverPort: number): Promise<void> {
    const cmd = process.env.DENO_PATH ?? `./node_modules/deno-bin/bin/deno`;
    const args: string[] = [];
    args.push("run");
    args.push(`--allow-env=JS_RESOLVER_SERVER_PORT`);
    args.push(`--allow-net`);
    args.push(`--unstable`);
    args.push(`--no-prompt`);
    args.push(`--no-npm`);
    args.push(`--no-remote`);
    args.push(`--v8-flags=--max-old-space-size=${this._memoryLimit}`);
    args.push(script);
    this._thread = spawn(cmd, args, {
      shell: true,
      cwd: process.cwd(),
      env: { JS_RESOLVER_SERVER_PORT: serverPort.toString() },
    });

    let processExitCodeResolver;
    this._processExitCode = new Promise((resolve) => {
      processExitCodeResolver = resolve;
    });

    this._thread.on("close", (code: number, signal: string) => {
      this._log(`Thread exited with code=${code} signal=${signal}`);
      processExitCodeResolver(code);
    });
    this._thread.stdout.on("data", this._onStdoutData.bind(this));
    this._thread.stderr.on("data", this._onStdoutData.bind(this));
  }

  protected async _getMemoryUsage(): Promise<number> {
    const stats = await pidusage(this._thread?.pid);
    return stats?.memory;
  }
}
