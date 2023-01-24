import "dotenv/config";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import tar from "tar";
import FormData from "form-data";
import axios from "axios";
import { Web3FunctionSchema } from "../types";

const OPS_USER_API =
  process.env.OPS_USER_API ?? "https://api.gelato.digital/automate/users";
export class Web3FunctionUploader {
  public static async uploadResolver(
    schemaPath: string,
    filePath: string,
    sourcePath: string
  ): Promise<string> {
    try {
      const compressedPath = await this.compress(
        filePath,
        schemaPath,
        sourcePath
      );

      const cid = await this._userApiUpload(compressedPath);

      return cid;
    } catch (err) {
      throw new Error(`Web3FunctionUploaderError: ${err.message}`);
    }
  }

  public static async fetchResolver(
    cid: string,
    destDir = "./.tmp"
  ): Promise<string> {
    try {
      const res = await axios.get(
        `${OPS_USER_API}/users/web3-function/${cid}`,
        {
          responseEncoding: "binary",
          responseType: "arraybuffer",
        }
      );

      // store web3Function file in .tmp
      let web3FunctionPath: string;

      const web3FunctionFileName = `${cid}.tgz`;
      const tempWeb3FunctionPath = `.tmp/${web3FunctionFileName}`;

      if (!fs.existsSync(".tmp")) {
        fs.mkdirSync(".tmp", { recursive: true });
      }

      await fsp.writeFile(tempWeb3FunctionPath, res.data);
      web3FunctionPath = tempWeb3FunctionPath;

      // store web3Function to custom dir
      if (destDir !== "./.tmp") {
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        const customWeb3FunctionPath = `${destDir}/${web3FunctionFileName}`;
        await fsp.rename(web3FunctionPath, customWeb3FunctionPath);
        web3FunctionPath = customWeb3FunctionPath;
      }

      return web3FunctionPath;
    } catch (err) {
      let errMsg = `${err.message} `;
      if (axios.isAxiosError(err)) {
        const data = JSON.parse(err.response?.data.toString("utf8")) as {
          message?: string;
        };
        if (data.message) errMsg += data.message;
      }

      throw new Error(
        `Web3FunctionUploaderError: Fetch Web3Function to ${destDir} failed. \n${errMsg}`
      );
    }
  }

  public static async compress(
    web3FunctionBuildPath: string,
    schemaPath: string,
    sourcePath: string
  ): Promise<string> {
    try {
      await fsp.access(web3FunctionBuildPath);
    } catch (err) {
      throw new Error(
        `Web3Function build file not found at path. ${web3FunctionBuildPath} \n${err.message}`
      );
    }
    const { base } = path.parse(web3FunctionBuildPath);

    // create directory with index.js, source.js & schema.json
    const folderCompressedName = `web3Function`;
    const folderCompressedPath = `.tmp/${folderCompressedName}`;
    const folderCompressedTar = `${folderCompressedPath}.tgz`;

    if (!fs.existsSync(folderCompressedPath)) {
      fs.mkdirSync(folderCompressedPath, { recursive: true });
    }

    // move files to directory
    await fsp.rename(web3FunctionBuildPath, `${folderCompressedPath}/index.js`);
    await fsp.rename(sourcePath, `${folderCompressedPath}/source.js`);
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
    await fsp.rm(folderCompressedPath, { recursive: true });

    return folderCompressedTar;
  }

  public static async extract(input: string): Promise<{
    dir: string;
    schemaPath: string;
    sourcePath: string;
    web3FunctionPath: string;
  }> {
    try {
      const { dir, name } = path.parse(input);

      // rename directory to ipfs cid of resolver if possible.
      const cidDirectory = `${dir}/${name}`;
      if (!fs.existsSync(cidDirectory)) {
        fs.mkdirSync(cidDirectory, { recursive: true });
      }

      await tar.x({ file: input, cwd: cidDirectory });

      // remove tar file
      fs.rmSync(input, { recursive: true });

      // move resolver & schema to root ipfs cid directory
      fs.renameSync(
        `${cidDirectory}/web3Function/schema.json`,
        `${cidDirectory}/schema.json`
      );
      fs.renameSync(
        `${cidDirectory}/web3Function/index.js`,
        `${cidDirectory}/index.js`
      );
      fs.renameSync(
        `${cidDirectory}/web3Function/source.js`,
        `${cidDirectory}/source.js`
      );

      // remove web3Function directory
      fs.rmSync(`${cidDirectory}/web3Function`, { recursive: true });

      return {
        dir: `${cidDirectory}`,
        schemaPath: `${cidDirectory}/schema.json`,
        sourcePath: `${cidDirectory}/source.js`,
        web3FunctionPath: `${cidDirectory}/index.js`,
      };
    } catch (err) {
      throw new Error(
        `Web3FunctionUploaderError: Extract Web3Function from ${input} failed. \n${err.message}`
      );
    }
  }

  public static async fetchSchema(cid: string): Promise<Web3FunctionSchema> {
    try {
      const web3FunctionPath = await Web3FunctionUploader.fetchResolver(cid);

      const { dir, schemaPath } = await Web3FunctionUploader.extract(
        web3FunctionPath
      );

      const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

      fs.rmSync(dir, { recursive: true });

      return schema;
    } catch (err) {
      throw new Error(
        `Web3FunctionUploaderError: Get schema of ${cid} failed: \n${err.message}`
      );
    }
  }

  private static async _userApiUpload(compressedPath: string): Promise<string> {
    try {
      const form = new FormData();
      const file = fs.createReadStream(compressedPath);

      form.append("title", "Web3Function");
      form.append("file", file);

      const res = await axios.post(
        `${OPS_USER_API}/users/web3-function`,
        form,
        {
          ...form.getHeaders(),
        }
      );

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
