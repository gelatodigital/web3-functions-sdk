import { Web3FunctionUserArgs } from "../../lib";

export interface W3fHardhatConfig {
  rootDir: string;
  debug: boolean;
}

export interface W3fUserConfig {
  rootDir: string;
  debug: boolean;
}

export interface W3fDetails {
  path: string;
  userArgs: Web3FunctionUserArgs;
  storage: { [key: string]: string };
  secrets: { [key: string]: string };
}
