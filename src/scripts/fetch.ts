import "dotenv/config";
import colors from "colors/safe";
import { JsResolverUploader } from "@gelatonetwork/js-resolver-sdk/uploader";

const OK = colors.green("✓");
const KO = colors.red("✗");

const fetch = async () => {
  const cid = process.argv[2];

  if (!cid) throw new Error("JsResolver CID missing");

  const resolverDir = await JsResolverUploader.fetchResolver(cid);
  console.log(` ${OK} Fetched JsResolver to: ${resolverDir}`);

  const { schemaPath, jsResolverPath } = await JsResolverUploader.extract(
    resolverDir
  );
  console.log(
    ` ${OK} Extracted JsResolver. \n schemaPath: ${schemaPath} \n jsResolverPath: ${jsResolverPath}`
  );
};

fetch().catch((err) => console.error(` ${KO} ${err.message}`));
