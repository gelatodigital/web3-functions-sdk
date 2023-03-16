import * as fs from "fs/promises";
import path from "node:path";
import { Web3FunctionUserArgs } from "../../lib";
import { USER_ARGS_FILE_NAME } from "../constants";

export const getUserArgsFromJsonFile = async (
  w3fPath: string
): Promise<Web3FunctionUserArgs> => {
  try {
    const userArgsPath = path.join(
      path.parse(w3fPath).dir,
      USER_ARGS_FILE_NAME
    );
    const userArgs = JSON.parse((await fs.readFile(userArgsPath)).toString());
    return userArgs;
  } catch (err) {
    throw new Error(
      `Error reading userArgs from ${USER_ARGS_FILE_NAME}: ${err.message}`
    );
  }
};
