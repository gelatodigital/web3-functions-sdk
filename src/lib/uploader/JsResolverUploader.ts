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

      // move to root directory
      await fsp.rename(input, base);
      const tarFileName = `${name}.tgz`;

      tar
        .c(
          {
            gzip: true,
          },
          [base]
        )
        .pipe(fs.createWriteStream(tarFileName));

      await fsp.mkdir(".tmp", { recursive: true });

      // move files back to .tmp file
      await fsp.rename(tarFileName, `.tmp/${tarFileName}`);
      await fsp.rename(base, `.tmp/${base}`);
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
