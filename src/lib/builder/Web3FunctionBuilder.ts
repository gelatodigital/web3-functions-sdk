import Ajv from "ajv";
import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { performance } from "perf_hooks";
import { Web3FunctionSchema } from "../types";
import { Web3FunctionUploader } from "../uploader";
import { SDK_VERSION } from "../version";
import web3FunctionSchema from "./web3function.schema.json";

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

  private static async _buildBundle(
    input: string,
    outfile: string,
    alias?: Record<string, string>
  ) {
    // Build & bundle web3Function
    const options: esbuild.BuildOptions = {
      bundle: true,
      entryPoints: [input],
      absWorkingDir: process.cwd(),
      platform: "browser",
      target: "es2022",
      format: "esm",
      minify: true,
      inject: [
        path.join(__dirname, "../polyfill/XMLHttpRequest.js"),
        path.join(__dirname, "../init/InitScript.js"),
      ],
      alias,
      outfile,
    };

    await esbuild.build(options);
  }

  private static async _buildSource(
    input: string,
    outfile: string,
    alias?: Record<string, string>
  ) {
    // Build & bundle js source file
    const options: esbuild.BuildOptions = {
      bundle: true,
      entryPoints: [input],
      absWorkingDir: process.cwd(),
      packages: "external", // exclude all npm packages
      target: "es2022",
      platform: "browser",
      format: "esm",
      alias,
      outfile,
    };

    await esbuild.build(options);
  }

  private static async _validateSchema(
    input: string
  ): Promise<Web3FunctionSchema> {
    const hasSchema = fs.existsSync(input);
    if (!hasSchema) {
      throw new Error(
        `Web3FunctionSchemaError: Missing Web3Function schema at '${input}'
Please create 'schema.json', default: 
{
  "web3FunctionVersion": "2.0.0",
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
            if (validationErr.instancePath === "/web3FunctionVersion") {
              msg += `'web3FunctionVersion' must match the major version of the installed sdk (${SDK_VERSION})`;
              if (validationErr.params.allowedValues) {
                msg += ` [${validationErr.params.allowedValues.join("|")}]`;
              }
              return msg;
            } else if (validationErr.instancePath) {
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

  public static async build(
    input: string,
    options?: {
      debug?: boolean;
      filePath?: string;
      sourcePath?: string;
      alias?: Record<string, string>;
    }
  ): Promise<Web3FunctionBuildResult> {
    const {
      debug = false,
      filePath = path.join(process.cwd(), ".tmp", "index.js"),
      sourcePath = path.join(process.cwd(), ".tmp", "source.js"),
      alias,
    } = options ?? {};

    try {
      const schemaPath = path.join(path.parse(input).dir, "schema.json");
      const schema = await Web3FunctionBuilder._validateSchema(schemaPath);

      const start = performance.now();
      await Promise.all([
        Web3FunctionBuilder._buildBundle(input, filePath, alias),
        Web3FunctionBuilder._buildSource(input, sourcePath, alias),
      ]);
      const buildTime = performance.now() - start; // in ms

      const stats = fs.statSync(filePath);
      const fileSize = stats.size / 1024 / 1024; // size in mb

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
}
