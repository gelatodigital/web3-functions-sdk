import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import colors from "colors/safe";

import { W3fDetails } from "../types";

const WARN = colors.yellow("⚠");

export function getAllW3fDetails(w3fRootDir: string) {
  const allW3fDetails: { [w3f: string]: W3fDetails } = {};

  fs.readdirSync(w3fRootDir).forEach((w3fName) => {
    const details = getW3fDetails(w3fName, w3fRootDir);

    allW3fDetails[w3fName] = details;
  });

  return allW3fDetails;
}

export function getW3fDetails(w3fName: string, w3fRootDir: string) {
  const w3fPath = path.join(w3fRootDir, w3fName);
  const stats = fs.statSync(w3fPath);

  const details: W3fDetails = {
    path: "",
    userArgs: {},
    storage: {},
    secrets: {},
  };

  if (stats.isDirectory()) {
    const jsPath = path.join(w3fPath, "index.js");
    const tsPath = path.join(w3fPath, "index.ts");
    const userArgsJsonPath = path.join(w3fPath, "userArgs.json");
    const storageJsonPath = path.join(w3fPath, "storage.json");
    const secretsPath = path.join(w3fPath, ".env");

    // get w3f
    if (fs.existsSync(tsPath)) {
      details.path = tsPath;
    } else if (fs.existsSync(jsPath)) {
      details.path = jsPath;
    } else throw new Error(`Web3 Function "${w3fName}" not found!`);

    // get userArgs
    if (fs.existsSync(userArgsJsonPath)) {
      try {
        const userArgsJsonString = fs.readFileSync(userArgsJsonPath, "utf8");
        details.userArgs = JSON.parse(userArgsJsonString);
      } catch (error) {
        console.error(
          `Error reading userArgs.json for ${w3fName}: ${error.message}`
        );
      }
    } else console.warn(`${WARN} userArgs.json not found\n`);

    // get storage
    if (fs.existsSync(storageJsonPath)) {
      try {
        const storageJsonString = fs.readFileSync(storageJsonPath, "utf8");
        details.storage = JSON.parse(storageJsonString);
      } catch (error) {
        console.error(
          `Error reading storage.json for ${w3fName}: ${error.message}`
        );
      }
    } else console.warn(`${WARN} storage.json not found\n`);

    // get secrets
    if (fs.existsSync(secretsPath)) {
      try {
        const config = dotenv.config({ path: secretsPath }).parsed ?? {};
        Object.keys(config).forEach((key) => {
          details.secrets[key] = config[key];
        });
      } catch (error) {
        console.error(`Error reading .env for ${w3fName}: ${error.message}`);
      }
    } else console.warn(`${WARN} .env not found\n`);
  }

  return details;
}
