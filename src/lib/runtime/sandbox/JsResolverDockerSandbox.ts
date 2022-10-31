/* eslint-disable no-empty */
import Docker from "dockerode";
import { JsResolverAbstractSandbox } from "./JsResolverAbstractSandbox";

export class JsResolverDockerSandbox extends JsResolverAbstractSandbox {
  private _container?: Docker.Container;

  protected async _stop(): Promise<void> {
    if (!this._container) return;
    try {
      await this._container.kill();
    } catch (err) {}
    try {
      await this._container.remove();
    } catch (err) {}
  }

  protected async _start(script: string, serverPort: number): Promise<void> {
    const cmd = `node`;
    const resolverPath = process.cwd() + "/.tmp/";
    const docker = new Docker({});

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
        Memory: this._memoryLimit * 1024 * 1024,
      },
      Tty: true,
      //StopTimeout: 10,
      Cmd: [cmd, `/resolver/${script}`],
      Image: "node:lts-alpine", // ToDo: chose better image
    };

    let processExitCodeResolver;
    this._processExitCode = new Promise((resolve) => {
      processExitCodeResolver = resolve;
    });

    this._container = await docker.createContainer(createOptions);
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
