import "dotenv/config";
import pathParse from "path-parse";
import tar from "tar";
import tarStream from "tar-stream";
import gzip from "gunzip-maybe";
import { isNode } from "browser-or-node";
import * as nodeFs from "node:fs";
import { fs as memFs } from "memfs";
import mkdirp from "mkdirp";
import streamToBuffer from "stream-to-buffer";
import FormData from "form-data";
import axios from "axios";
import { JsResolverSchema } from "../types";

// Use memory file system if running outside nodeJs
const fs = isNode ? nodeFs : memFs;

const OPS_USER_API =
  process.env.OPS_USER_API ??
  "https://ops.fra.gelato.digital/1514007e8336fa99e6fe/api";
export class JsResolverUploader {
  public static async uploadResolver(
    schemaPath: string,
    jsResolverBuildPath: string
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

      fs.writeFileSync(tempJsResolverPath, res.data);
      jsResolverPath = tempJsResolverPath;

      // store jsResolver to custom dir
      if (destDir !== "./.tmp") {
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        const customJsResolverPath = `${destDir}/${jsResolverFileName}`;
        fs.renameSync(jsResolverPath, customJsResolverPath);
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
      fs.accessSync(jsResolverBuildPath);
    } catch (err) {
      throw new Error(
        `JsResolver build file not found at path. ${jsResolverBuildPath} \n${err.message}`
      );
    }
    const { base } = pathParse(jsResolverBuildPath);

    // create directory with jsResolver.cjs & schema
    const folderCompressedName = `jsResolver`;
    const folderCompressedPath = `.tmp/${folderCompressedName}`;
    const folderCompressedTar = `${folderCompressedPath}.tgz`;

    if (!fs.existsSync(folderCompressedPath)) {
      fs.mkdirSync(folderCompressedPath, { recursive: true });
    }

    // move files to directory
    fs.renameSync(jsResolverBuildPath, `${folderCompressedPath}/${base}`);
    try {
      fs.copyFileSync(schemaPath, `${folderCompressedPath}/schema.json`);
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
          noMtime: true,
          portable: true,
        },
        [folderCompressedName]
      )
      .pipe(fs.createWriteStream(folderCompressedTar));

    await new Promise((fulfill) => {
      stream.once("finish", fulfill);
    });

    // delete directory after compression
    fs.rmSync(folderCompressedPath, { recursive: true });

    return folderCompressedTar;
  }

  public static async extract(input: string): Promise<{
    dir: string;
    schemaPath: string;
    jsResolverPath: string;
  }> {
    try {
      const { dir, name } = pathParse(input);

      // rename directory to ipfs cid of resolver if possible.
      const cidDirectory = `${dir}/${name}`;
      if (!fs.existsSync(cidDirectory)) {
        fs.mkdirSync(cidDirectory, { recursive: true });
      }

      await new Promise<void>((resolve, reject) => {
        const extract = tarStream.extract();
        fs.createReadStream(input).pipe(gzip()).pipe(extract);
        extract.on("entry", (header, stream, next) => {
          if (header.type === "directory") {
            mkdirp.sync(`${cidDirectory}/${header.name}`, { fs });
          } else if (header.type === "file") {
            streamToBuffer(stream, (err, buffer) => {
              if (err) return reject(err);
              fs.writeFileSync(`${cidDirectory}/${header.name}`, buffer);
            });
          }
          stream.on("end", () => next());
          stream.resume();
        });
        extract.on("finish", () => resolve());
      });

      // remove tar file
      // memfs rmSync is currently unavailable: https://github.com/streamich/memfs/issues/884
      if (fs.rmSync) fs.rmSync(input, { recursive: true });

      // move resolver & schema to root ipfs cid directory
      fs.renameSync(
        `${cidDirectory}/jsResolver/schema.json`,
        `${cidDirectory}/schema.json`
      );
      fs.renameSync(
        `${cidDirectory}/jsResolver/resolver.cjs`,
        `${cidDirectory}/resolver.cjs`
      );

      // remove jsResolver directory
      if (fs.rmSync)
        fs.rmSync(`${cidDirectory}/jsResolver`, { recursive: true });

      return {
        dir: `${cidDirectory}`,
        schemaPath: `${cidDirectory}/schema.json`,
        jsResolverPath: `${cidDirectory}/resolver.cjs`,
      };
    } catch (err) {
      throw new Error(
        `JsResolverUploaderError: Extract JsResolver from ${input} failed. \n${err.message}`
      );
    }
  }

  public static async fetchSchema(cid: string): Promise<JsResolverSchema> {
    try {
      const jsResolverPath = await JsResolverUploader.fetchResolver(cid);

      const { dir, schemaPath } = await JsResolverUploader.extract(
        jsResolverPath
      );

      const schema = JSON.parse(
        fs.readFileSync(schemaPath, "utf-8").toString()
      );

      if (fs.rmSync) fs.rmSync(dir, { recursive: true });

      return schema;
    } catch (err) {
      throw new Error(
        `JsResolverUploaderError: Get schema of ${cid} failed: \n${err.message}`
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
      const { dir, ext } = pathParse(compressedPath);
      fs.renameSync(compressedPath, `${dir}/${cid}${ext}`);

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
