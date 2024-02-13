import colors from "colors/safe";
import "dotenv/config";
import path from "path";
import { Web3FunctionBuilder } from "../builder";

const OK = colors.green("✓");
const web3FunctionSrcPath =
  process.argv[3] ??
  path.join(process.cwd(), "src", "web3-functions", "index.ts");

export default async function deploy(w3fPath?: string) {
  const cid = await Web3FunctionBuilder.deploy(w3fPath ?? web3FunctionSrcPath);
  console.log(` ${OK} Web3Function deployed to ipfs.`);
  console.log(` ${OK} CID: ${cid}`);
  console.log(
    `\nTo create a task that runs your Web3 Function every minute, visit:`
  );
  console.log(`> https://app.gelato.network/new-task?cid=${cid}`);
}
