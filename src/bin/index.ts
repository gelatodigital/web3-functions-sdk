#! /usr/bin/env node
import colors from "colors/safe";
import benchmark from "../lib/binaries/benchmark";
import fetch from "../lib/binaries/fetch";
import upload from "../lib/binaries/upload";
import schema from "../lib/binaries/schema";
import test from "../lib/binaries/test";

const KO = colors.red("✗");
const command = process.argv[2];
switch (command) {
  case "test":
    test().catch((err) =>
      console.error(` ${KO} Error running Web3Function: ${err.message}`)
    );
    break;
  case "benchmark":
    benchmark().catch((err) =>
      console.error(` ${KO} Error running benchmark: ${err.message}`)
    );
    break;
  case "fetch":
    fetch().catch((err) =>
      console.error(` ${KO} Fetching Web3Function failed: ${err.message}`)
    );
    break;
  case "upload":
    upload().catch((err) =>
      console.error(` ${KO} Uploading Web3Function failed: ${err.message}`)
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
