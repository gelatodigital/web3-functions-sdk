import "dotenv/config";
import colors from "colors/safe";
import { ethers } from "ethers";
import { JsResolverBuilder } from "../lib/builder/JsResolverBuilder";
import { JsResolverUploader } from "../lib/uploader/JsResolverUploader";

const OK = colors.green("✓");
const KO = colors.red("✗");
const jsResolverSrcPath = process.argv[2] ?? "./src/resolvers/index.ts";

const upload = async () => {
  if (!process.env.PK) throw new Error("Wallet not configured");
  const wallet = new ethers.Wallet(process.env.PK);

  const buildRes = await JsResolverBuilder.build(jsResolverSrcPath, false);

  if (buildRes.success) {
    try {
      const cid = await JsResolverUploader.uploadResolver(wallet);
      if (cid) console.log(` ${OK} JsResolver uploaded to ipfs. CID: ${cid}`);
      else console.log(` ${KO} JsResolver upload failed.`);
    } catch (err) {
      console.error(` ${KO} JsResolver upload failed: ${err}`);
    }
  } else {
    console.log(` ${KO} Error: ${buildRes.error.message}`);
    return;
  }
};

upload().catch((err) => console.error(err));
