import "dotenv/config";
import colors from "colors/safe";
import { Web3FunctionBuilder } from "../builder";

const OK = colors.green("✓");
const web3FunctionSrcPath = process.argv[3] ?? "./src/web3Functions/index.ts";

export default async function deploy() {
  const cid = await Web3FunctionBuilder.deploy(web3FunctionSrcPath);
  console.log(` ${OK} Web3Function deployed to ipfs.`);
  console.log(` ${OK} CID: ${cid}`);
  console.log(
    `\nTo create a task that runs your Web3 Function every minute, visit:`
  );
  console.log(`> https://beta.app.gelato.network/new-task?cid=${cid}`);
}
