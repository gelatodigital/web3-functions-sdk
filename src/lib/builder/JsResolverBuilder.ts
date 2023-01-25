import fs from "node:fs";
import { performance } from "perf_hooks";
import esbuild from "esbuild";
import Ajv from "ajv";
import * as jsResolverSchema from "./jsresolver.schema.json";
import path from "node:path";
import { JsResolverSchema } from "../types";
import { JsResolverUploader } from "../uploader";
const ajv = new Ajv({ messages: true, allErrors: true });
const jsResolverSchemaValidator = ajv.compile(jsResolverSchema);

export type JsResolverBuildResult =
  | {
      success: true;
      filePath: string;
      sourcePath: string;
      schemaPath: string;
      fileSize: number;
      buildTime: number;
      schema: JsResolverSchema;
    }
  | { success: false; error: Error };

export class JsResolverBuilder {
  /**
   * Helper function to build and publish JsResolver to IPFS
   *
   * @param input jsResolverFilePath
   * @returns string CID: JsResolver IPF hash
   */
  public static async deploy(input: string): Promise<string> {
    const buildRes = await JsResolverBuilder.build(input);
    if (!buildRes.success) throw buildRes.error;

    return await JsResolverUploader.uploadResolver(
      buildRes.schemaPath,
      buildRes.filePath,
      buildRes.sourcePath
    );
  }

  private static async _buildBundle(input: string, outfile: string) {
    // Build & bundle js resolver
    const options: esbuild.BuildOptions = {
      bundle: true,
      entryPoints: [input],
      absWorkingDir: process.cwd(),
      platform: "browser",
      target: "es2022",
      minify: true,
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
  ): Promise<JsResolverBuildResult> {
    try {
      const start = performance.now();
      await Promise.all([
        JsResolverBuilder._buildBundle(input, filePath),
        JsResolverBuilder._buildSource(input, sourcePath),
      ]);
      const buildTime = performance.now() - start; // in ms

      const stats = fs.statSync(filePath);
      const fileSize = stats.size / 1024 / 1024; // size in mb
      const schemaPath = path.join(path.parse(input).dir, "schema.json");
      const schema = await JsResolverBuilder._validateSchema(schemaPath);

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
  ): Promise<JsResolverSchema> {
    const hasSchema = fs.existsSync(input);
    if (!hasSchema) {
      throw new Error(
        `JsResolverSchemaError: Missing JsResolver schema at '${input}'
Please create 'schema.json', default: 
{
  "jsResolverVersion": "1.0.0",
  "runtime": "js-1.0",
  "memory": 128,
  "timeout": 60,
  "userArgs": {}
}`
      );
    }

    let schemaContent;
    try {
      schemaContent = fs.readFileSync(input).toString();
    } catch (err) {
      throw new Error(
        `JsResolverSchemaError: Unable to read JsResolver schema at '${input}', ${err.message}`
      );
    }

    let schemaBody;
    try {
      schemaBody = JSON.parse(schemaContent);
    } catch (err) {
      throw new Error(
        `JsResolverSchemaError: Invalid json schema at '${input}', ${err.message}`
      );
    }

    const res = jsResolverSchemaValidator(schemaBody);
    if (!res) {
      let errorParts = "";
      if (jsResolverSchemaValidator.errors) {
        errorParts = jsResolverSchemaValidator.errors
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
      throw new Error(`JsResolverSchemaError: invalid ${input} ${errorParts}`);
    }
    return schemaBody as JsResolverSchema;
  }
}
