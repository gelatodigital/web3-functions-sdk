import fs from "node:fs";
import { performance } from "perf_hooks";
import esbuild from "esbuild";
import Ajv from "ajv";
import * as jsResolverSchema from "./jsresolver.schema.json";
import path from "node:path";
const ajv = new Ajv({ messages: true, allErrors: true });
const jsResolverSchemaValidator = ajv.compile(jsResolverSchema);

export type JsResolverSchema = {
  memory: number;
  timeout: number;
  userArgs: {
    [key: string]: string;
  };
};

export type JsResolverBuildResult =
  | {
      success: true;
      filePath: string;
      schemaPath: string;
      fileSize: number;
      buildTime: number;
      schema: JsResolverSchema;
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
      const schemaPath = path.join(path.parse(input).dir, "schema.json");
      const schema = await JsResolverBuilder._validateSchema(schemaPath);

      return {
        success: true,
        schemaPath,
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
  "runtime": "node-18",
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
