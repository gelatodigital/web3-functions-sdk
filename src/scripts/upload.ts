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
    const cid = await JsResolverUploader.uploadResolver(wallet);
    if (cid) console.log(` ${OK} JsResolver uploaded to ipfs. CID: ${cid}`);
    else console.log(` ${KO} JsResolver upload failed.`);
  } else {
    console.log(` ${KO} Error: ${buildRes.error.message}`);
    return;
  }
};

upload().catch((err) => console.error(err));
