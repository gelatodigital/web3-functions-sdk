/* eslint-disable no-empty */
import Docker, { ImageInfo } from "dockerode";
import { JsResolverAbstractSandbox } from "./Web3FunctionAbstractSandbox";

export class JsResolverDockerSandbox extends JsResolverAbstractSandbox {
  private _container?: Docker.Container;
  private _docker = new Docker();
  private _denoImage = "denoland/deno:alpine-1.28.1";

  protected async _stop(): Promise<void> {
    if (!this._container) return;
    try {
      await this._container.kill();
    } catch (err) {}
    try {
      await this._container.remove();
    } catch (err) {}
  }

  protected async _createImageIfMissing(image: string) {
    let images: ImageInfo[] = [];
    try {
      images = await this._docker.listImages({
        filters: JSON.stringify({ reference: [image] }),
      });
    } catch (err) {}

    if (images.length === 0) {
      this._log(`Creating docker image: ${image}`);
      const created = await this._docker.createImage({ fromImage: image });
      await new Promise((resolve) => {
        created.on("data", (raw) => {
          const lines = raw.toString().split("\r\n");
          lines.forEach((line) => {
            if (line === "") return;
            const data = JSON.parse(line);
            this._log(`${data.status} ${data.progress ?? ""}`);
          });
        });
        created.once("end", resolve);
      });
      this._log(`Docker image created!`);
    }
  }

  protected async _start(script: string, serverPort: number): Promise<void> {
    const cmd = `deno`;
    const args: string[] = [];
    args.push("run");
    args.push(`--allow-env=JS_RESOLVER_SERVER_PORT`);
    args.push(`--allow-net`);
    args.push(`--unstable`);
    args.push(`--no-prompt`);
    args.push(`--no-npm`);
    args.push(`--no-remote`);
    args.push(`--v8-flags=--max-old-space-size=${this._memoryLimit}`);
    args.push(`/resolver/${script}`);
    const resolverPath = process.cwd() + "/.tmp/";

    // See docker create options:
    // https://docs.docker.com/engine/api/v1.37/#tag/Container/operation/ContainerCreate
    const createOptions = {
      ExposedPorts: {
        [`${serverPort.toString()}/tcp`]: {},
      },
      Env: [`JS_RESOLVER_SERVER_PORT=${serverPort.toString()}`],
      Hostconfig: {
        Binds: [`${resolverPath}:/resolver/.tmp`],
        PortBindings: {
          [`${serverPort.toString()}/tcp`]: [
            { HostPort: `${serverPort.toString()}` },
          ],
        },
        NetworkMode: "bridge",
        Memory: this._memoryLimit * 1024 * 1024,
      },
      Tty: true,
      //StopTimeout: 10,
      Cmd: [cmd, ...args],
      Image: this._denoImage,
    };

    let processExitCodeResolver;
    this._processExitCode = new Promise((resolve) => {
      processExitCodeResolver = resolve;
    });

    await this._createImageIfMissing(this._denoImage);
    this._container = await this._docker.createContainer(createOptions);
    const containerStream = await this._container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });
    containerStream.setEncoding("utf8");
    containerStream.on("data", this._onStdoutData.bind(this));
    containerStream.on("end", async () => {
      try {
        // Container has stopped
        const status = await this._container?.wait();
        processExitCodeResolver(status.StatusCode);
        this._log(`Container exited with code=${status.StatusCode}`);
      } catch (err) {
        processExitCodeResolver(1);
        this._log(`Unable to get container exit code, error: ${err.message}`);
      }
    });
    await this._container.start({});
  }
  protected async _getMemoryUsage(): Promise<number> {
    const stats = await this._container?.stats({ stream: false });
    return stats?.memory_stats.usage ?? 0;
  }
}
