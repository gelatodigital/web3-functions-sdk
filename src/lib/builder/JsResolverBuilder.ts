import fs from "node:fs";
import { performance } from "perf_hooks";
import esbuild from "esbuild";
import Ajv from "ajv";
import * as jsResolverSchema from "./jsresolver.schema.json";
const ajv = new Ajv({ messages: true, allErrors: true });
const jsResolverSchemaValidator = ajv.compile(jsResolverSchema);

export type JsResolverBuildResult =
  | {
      success: true;
      filePath: string;
      schemaPath: string;
      fileSize: number;
      buildTime: number;
    }
  | { success: false; error: Error };

export class JsResolverBuilder {
  public static async build(
    input: string,
    debug,
    filePath = "./.tmp/resolver.cjs"
  ): Promise<JsResolverBuildResult> {
    try {
      // Build & bundle js resolver
      const options: esbuild.BuildOptions = {
        bundle: true,
        entryPoints: [input],
        absWorkingDir: process.cwd(),
        platform: "node",
        outfile: filePath,
      };

      const start = performance.now();
      await esbuild.build(options);
      const buildTime = performance.now() - start; // in ms

      const stats = fs.statSync(filePath);
      const fileSize = stats.size / 1024 / 1024; // size in mb

      // ToDo: dynamically detect path of schema.json
      const schemaPath = input.replace("index.ts", "schema.json");
      await JsResolverBuilder._validateSchema(schemaPath, debug);

      return { success: true, schemaPath, filePath, fileSize, buildTime };
    } catch (err) {
      if (debug) console.error(err);
      return {
        success: false,
        error: err,
      };
    }
  }

  public static async _validateSchema(input: string, debug: boolean) {
    const schemaContent = fs.readFileSync(input).toString();
    if (debug) console.log("schemaContent:", schemaContent);
    const schemaBody = JSON.parse(schemaContent);
    if (debug) console.log("schemaBody:", schemaBody);
    const res = jsResolverSchemaValidator(schemaBody);
    if (debug)
      console.log("Validation res:", res, jsResolverSchemaValidator.errors);
    // Todo get error message from validation
    if (jsResolverSchemaValidator.errors) {
      const errorParts = jsResolverSchemaValidator.errors.map(
        (validationErr) => {
          let msg = `\n - ${validationErr.instancePath} ${validationErr.message}`;
          if (validationErr.params.allowedValues) {
            msg += ` [${validationErr.params.allowedValues.join("|")}]`;
          }
          return msg;
        }
      );
      throw new Error(`Invalid JsResolver schema.json:${errorParts.join()}`);
    }
    if (!res) throw new Error("Invalid JsResolver schema.json");
  }
}
