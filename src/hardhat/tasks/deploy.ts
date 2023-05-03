import { task } from "hardhat/config";
import deploy from "../../lib/binaries/deploy";
import { getW3fDetails } from "../utils";

task("w3f-deploy", "Deploys Gelato Web3 Function")
  .addPositionalParam<string>(
    "name",
    "Web3 Function name defined in hardhat config"
  )
  .setAction(async (taskArgs, hre) => {
    const w3f = getW3fDetails(taskArgs.name, hre.config.w3f.rootDir);

    await deploy(w3f.path);
  });
