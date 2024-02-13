import axios from "axios";
import http from "http";
import { Web3FunctionHttpProxy } from "./Web3FunctionHttpProxy";

const MAX_DOWNLOAD_SIZE = 1 * 1024;
const MAX_UPLOAD_SIZE = 1 * 1024;
const MAX_REQUESTS = 2;

const limitPayload = `07687025835896630850868449444515\n
                19004885209543960311432986080541\n
                03158281758729558593090926184825\n
                40772319890392416463798330135022\n
                07702013838043904240082977642434\n
                78566525722876389716880511958995\n
                12035921191774613938722741086776\n
                50288953712326350078906469208225\n
                58479170878046405538264425626156\n
                20466941989979842517387202418765\n
                30898445718944664974752192926478\n
                10829190843006647792462329496676\n
                69172422122281182915998920830447\n
                68159615670566716041444574158276\n
                60694522988055341504065499436440\n
                78154146011219258273400776799336\n
                54545430660844152600367106532410\n
                03483614367103665993033133233507\n
                97294966024323840999755783241680\n
                82279112196345575379498270220001\n
                82279112196345575379498270220001\n
                82279112196345575379498270220001\n
                `;

describe("Web3FunctionHttpProxy", () => {
  let httpProxy: Web3FunctionHttpProxy;
  let testServer: http.Server;

  beforeAll(() => {
    axios.defaults.proxy = {
      host: "localhost",
      port: 3000,
      protocol: "http:",
    };

    // Create an HTTP server
    testServer = http.createServer((req, res) => {
      // Set the response header with a 200 OK status and plain text content type
      res.writeHead(200, { "Content-Type": "text/plain" });

      if (req.url?.includes("limit")) {
        res.end(limitPayload);
      } else {
        // Write the response body
        res.end("Hello, World!\n");
      }
    });

    // Listen on port 3000 (you can choose any available port)
    const port = 8001;
    testServer.listen(port);
  });

  afterAll(() => {
    testServer.close();
  });

  beforeEach(async () => {
    httpProxy = new Web3FunctionHttpProxy(
      MAX_DOWNLOAD_SIZE,
      MAX_UPLOAD_SIZE,
      MAX_REQUESTS,
      false
    );

    await httpProxy.start();
  });

  afterEach(async () => {
    httpProxy.stop();
  });

  test("should respond HTTP:429 when request limit exceeded", async () => {
    try {
      await axios.get("http://localhost:8001");
      await axios.get("http://localhost:8001");
      await axios.get("http://localhost:8001");
    } catch (error) {
      if (error.response) {
        expect(error.response.status).toEqual(429);
        return;
      }
    }

    throw new Error(`HTTP: Request limit exceeded`);
  });

  test("should break connection on download limit exceeded", async () => {
    try {
      await axios.get("http://localhost:8001/limit");
    } catch (error) {
      expect(error.code).toEqual("ECONNRESET");

      return;
    }

    throw new Error(`HTTP: download limit exceeded`);
  });

  test("should break connection on upload limit exceed", async () => {
    try {
      await axios.post("http://localhost:8001", limitPayload);
    } catch (error) {
      expect(error.code).toEqual("ECONNRESET");

      return;
    }

    throw new Error(`HTTP: upload limit exceeded`);
  });
});
