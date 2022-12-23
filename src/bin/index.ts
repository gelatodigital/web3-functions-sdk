#! /usr/bin/env node
import colors from "colors/safe";
import benchmark from "./benchmark";
import fetch from "./fetch";
import upload from "./upload";
import schema from "./schema";
import test from "./test";

const KO = colors.red("✗");
const command = process.argv[2];
switch (command) {
  case "test":
    test().catch((err) =>
      console.error(` ${KO} Error running JsResolver: ${err.message}`)
    );
    break;
  case "benchmark":
    benchmark().catch((err) =>
      console.error(` ${KO} Error running benchmark: ${err.message}`)
    );
    break;
  case "fetch":
    fetch().catch((err) =>
      console.error(` ${KO} Fetching JsResolver failed: ${err.message}`)
    );
    break;
  case "upload":
    upload().catch((err) =>
      console.error(` ${KO} Uploading JsResolver failed: ${err.message}`)
    );
    break;
  case "schema":
    schema().catch((err) =>
      console.error(` ${KO} Fetching schema failed: ${err.message}`)
    );
    break;
  default:
    console.error(` ${KO} Unknown command: ${command}`);
}
