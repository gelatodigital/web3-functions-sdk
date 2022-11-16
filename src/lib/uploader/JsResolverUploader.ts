import { Signer } from "@ethersproject/abstract-signer";
import "dotenv/config";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import tar from "tar";
import FormData from "form-data";
import axios from "axios";
import { SiweMessage } from "siwe";

const OPS_USER_API = process.env.OPS_USER_API;
export class JsResolverUploader {
  public static async uploadResolver(
    signer: Signer,
    schemaPath = "src/resolvers/schema.json",
    resolverBuildPath = ".tmp/resolver.cjs"
  ): Promise<string> {
    try {
      const compressedPath = await this.compress(resolverBuildPath, schemaPath);

      const authToken = await this._signMessage(signer);
      const address = await signer.getAddress();
      const cid = await this._userApiUpload(address, authToken, compressedPath);

      return cid;
    } catch (err) {
      throw new Error(`JsResolverUploaderError: ${err.message}`);
    }
  }

  public static async fetchResolver(
    signer: Signer,
    cid: string,
    destDir = "./.tmp"
  ): Promise<string> {
    try {
      const authToken = await this._signMessage(signer);
      const address = await signer.getAddress();
      const res = await axios.get(
        `${OPS_USER_API}/users/${address}/js-resolver/${cid}`,
        {
          responseEncoding: "binary",
          responseType: "arraybuffer",
          headers: { Authorization: authToken },
        }
      );

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
    resolverBuildPath: string,
    schemaPath: string
  ): Promise<string> {
    try {
      await fsp.access(resolverBuildPath);
    } catch (err) {
      throw new Error(
        `JsResolver build file not found at path. ${resolverBuildPath} \n${err.message}`
      );
    }
    const { base } = path.parse(resolverBuildPath);

    // create directory with jsResolver.cjs & schema
    const time = Math.floor(Date.now() / 1000);
    const folderCompressedName = `.tmp/jsResolver-${time}`;
    const folderCompressedTar = `${folderCompressedName}.tgz`;
    if (!fs.existsSync(folderCompressedName)) {
      fs.mkdirSync(folderCompressedName, { recursive: true });
    }

    // move files to directory
    await fsp.rename(resolverBuildPath, `${folderCompressedName}/${base}`);
    try {
      await fsp.copyFile(schemaPath, `${folderCompressedName}/schema.json`);
    } catch (err) {
      throw new Error(
        `Schema not found at path: ${schemaPath}. \n${err.message}`
      );
    }

    const stream = tar
      .c(
        {
          gzip: true,
        },
        [folderCompressedName]
      )
      .pipe(fs.createWriteStream(folderCompressedTar));

    await new Promise((fulfill) => {
      stream.once("finish", fulfill);
    });

    // delete directory after compression
    await fsp.rm(folderCompressedName, { recursive: true });

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

  private static async _userApiUpload(
    address: string,
    authToken: string,
    compressedPath: string
  ): Promise<string> {
    try {
      const form = new FormData();
      const file = fs.createReadStream(compressedPath);

      form.append("title", "JsResolver");
      form.append("file", file);

      const res = await axios.post(
        `${OPS_USER_API}/users/${address}/js-resolver`,
        form,
        {
          ...form.getHeaders(),
          headers: { Authorization: authToken },
        }
      );

      const cid = res.data.cid;
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

  private static async _signMessage(signer: Signer): Promise<string> {
    try {
      const domain = "app.gelato.network";
      const uri = "http://app.gelato.network/";
      const address = await signer.getAddress();
      const version = "1";
      const chainId = 1;
      const expirationTime = new Date(Date.now() + 600_000).toISOString();
      const statement = "Sign this message to upload/fetch JsResolver";

      const siweMessage = new SiweMessage({
        domain,
        statement,
        uri,
        address,
        version,
        chainId,
        expirationTime,
      });

      const message = siweMessage.prepareMessage();
      const signature = await signer.signMessage(message);

      const authToken = Buffer.from(
        JSON.stringify({ message, signature })
      ).toString("base64");

      return authToken;
    } catch (err) {
      throw new Error(`Signing message failed. \n${err.message}`);
    }
  }
}
