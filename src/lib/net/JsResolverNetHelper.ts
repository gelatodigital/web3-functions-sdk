import net from "net";

export class JsResolverNetHelper {
  public static getAvailablePort(): Promise<number> {
    return new Promise((res, rej) => {
      const srv = net.createServer();
      srv.listen(0, () => {
        const address = srv.address();
        const port = address && typeof address === "object" ? address.port : -1;
        srv.close(() => (port ? res(port) : rej()));
      });
    });
  }

  public static async getAvailablePorts(size: number): Promise<number[]> {
    const ports: number[] = [];
    let retries = 0;
    const maxRetries = size * 2;
    while (ports.length < size) {
      const port = await JsResolverNetHelper.getAvailablePort();
      if (ports.includes(port)) {
        retries++;
        if (retries === maxRetries) {
          throw new Error(
            `JsResolverNetHelper Error: Unable to get ${size} free ports`
          );
        }
      } else {
        ports.push(port);
      }
    }
    return ports;
  }
}
