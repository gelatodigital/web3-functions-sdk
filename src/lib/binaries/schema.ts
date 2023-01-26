import "dotenv/config";
import colors from "colors/safe";
import { Web3FunctionUploader } from "../uploader";

const OK = colors.green("✓");
export default async function schema() {
  const cid = process.argv[3];

  if (!cid) throw new Error("Web3Function CID missing");

  const schema = await Web3FunctionUploader.fetchSchema(cid);
  console.log(` ${OK} Fetched Web3Function schema: ${JSON.stringify(schema)}`);
}
