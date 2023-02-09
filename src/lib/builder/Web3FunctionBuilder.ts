import fs from "node:fs";
import { performance } from "perf_hooks";
import esbuild from "esbuild";
import Ajv from "ajv";
import * as web3FunctionSchema from "./web3function.schema.json";
import path from "node:path";
import { Web3FunctionSchema } from "../types";
import { Web3FunctionUploader } from "../uploader";
const ajv = new Ajv({ messages: true, allErrors: true });
const web3FunctionSchemaValidator = ajv.compile(web3FunctionSchema);

export type Web3FunctionBuildResult =
  | {
      success: true;
      filePath: string;
      sourcePath: string;
      schemaPath: string;
      fileSize: number;
      buildTime: number;
      schema: Web3FunctionSchema;
    }
  | { success: false; error: Error };

export class Web3FunctionBuilder {
  /**
   * Helper function to build and publish Web3Function to IPFS
   *
   * @param input web3FunctionFilePath
   * @returns string CID: Web3Function IPFS hash
   */
  public static async deploy(input: string): Promise<string> {
    const buildRes = await Web3FunctionBuilder.build(input);
    if (!buildRes.success) throw buildRes.error;

    return await Web3FunctionUploader.upload(
      buildRes.schemaPath,
      buildRes.filePath,
      buildRes.sourcePath
    );
  }

  private static async _buildBundle(input: string, outfile: string) {
    // Build & bundle web3Function
    const options: esbuild.BuildOptions = {
      bundle: true,
      entryPoints: [input],
      absWorkingDir: process.cwd(),
      platform: "browser",
      target: "es2022",
      format: "esm",
      outfile,
    };

    await esbuild.build(options);
  }

  private static async _buildSource(input: string, outfile: string) {
    // Build & bundle js source file
    const options: esbuild.BuildOptions = {
      bundle: true,
      entryPoints: [input],
      absWorkingDir: process.cwd(),
      packages: "external", // exclude all npm packages
      target: "es2022",
      platform: "browser",
      format: "esm",
      outfile,
    };

    await esbuild.build(options);
  }

  public static async build(
    input: string,
    debug = false,
    filePath = "./.tmp/index.js",
    sourcePath = "./.tmp/source.js"
  ): Promise<Web3FunctionBuildResult> {
    try {
      const start = performance.now();
      await Promise.all([
        Web3FunctionBuilder._buildBundle(input, filePath),
        Web3FunctionBuilder._buildSource(input, sourcePath),
      ]);
      const buildTime = performance.now() - start; // in ms

      const stats = fs.statSync(filePath);
      const fileSize = stats.size / 1024 / 1024; // size in mb
      const schemaPath = path.join(path.parse(input).dir, "schema.json");
      const schema = await Web3FunctionBuilder._validateSchema(schemaPath);

      return {
        success: true,
        schemaPath,
        sourcePath,
        filePath,
        fileSize,
        buildTime,
        schema,
      };
    } catch (err) {
      if (debug) console.error(err);
      return {
        success: false,
        error: err,
      };
    }
  }

  public static async _validateSchema(
    input: string
  ): Promise<Web3FunctionSchema> {
    const hasSchema = fs.existsSync(input);
    if (!hasSchema) {
      throw new Error(
        `Web3FunctionSchemaError: Missing Web3Function schema at '${input}'
Please create 'schema.json', default: 
{
  "web3FunctionVersion": "1.0.0",
  "runtime": "js-1.0",
  "memory": 128,
  "timeout": 30,
  "userArgs": {}
}`
      );
    }

    let schemaContent;
    try {
      schemaContent = fs.readFileSync(input).toString();
    } catch (err) {
      throw new Error(
        `Web3FunctionSchemaError: Unable to read Web3Function schema at '${input}', ${err.message}`
      );
    }

    let schemaBody;
    try {
      schemaBody = JSON.parse(schemaContent);
    } catch (err) {
      throw new Error(
        `Web3FunctionSchemaError: Invalid json schema at '${input}', ${err.message}`
      );
    }

    const res = web3FunctionSchemaValidator(schemaBody);
    if (!res) {
      let errorParts = "";
      if (web3FunctionSchemaValidator.errors) {
        errorParts = web3FunctionSchemaValidator.errors
          .map((validationErr) => {
            let msg = `\n - `;
            if (validationErr.instancePath) {
              msg += `'${validationErr.instancePath
                .replace("/", ".")
                .substring(1)}' `;
            }
            msg += `${validationErr.message}`;
            if (validationErr.params.allowedValues) {
              msg += ` [${validationErr.params.allowedValues.join("|")}]`;
            }
            return msg;
          })
          .join();
      }
      throw new Error(
        `Web3FunctionSchemaError: invalid ${input} ${errorParts}`
      );
    }
    return schemaBody as Web3FunctionSchema;
  }
}
