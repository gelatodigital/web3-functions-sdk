import "dotenv/config";
import colors from "colors/safe";
import { JsResolverBuilder } from "../builder";

const OK = colors.green("✓");
const jsResolverSrcPath = process.argv[3] ?? "./src/resolvers/index.ts";

export default async function upload() {
  const cid = await JsResolverBuilder.deploy(jsResolverSrcPath);
  console.log(` ${OK} JsResolver uploaded to ipfs. CID: ${cid}`);
}
