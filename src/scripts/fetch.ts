import "dotenv/config";
import colors from "colors/safe";
import { ethers } from "ethers";
import { JsResolverUploader } from "../lib/uploader/JsResolverUploader";

const OK = colors.green("✓");
const KO = colors.red("✗");

const upload = async () => {
  const pk = process.env.PK;
  const cid = process.argv[2];

  if (!pk) throw new Error("Env variable 'PK' missing");
  if (!cid) throw new Error("JsResolver CID missing");
  const wallet = new ethers.Wallet(pk);

  try {
    const resolverDir = await JsResolverUploader.fetchResolver(wallet, cid);
    console.log(` ${OK} Fetched JsResolver to: ${resolverDir}`);
  } catch (err) {
    ` ${KO} Error fetching JsResolver: ${err}`;
  }
};

upload().catch((err) => console.error(err));
