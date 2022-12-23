#! /usr/bin/env node
import "dotenv/config";
import colors from "colors/safe";
import { JsResolverBuilder } from "../lib/builder";
import { JsResolverUploader } from "../lib/uploader";

const OK = colors.green("✓");
const jsResolverSrcPath = process.argv[3] ?? "./src/resolvers/index.ts";

export default async function upload() {
  const buildRes = await JsResolverBuilder.build(jsResolverSrcPath, false);

  if (!buildRes.success) throw buildRes.error;

  const cid = await JsResolverUploader.uploadResolver();
  console.log(` ${OK} JsResolver uploaded to ipfs. CID: ${cid}`);
}
