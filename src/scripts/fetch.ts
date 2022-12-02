import "dotenv/config";
import colors from "colors/safe";
import { JsResolverUploader } from "../lib/uploader/JsResolverUploader";

const OK = colors.green("✓");
const KO = colors.red("✗");

const upload = async () => {
  const cid = process.argv[2];

  if (!cid) throw new Error("JsResolver CID missing");

  const resolverDir = await JsResolverUploader.fetchResolver(cid);
  console.log(` ${OK} Fetched JsResolver to: ${resolverDir}`);
};

upload().catch((err) => console.error(` ${KO} ${err.message}`));
