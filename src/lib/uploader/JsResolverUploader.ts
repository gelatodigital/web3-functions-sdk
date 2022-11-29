import "dotenv/config";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import tar from "tar";
import FormData from "form-data";
import axios from "axios";

const OPS_USER_API = process.env.OPS_USER_API;
export class JsResolverUploader {
  public static async uploadResolver(
    schemaPath = "src/resolvers/schema.json",
    jsResolverBuildPath = ".tmp/resolver.cjs"
  ): Promise<string> {
    try {
      const compressedPath = await this.compress(
        jsResolverBuildPath,
        schemaPath
      );

      const cid = await this._userApiUpload(compressedPath);

      return cid;
    } catch (err) {
      throw new Error(`JsResolverUploaderError: ${err.message}`);
    }
  }

  public static async fetchResolver(
    cid: string,
    destDir = "./.tmp"
  ): Promise<string> {
    try {
      const res = await axios.get(`${OPS_USER_API}/users/js-resolver/${cid}`, {
        responseEncoding: "binary",
        responseType: "arraybuffer",
      });

      // store jsResolver file in .tmp
      let jsResolverPath: string;

      const jsResolverFileName = `${cid}.tgz`;
      const tempJsResolverPath = `.tmp/${jsResolverFileName}`;

      if (!fs.existsSync(".tmp")) {
        fs.mkdirSync(".tmp", { recursive: true });
      }

      await fsp.writeFile(tempJsResolverPath, res.data);
      jsResolverPath = tempJsResolverPath;

      // store jsResolver to custom dir
      if (destDir !== "./.tmp") {
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        const customJsResolverPath = `${destDir}/${jsResolverFileName}`;
        await fsp.rename(jsResolverPath, customJsResolverPath);
        jsResolverPath = customJsResolverPath;
      }

      return jsResolverPath;
    } catch (err) {
      let errMsg = `${err.message} `;
      if (axios.isAxiosError(err)) {
        const data = JSON.parse(err.response?.data.toString("utf8")) as {
          message?: string;
        };
        if (data.message) errMsg += data.message;
      }

      throw new Error(
        `JsResolverUploaderError: Fetch JsResolver to ${destDir} failed. \n${errMsg}`
      );
    }
  }

  public static async compress(
    jsResolverBuildPath: string,
    schemaPath: string
  ): Promise<string> {
    try {
      await fsp.access(jsResolverBuildPath);
    } catch (err) {
      throw new Error(
        `JsResolver build file not found at path. ${jsResolverBuildPath} \n${err.message}`
      );
    }
    const { base } = path.parse(jsResolverBuildPath);

    // create directory with jsResolver.cjs & schema
    const time = Math.floor(Date.now() / 1000);
    const folderCompressedName = `jsResolver-${time}`;
    const folderCompressedPath = `.tmp/${folderCompressedName}`;
    const folderCompressedTar = `${folderCompressedPath}.tgz`;

    if (!fs.existsSync(folderCompressedPath)) {
      fs.mkdirSync(folderCompressedPath, { recursive: true });
    }

    // move files to directory
    await fsp.rename(jsResolverBuildPath, `${folderCompressedPath}/${base}`);
    try {
      await fsp.copyFile(schemaPath, `${folderCompressedPath}/schema.json`);
    } catch (err) {
      throw new Error(
        `Schema not found at path: ${schemaPath}. \n${err.message}`
      );
    }

    const stream = tar
      .c(
        {
          gzip: true,
          cwd: `${process.cwd()}/.tmp`,
        },
        [folderCompressedName]
      )
      .pipe(fs.createWriteStream(folderCompressedTar));

    await new Promise((fulfill) => {
      stream.once("finish", fulfill);
    });

    // delete directory after compression
    await fsp.rm(folderCompressedPath, { recursive: true });

    return folderCompressedTar;
  }

  public static async extract(input: string): Promise<void> {
    try {
      const { dir } = path.parse(input);

      tar.x({ file: `${input}`, sync: true, cwd: dir });
    } catch (err) {
      throw new Error(
        `JsResolverUploaderError: Extract JsResolver from ${input} failed. \n${err.message}`
      );
    }
  }

  private static async _userApiUpload(compressedPath: string): Promise<string> {
    try {
      const form = new FormData();
      const file = fs.createReadStream(compressedPath);

      form.append("title", "JsResolver");
      form.append("file", file);

      const res = await axios.post(`${OPS_USER_API}/users/js-resolver`, form, {
        ...form.getHeaders(),
      });

      const cid = res.data.cid;

      // rename file with cid
      const { dir, ext } = path.parse(compressedPath);
      await fsp.rename(compressedPath, `${dir}/${cid}${ext}`);

      return cid;
    } catch (err) {
      let errMsg = `${err.message} `;
      if (axios.isAxiosError(err)) {
        const data = err?.response?.data as { message?: string };
        if (data.message) errMsg += data.message;
      }

      throw new Error(`Upload to User api failed. \n${errMsg}`);
    }
  }
}
