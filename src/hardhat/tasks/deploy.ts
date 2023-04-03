import { task } from "hardhat/config";
import deploy from "../../lib/binaries/deploy";

task("w3f-deploy", "Deploys Gelato Web3 Function")
  .addPositionalParam<string>(
    "name",
    "Web3 Function name defined in hardhat config"
  )
  .setAction(async (taskArgs, hre) => {
    const w3f = hre.config.w3f.functions[taskArgs.name];

    await deploy(w3f.path);
  });
