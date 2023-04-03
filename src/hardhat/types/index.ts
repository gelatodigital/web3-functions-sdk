import { Web3FunctionUserArgs } from "../../lib";

export interface W3fHardhatConfig {
  rootDir: string;
  functions: W3fDetails;
  debug: boolean;
}

export interface W3fUserConfig {
  rootDir: string;
  debug: boolean;
}

export interface W3fDetails {
  [name: string]: {
    path: string;
    userArgs: Web3FunctionUserArgs;
    storage: { [key: string]: string };
    secrets: { [key: string]: string };
  };
}
