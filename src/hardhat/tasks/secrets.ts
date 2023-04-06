import { task } from "hardhat/config";
import { getW3fDetails } from "../utils";

task("w3f-secrets", "Manage secrets for Gelato Web3 Function")
  .addPositionalParam<string>(
    "action",
    `"set" | "list" | "delete" secrets for a task`
  )
  .setAction(async (taskArgs, hre) => {
    const w3f = getW3fDetails(taskArgs.name, hre.config.w3f.rootDir);

    // set secrets with automate sdk
  });
