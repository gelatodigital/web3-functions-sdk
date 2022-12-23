#! /usr/bin/env node
import "dotenv/config";
import colors from "colors/safe";
import { JsResolverUploader } from "../lib/uploader";

const OK = colors.green("✓");
export default async function schema() {
  const cid = process.argv[3];

  if (!cid) throw new Error("JsResolver CID missing");

  const schema = await JsResolverUploader.fetchSchema(cid);
  console.log(` ${OK} Fetched JsResolver schema: ${JSON.stringify(schema)}`);
}
