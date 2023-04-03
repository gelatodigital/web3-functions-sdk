import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

import { W3fDetails } from "../types";

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
      if (fs.existsSync(tsPath)) {
        w3fNames.push(file);
        indexPath = tsPath;
      } else if (fs.existsSync(jsPath)) {
        w3fNames.push(file);
        indexPath = jsPath;
      } else return;

      // get userArgs
      try {
        const userArgsJsonString = fs.readFileSync(userArgsJsonPath, "utf8");
        const userArgs = JSON.parse(userArgsJsonString);

        w3fDetails[file] = {
          path: indexPath,
          userArgs,
          storage: {},
          secrets: {},
        };
      } catch (error) {
        console.error(
          `Error reading userArgs.json for ${file}: ${error.message}`
        );
        w3fDetails[file] = {
          path: indexPath,
          userArgs: {},
          storage: {},
          secrets: {},
        };
      }

      // get storage
      try {
        const storageJsonString = fs.readFileSync(storageJsonPath, "utf8");
        const storage = JSON.parse(storageJsonString);

        w3fDetails[file] = {
          ...w3fDetails[file],
          storage,
        };
      } catch (error) {
        console.error(
          `Error reading storage.json for ${file}: ${error.message}`
        );
        w3fDetails[file] = {
          ...w3fDetails[file],
          storage: {},
        };
      }

      // get secrets
      try {
        const secrets: { [key: string]: string } = {};
        const config = dotenv.config({ path: secretsPath }).parsed ?? {};
        Object.keys(config).forEach((key) => {
          secrets[key] = config[key];
        });

        w3fDetails[file] = {
          ...w3fDetails[file],
          secrets,
        };
      } catch (error) {
        console.error(
          `Error reading storage.json for ${file}: ${error.message}`
        );

        w3fDetails[file] = {
          ...w3fDetails[file],
          secrets: {},
        };
      }
    }
  });

  return { w3fNames, w3fDetails };
}
