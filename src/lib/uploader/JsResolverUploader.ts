import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import tar from "tar";
import { CID, create, globSource } from "ipfs-http-client";

export class JsResolverUploader {
  public static async upload(input: string): Promise<CID | null> {
    await fsp.access(input);
    await this.compress(input);

    const cid = await this.ipfsUpload();
    return cid;
  }

  public static async compress(input: string): Promise<void> {
    try {
      const { name, base } = path.parse(input);

      // move file to root directory
      await fsp.rename(input, base);
      const tarFileName = `${name}.tgz`;

      const stream = tar
        .c(
          {
            gzip: true,
          },
          [base]
        )
        .pipe(fs.createWriteStream(`.tmp/${tarFileName}`));

      // move file back to .tmp file
      stream.once("finish", async () => {
        await fsp.rename(base, `.tmp/${base}`);
      });
    } catch (err) {
      console.error(`Error compressing JSResolver: `, err);
    }
  }

  public static async extract(input: string): Promise<void> {
    try {
      tar.x({ file: `${input}`, sync: true });
    } catch (err) {
      console.error(`Error extracting JSResolver: `, err);
    }
  }

  private static async ipfsUpload(): Promise<CID | null> {
    try {
      const ipfs = create();

      for await (const file of ipfs.addAll(globSource(".tmp", "**/*.tgz"), {
        pin: true,
      })) {
        return file.cid;
      }
    } catch (err) {
      console.error(`Error uploading JSResolver to ipfs: `, err);
    }

    return null;
  }
}
