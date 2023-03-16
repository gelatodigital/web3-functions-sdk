import { ethers } from "ethers";

export const W3F_PATH = "./web3-functions/index.ts";
export const W3F_ENV_PATH = ".env.w3f";
export const GAS_PRICE_ARG = ethers.utils.parseUnits("10", "gwei").toString();
export const USER_ARGS_FILE_NAME = "userArgs.json";
export const DEBUG = false;
