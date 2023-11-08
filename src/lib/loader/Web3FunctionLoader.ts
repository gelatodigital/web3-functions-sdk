import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

import { W3fDetails } from "./types";

export class Web3FunctionLoader {
  private static _cache = new Map<string, W3fDetails>();

  private static _loadJson(path: string) {
    if (fs.existsSync(path)) {
      const jsonString = fs.readFileSync(path, "utf8");
      return JSON.parse(jsonString);
    }

    return {};
  }

  private static _loadLog(path: string) {
    const log = this._loadJson(path);

    return Object.keys(log).length === 0 ? undefined : log;
  }

  private static _loadSecrets(path: string) {
    const secrets = {};

    if (fs.existsSync(path)) {
      const config = dotenv.config({ path }).parsed ?? {};
      Object.keys(config).forEach((key) => {
        secrets[key] = config[key];
      });
    }

    return secrets;
  }

  public static load(w3fName: string, w3fRootDir: string): W3fDetails {
    const w3fPath = path.join(w3fRootDir, w3fName);
    const cachedDetails = this._cache.get(w3fPath);
    if (cachedDetails) {
      return cachedDetails;
    }

    const details: W3fDetails = {
      path: "",
      userArgs: {},
      storage: {},
      secrets: {},
    };

    const stats = fs.statSync(w3fPath);
    if (stats.isDirectory()) {
      const jsPath = path.join(w3fPath, "index.js");
      const tsPath = path.join(w3fPath, "index.ts");
      const userArgsJsonPath = path.join(w3fPath, "userArgs.json");
      const storageJsonPath = path.join(w3fPath, "storage.json");
      const logJsonPath = path.join(w3fPath, "log.json");
      const secretsPath = path.join(w3fPath, ".env");

      // Get web3 function
      if (fs.existsSync(tsPath)) {
        details.path = tsPath;
      } else if (fs.existsSync(jsPath)) {
        details.path = jsPath;
      } else throw new Error(`Web3 Function "${w3fName}" not found!`);

      // Get userArgs
      try {
        details.userArgs = this._loadJson(userArgsJsonPath);
      } catch (error) {
        console.error(
          `Error reading userArgs.json for ${w3fName}: ${error.message}`
        );
      }

      // Get storage
      try {
        details.storage = this._loadJson(storageJsonPath);
      } catch (error) {
        console.error(
          `Error reading storage.json for ${w3fName}: ${error.message}`
        );
      }

      // Get secrets
      try {
        details.secrets = this._loadSecrets(secretsPath);
      } catch (error) {
        console.error(`Error reading .env for ${w3fName}: ${error.message}`);
      }

      // Get event log
      try {
        details.log = this._loadLog(logJsonPath);
      } catch (error) {
        console.error(
          `Error reading log.json for ${w3fName}: ${error.message}`
        );
      }
    }

    this._cache.set(w3fPath, details);
    return details;
  }
}
