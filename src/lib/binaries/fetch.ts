import "dotenv/config";
import colors from "colors/safe";
import { JsResolverUploader } from "../uploader";

const OK = colors.green("✓");
export default async function fetch() {
  const cid = process.argv[3];

  if (!cid) throw new Error("JsResolver CID missing");

  const resolverDir = await JsResolverUploader.fetchResolver(cid);
  console.log(` ${OK} Fetched JsResolver to: ${resolverDir}`);

  const { schemaPath, jsResolverPath } = await JsResolverUploader.extract(
    resolverDir
  );
  console.log(
    ` ${OK} Extracted JsResolver. \n schemaPath: ${schemaPath} \n jsResolverPath: ${jsResolverPath}`
  );
}
