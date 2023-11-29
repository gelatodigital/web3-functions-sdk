import path from "node:path";

import { Web3FunctionVersion } from "../../types";
import { Web3FunctionThreadSandbox } from "./Web3FunctionThreadSandbox";

describe("Web3FunctionThreadSandbox", () => {
  const SCRIPT_FOLDER = path.join(
    process.cwd(),
    "src",
    "lib",
    "runtime",
    "sandbox",
    "__test__"
  );

  test("pass correct arguments to runner", async () => {
    const runner = new Web3FunctionThreadSandbox(
      {
        memoryLimit: 10,
      },
      false,
      false
    );

    const serverPort = 8000;
    const mountPath = "./";
    const httpProxyPort = 8080;

    await runner.start(
      path.join(SCRIPT_FOLDER, "simple.ts"),
      Web3FunctionVersion.V2_0_0,
      serverPort,
      mountPath,
      httpProxyPort,
      []
    );

    await runner.waitForProcessEnd();

    const logs = runner.getLogs();

    expect(logs.length).toBe(2);
    expect(logs[0]).toBe(serverPort.toString());
    expect(logs[1]).toBe(mountPath);

    await runner.stop();
  });

  test("should throw on invalid env access", async () => {
    const runner = new Web3FunctionThreadSandbox(
      {
        memoryLimit: 10,
      },
      false,
      false
    );

    const serverPort = 8000;
    const mountPath = "./";
    const httpProxyPort = 8080;

    await runner.start(
      path.join(SCRIPT_FOLDER, "not_allowed_env.ts"),
      Web3FunctionVersion.V2_0_0,
      serverPort,
      mountPath,
      httpProxyPort,
      []
    );

    await runner.waitForProcessEnd();

    const logs = runner.getLogs();

    expect(logs.length).toBe(1);
    expect(logs[0]).toBe("Passed");

    await runner.stop();
  });

  test("should error out when memory exceeded", async () => {
    const runner = new Web3FunctionThreadSandbox(
      {
        memoryLimit: 10,
      },
      false,
      false
    );

    const serverPort = 8000;
    const mountPath = "./";
    const httpProxyPort = 8080;

    await runner.start(
      path.join(SCRIPT_FOLDER, "exceed_memory_usage.ts"),
      Web3FunctionVersion.V2_0_0,
      serverPort,
      mountPath,
      httpProxyPort,
      []
    );

    await runner.waitForProcessEnd();

    const logs = runner.getLogs();

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toMatch("Last few GCs");

    await runner.stop();
  });

  test("should report memory usage", async () => {
    const runner = new Web3FunctionThreadSandbox(
      {
        memoryLimit: 10,
      },
      false,
      false
    );

    const serverPort = 8000;
    const mountPath = "./";
    const httpProxyPort = 8080;

    await runner.start(
      path.join(SCRIPT_FOLDER, "memory_usage.ts"),
      Web3FunctionVersion.V2_0_0,
      serverPort,
      mountPath,
      httpProxyPort,
      []
    );

    await new Promise((r) => setTimeout(r, 1000));

    const memory = await runner.getMemoryUsage();
    await runner.waitForProcessEnd();
    await runner.stop();

    expect(memory).toBeGreaterThan(0);
  });

  test("should ignore stop if already stopped", async () => {
    const runner = new Web3FunctionThreadSandbox(
      {
        memoryLimit: 10,
      },
      false,
      false
    );

    const serverPort = 8000;
    const mountPath = "./";
    const httpProxyPort = 8080;

    await runner.start(
      path.join(SCRIPT_FOLDER, "simple.ts"),
      Web3FunctionVersion.V2_0_0,
      serverPort,
      mountPath,
      httpProxyPort,
      []
    );

    await runner.waitForProcessEnd();
    await runner.stop();
    await runner.stop();
  });

  test("should disable access to blacklisted host", async () => {
    const runner = new Web3FunctionThreadSandbox(
      {
        memoryLimit: 10,
      },
      false,
      false
    );

    const serverPort = 8000;
    const mountPath = "./";
    const httpProxyPort = 8080;

    await runner.start(
      path.join(SCRIPT_FOLDER, "blacklisted_host.ts"),
      Web3FunctionVersion.V2_0_0,
      serverPort,
      mountPath,
      httpProxyPort,
      ["http://gelato.network"]
    );

    await runner.waitForProcessEnd();

    const logs = runner.getLogs();

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toBe("Passed");

    await runner.stop();
  });
});
