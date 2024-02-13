import net from "net";

export class Web3FunctionNetHelper {
  public static getAvailablePort(
    occupiedPorts: number[] = []
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const srv = net.createServer();
      srv.listen(0, async () => {
        const address = srv.address();
        const port = address && typeof address === "object" ? address.port : -1;
        srv.close(async () => {
          if (port === -1) {
            reject(new Error("Failed to get a port."));
            return;
          }

          if (occupiedPorts.includes(port)) {
            try {
              const newPort = await Web3FunctionNetHelper.getAvailablePort(
                occupiedPorts
              );
              resolve(newPort);
            } catch (error) {
              reject(error);
            }
          } else {
            resolve(port);
          }
        });
      });
    });
  }

  public static async getAvailablePorts(size: number): Promise<number[]> {
    const ports: number[] = [];
    let retries = 0;
    const maxRetries = size * 2;
    while (ports.length < size) {
      const port = await Web3FunctionNetHelper.getAvailablePort();
      if (ports.includes(port)) {
        retries++;
        if (retries === maxRetries) {
          throw new Error(
            `Web3FunctionNetHelper Error: Unable to get ${size} free ports`
          );
        }
      } else {
        ports.push(port);
      }
    }
    return ports;
  }
}
