import axios from "axios";
import "dotenv/config";
import FormData from "form-data";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import tar from "tar";
import { Web3FunctionSchema } from "../types";

const OPS_USER_API =
  process.env.OPS_USER_API ?? "https://api.gelato.digital/automate/users";

const DOWNLOAD_MAX_SIZE = 1 * 1024 * 1024; // 1 MB;
const EXTRACT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export class Web3FunctionUploader {
  public static async upload(
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

  public static async fetch(
    cid: string,
    destDir = path.join(process.cwd(), ".tmp")
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // abort download when it exceeds the limit
      const downloadAbort = new AbortController();
      const chunks: Buffer[] = [];

      axios
        .get(`${OPS_USER_API}/users/web3-function/${cid}`, {
          responseType: "stream",
          signal: downloadAbort.signal,
        })
        .then((res) => {
          const web3FunctionFileName = `${cid}.tgz`;
          const web3FunctionPath = path.join(destDir, web3FunctionFileName);

          let downloadedSize = 0;
          res.data.on("data", (chunk) => {
            downloadedSize += chunk.length;

            if (downloadedSize >= DOWNLOAD_MAX_SIZE) {
              downloadAbort.abort();
            } else {
              chunks.push(chunk);
            }
          });

          res.data.on("end", async () => {
            const buffer = Buffer.concat(chunks);

            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }

            await fsp.writeFile(web3FunctionPath, buffer);
            resolve(web3FunctionPath);
          });

          res.data.on("error", (err: Error) => {
            // handle download limit exceeding specifically
            if (axios.isCancel(err)) {
              reject(
                new Error(
                  `file size is exceeding download limit ${DOWNLOAD_MAX_SIZE.toFixed(
                    2
                  )}mb`
                )
              );
            } else {
              reject(err);
            }
          });
        })
        .catch((err) => {
          let errMsg = `${err.message} `;
          if (axios.isAxiosError(err)) {
            try {
              const data = JSON.parse(err.response?.data.toString("utf8")) as {
                message?: string;
              };
              if (data.message) errMsg += data.message;
            } catch (err) {
              errMsg += err.message;
            }
          }

          reject(
            new Error(
              `Web3FunctionUploaderError: Fetch Web3Function ${cid} to ${destDir} failed. \n${errMsg}`
            )
          );
        });
    });
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

    // create directory with index.js, source.js & schema.json
    const folderCompressedName = `web3Function`;
    const folderCompressedPath = path.join(
      process.cwd(),
      ".tmp",
      folderCompressedName
    );
    const folderCompressedTar = `${folderCompressedPath}.tgz`;

    if (!fs.existsSync(folderCompressedPath)) {
      fs.mkdirSync(folderCompressedPath, { recursive: true });
    }

    // move files to directory
    await fsp.rename(
      web3FunctionBuildPath,
      path.join(folderCompressedPath, "index.js")
    );
    await fsp.rename(sourcePath, path.join(folderCompressedPath, "source.js"));
    try {
      await fsp.copyFile(
        schemaPath,
        path.join(folderCompressedPath, "schema.json")
      );
    } catch (err) {
      throw new Error(
        `Schema not found at path: ${schemaPath}. \n${err.message}`
      );
    }

    const stream = tar
      .c(
        {
          gzip: true,
          cwd: path.join(process.cwd(), ".tmp"),
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
    const tarExpectedFileNames = ["schema.json", "index.js", "source.js"];

    try {
      const { dir, name } = path.parse(input);

      // rename directory to ipfs cid of web3Function if possible.
      const cidDirectory = path.join(dir, name);
      if (!fs.existsSync(cidDirectory)) {
        fs.mkdirSync(cidDirectory, { recursive: true });
      }

      let extractedSize = 0;

      await tar.x({
        file: input,
        cwd: cidDirectory,
        filter: (_, entry) => {
          extractedSize += entry.size;

          if (extractedSize >= EXTRACT_MAX_SIZE) {
            throw new Error(
              `extracted size exceeds max size ${EXTRACT_MAX_SIZE.toFixed(2)}mb`
            );
          }

          const fileName = entry.path.split("/").pop();
          if (
            entry.type !== "File" ||
            !tarExpectedFileNames.includes(fileName)
          ) {
            // Ignore unexpected files from archive
            return false;
          }

          return true;
        },
      });

      // remove tar file
      fs.rmSync(input, { recursive: true });

      // move web3Function & schema to root ipfs cid directory
      fs.renameSync(
        path.join(cidDirectory, "web3Function", "schema.json"),
        path.join(cidDirectory, "schema.json")
      );
      fs.renameSync(
        path.join(cidDirectory, "web3Function", "index.js"),
        path.join(cidDirectory, "index.js")
      );
      fs.renameSync(
        path.join(cidDirectory, "web3Function", "source.js"),
        path.join(cidDirectory, "source.js")
      );

      // remove web3Function directory
      fs.rmSync(path.join(cidDirectory, "web3Function"), {
        recursive: true,
      });

      return {
        dir: cidDirectory,
        schemaPath: path.join(cidDirectory, "schema.json"),
        sourcePath: path.join(cidDirectory, "source.js"),
        web3FunctionPath: path.join(cidDirectory, "index.js"),
      };
    } catch (err) {
      throw new Error(
        `Web3FunctionUploaderError: Extract Web3Function from ${input} failed. \n${err.message}`
      );
    }
  }

  public static async fetchSchema(cid: string): Promise<Web3FunctionSchema> {
    try {
      const web3FunctionPath = await Web3FunctionUploader.fetch(cid);

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
      await fsp.rename(compressedPath, path.join(dir, `${cid}${ext}`));

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
