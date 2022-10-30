import fs from "node:fs";
import { performance } from "perf_hooks";
import esbuild from "esbuild";

export type JsResolverBuildResult =
  | {
      success: true;
      filePath: string;
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

      return { success: true, filePath, fileSize, buildTime };
    } catch (err) {
      if (debug) console.error(err);
      return {
        success: false,
        error: err,
      };
    }
  }
}
