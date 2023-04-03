import { task } from "hardhat/config";

task("w3f-secrets", "Manage secrets for Gelato Web3 Function")
  .addPositionalParam<string>(
    "action",
    `"set" | "list" | "delete" secrets for a task`
  )
  .setAction(async (taskArgs, hre) => {
    const w3f = hre.config.w3f.functions[taskArgs.name];

    // set secrets with automate sdk
  });
