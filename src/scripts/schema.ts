import "dotenv/config";
import colors from "colors/safe";
import { JsResolverUploader } from "@gelatonetwork/js-resolver-sdk/uploader";

const OK = colors.green("✓");
const KO = colors.red("✗");

const schema = async () => {
  const cid = process.argv[2];

  if (!cid) throw new Error("JsResolver CID missing");

  const schema = await JsResolverUploader.fetchSchema(cid);
  console.log(` ${OK} Fetched JsResolver schema: ${JSON.stringify(schema)}`);
};

schema().catch((err) => console.error(` ${KO} ${err.message}`));
