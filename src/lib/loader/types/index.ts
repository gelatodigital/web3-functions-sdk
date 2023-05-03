import { Web3FunctionUserArgs } from "../../types";

export interface W3fDetails {
  path: string;
  userArgs: Web3FunctionUserArgs;
  storage: { [key: string]: string };
  secrets: { [key: string]: string };
}
