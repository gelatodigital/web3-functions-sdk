import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import colors from "colors/safe";

import { W3fDetails } from "../types";

const WARN = colors.yellow("⚠");

export function getW3fDetails(w3fRootDir: string) {
  const w3fNames: string[] = [];
  const w3fDetails: W3fDetails = {};

  fs.readdirSync(w3fRootDir).forEach((file) => {
    const fullPath = path.join(w3fRootDir, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      const jsPath = path.join(fullPath, "index.js");
      const tsPath = path.join(fullPath, "index.ts");
      const userArgsJsonPath = path.join(fullPath, "userArgs.json");
      const storageJsonPath = path.join(fullPath, "storage.json");
      const secretsPath = path.join(fullPath, ".env");

      // get w3f
      let indexPath: string;
      let userArgs;
      let storage;
      const secrets = {};

      if (fs.existsSync(tsPath)) {
        w3fNames.push(file);
        indexPath = tsPath;
      } else if (fs.existsSync(jsPath)) {
        w3fNames.push(file);
        indexPath = jsPath;
      } else return;

      // get userArgs
      if (fs.existsSync(userArgsJsonPath)) {
        try {
          const userArgsJsonString = fs.readFileSync(userArgsJsonPath, "utf8");
          userArgs = JSON.parse(userArgsJsonString);
        } catch (error) {
          console.error(
            `Error reading userArgs.json for ${file}: ${error.message}`
          );
        }
      } else console.warn(`${WARN} userArgs.json not found\n`);

      // get storage
      if (fs.existsSync(storageJsonPath)) {
        try {
          const storageJsonString = fs.readFileSync(storageJsonPath, "utf8");
          storage = JSON.parse(storageJsonString);
        } catch (error) {
          console.error(
            `Error reading storage.json for ${file}: ${error.message}`
          );
        }
      } else console.warn(`${WARN} storage.json not found\n`);

      // get secrets
      if (fs.existsSync(secretsPath)) {
        try {
          const config = dotenv.config({ path: secretsPath }).parsed ?? {};
          Object.keys(config).forEach((key) => {
            secrets[key] = config[key];
          });
        } catch (error) {
          console.error(`Error reading .env for ${file}: ${error.message}`);
        }
      } else console.warn(`${WARN} .env not found\n`);

      w3fDetails[file] = { path: indexPath, secrets, storage, userArgs };
    }
  });

  return { w3fNames, w3fDetails };
}
