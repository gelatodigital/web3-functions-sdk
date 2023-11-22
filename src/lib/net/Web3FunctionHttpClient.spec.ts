import express from "express";
import { Web3FunctionEvent } from "../types";
import { Web3FunctionHttpClient } from "./Web3FunctionHttpClient";

const TEST_PORT = 3500;

describe("Web3FunctionHttpClient", () => {
  let invalidClient: Web3FunctionHttpClient;
  let client: Web3FunctionHttpClient;
  let simpleServer: express.Application;
  let expressServer;

  const startListening = () => {
    expressServer = simpleServer.listen(TEST_PORT);
  };

  beforeAll(() => {
    simpleServer = express();
    simpleServer.use(express.json());

    simpleServer.get("/valid", (req, res) => {
      res.sendStatus(200);
    });

    simpleServer.post("/valid", (req, res) => {
      const data = req.body;

      if (data.data.malformed) {
        res.json({ malformed: true });
      } else {
        res.send(
          JSON.stringify({
            action: "error",
            data: {
              error: {
                name: "Just testing",
                message: `Just testing`,
              },
              storage: {
                state: "last",
                storage: {},
                diff: {},
              },
            },
          })
        );
      }
    });

    startListening();

    invalidClient = new Web3FunctionHttpClient(
      "http://localhost",
      TEST_PORT,
      "invalid"
    );
    client = new Web3FunctionHttpClient(
      "http://localhost",
      TEST_PORT,
      "valid",
      false
    );
  });

  test("should timeout connection if not accessible", async () => {
    await expect(() => invalidClient.connect(100)).rejects.toThrowError(
      "Web3FunctionHttpClient unable to connect"
    );
  });

  test("should disconnect while stopped during connection", async () => {
    await expect(() =>
      Promise.all([client.connect(100), client.end()])
    ).rejects.toThrowError("Disconnected");
  });

  test("should error out when connection is lost during send", (done) => {
    client.emit("input_event", { action: "start", data: {} });
    expressServer.close();

    const errorHandler = (error) => {
      expect(error.message).toMatch(
        "Web3FunctionHttpClient request error: connect ECONNREFUSED"
      );

      startListening();

      client.off("error", errorHandler);
      done();
    };

    client.on("error", errorHandler);
  });

  test("should send and receive web3function events", (done) => {
    client.emit("input_event", { action: "start", data: {} });

    client.on("output_event", (event: Web3FunctionEvent) => {
      expect(event.action).toBe("error");

      if (event.action === "error") {
        expect(event.data.error.message).toMatch("Just testing");
      }

      done();
    });
  });
});
