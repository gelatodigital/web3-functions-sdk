import "dotenv/config";
import colors from "colors/safe";
import { Web3FunctionUploader } from "../uploader";

const OK = colors.green("✓");
export default async function fetch() {
  const cid = process.argv[3];

  if (!cid) throw new Error("Web3Function CID missing");

  const resolverDir = await Web3FunctionUploader.fetchResolver(cid);
  console.log(` ${OK} Fetched Web3Function to: ${resolverDir}`);

  const { schemaPath, web3FunctionPath } = await Web3FunctionUploader.extract(
    resolverDir
  );
  console.log(
    ` ${OK} Extracted Web3Function. \n schemaPath: ${schemaPath} \n web3FunctionPath: ${web3FunctionPath}`
  );
}
