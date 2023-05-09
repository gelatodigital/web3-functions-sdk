import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

import { W3fDetails } from "./types";

export class Web3FunctionLoader {
  private static _cache = new Map<string, W3fDetails>();

  public static load(w3fName: string, w3fRootDir: string): W3fDetails {
    const w3fPath = path.join(w3fRootDir, w3fName);
    if (this._cache.has(w3fPath)) {
      return this._cache.get(w3fPath) as W3fDetails;
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
      const secretsPath = path.join(w3fPath, ".env");

      // Get web3 function
      if (fs.existsSync(tsPath)) {
        details.path = tsPath;
      } else if (fs.existsSync(jsPath)) {
        details.path = jsPath;
      } else throw new Error(`Web3 Function "${w3fName}" not found!`);

      // Get userArgs
      if (fs.existsSync(userArgsJsonPath)) {
        try {
          const userArgsJsonString = fs.readFileSync(userArgsJsonPath, "utf8");
          details.userArgs = JSON.parse(userArgsJsonString);
        } catch (error) {
          console.error(
            `Error reading userArgs.json for ${w3fName}: ${error.message}`
          );
        }
      }

      // Get storage
      if (fs.existsSync(storageJsonPath)) {
        try {
          const storageJsonString = fs.readFileSync(storageJsonPath, "utf8");
          details.storage = JSON.parse(storageJsonString);
        } catch (error) {
          console.error(
            `Error reading storage.json for ${w3fName}: ${error.message}`
          );
        }
      }

      // Get secrets
      if (fs.existsSync(secretsPath)) {
        try {
          const config = dotenv.config({ path: secretsPath }).parsed ?? {};
          Object.keys(config).forEach((key) => {
            details.secrets[key] = config[key];
          });
        } catch (error) {
          console.error(`Error reading .env for ${w3fName}: ${error.message}`);
        }
      }
    }

    this._cache.set(w3fPath, details);
    return details;
  }
}
