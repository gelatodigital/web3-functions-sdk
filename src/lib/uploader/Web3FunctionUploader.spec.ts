import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import fsp from "node:fs/promises";
import path from "node:path";
import tar from "tar";
import { Web3FunctionUploader } from "./Web3FunctionUploader";

const OPS_API_BASE = "https://api.gelato.digital/automate/users";

describe("Web3FunctionUploader", () => {
  let mockUserApi: MockAdapter;
  const TEST_CID = "QmYDtW34NgZEppbR5GkGsXEkEkhT87nwX5RxiiSkzVRwb2";

  const TEST_FOLDER_BASE = path.join(
    process.cwd(),
    "src/lib/uploader/__test__/"
  );

  const buildTestPath = (folder: string): string => {
    return path.join(TEST_FOLDER_BASE, folder);
  };

  const buildTestTempPath = (folder: string): string => {
    return buildTestPath(`.temp_${folder}`);
  };

  const buildSchemaPath = (folder: string): string => {
    return path.join(buildTestPath(folder), "index.ts");
  };

  beforeAll(() => {
    mockUserApi = new MockAdapter(axios, {
      onNoMatch: "throwException",
    });
  });

  afterEach(() => {
    mockUserApi.reset();
  });

  // Extract
  const prepareExtractTest = async (folder: string): Promise<string> => {
    const testFolder = buildTestPath(folder);
    const originalArchive = path.join(testFolder, `${TEST_CID}.tgz`);

    const tempFolder = buildTestTempPath(folder);
    await fsp.mkdir(tempFolder);

    const testArchive = path.join(tempFolder, `${TEST_CID}.tgz`);
    await fsp.copyFile(originalArchive, testArchive);

    return testArchive;
  };
  const cleanupExtractTest = async (folder: string) => {
    await fsp.rm(buildTestTempPath(folder), { recursive: true, force: true });
  };

  test("extract should fail for invalid compressed file with missing schema", async () => {
    const testArchive = await prepareExtractTest("no-schema-tar");

    try {
      await Web3FunctionUploader.extract(testArchive);
      fail("No schema TAR extracted");
    } catch (error) {
      expect(error.message).toMatch("ENOENT");
    }

    cleanupExtractTest("no-schema-tar");
  });

  test("extracted files should be within cid directory", async () => {
    // Prepare test
    const testArchive = await prepareExtractTest("valid-tar");

    // Test
    await Web3FunctionUploader.extract(testArchive);
    await fsp.access(path.join(buildTestTempPath("valid-tar"), TEST_CID));

    // Cleanup test
    cleanupExtractTest("valid-tar");
  });

  // Compress
  const prepareCompressTest = async (folder: string): Promise<string> => {
    const testFolder = buildTestPath(folder);
    const originalArchive = path.join(testFolder, `${TEST_CID}.tgz`);

    const tempFolder = buildTestTempPath(folder);
    await fsp.mkdir(tempFolder);

    await tar.x({ file: originalArchive, cwd: tempFolder });

    return path.join(tempFolder, "web3Function");
  };

  test("compress should fail when build path could not be found", async () => {
    const nonExistingBuildPath = buildTestPath("non-existing");
    const nonExistingSchemaPath = buildSchemaPath("non-existing");

    try {
      await Web3FunctionUploader.compress(
        nonExistingBuildPath,
        nonExistingSchemaPath,
        path.join(nonExistingBuildPath, "index.js")
      );

      fail("Compressed with non-existing build path");
    } catch (error) {
      expect(error.message).toMatch("build file not found at path");
    }
  });

  test("compress should fail when schema file could not be found", async () => {
    // Prepare the test files
    const buildPath = await prepareCompressTest("no-schema-tar");

    try {
      await Web3FunctionUploader.compress(
        path.join(buildPath, "index.js"),
        path.join(buildPath, "schema.json"),
        path.join(buildPath, "source.js")
      );

      fail("Compressed with non-existing schema file");
    } catch (error) {
      expect(error.message).toMatch("Schema not found at path");
    }

    cleanupExtractTest("no-schema-tar");
  });

  // Fetch
  test("fetch should fail when User API could not found the CID", async () => {
    const cid = "some-invalid-cid";
    mockUserApi.onGet(`${OPS_API_BASE}/users/web3-function/${cid}`).reply(
      404,
      JSON.stringify({
        message: "Web3Function not found",
      })
    );

    try {
      await Web3FunctionUploader.fetch(cid);
      fail("Invalid CID is fetched");
    } catch (error) {
      expect(error.message).toMatch("404 Web3Function not found");
    }
  });

  test("fetched compressed W3F should be stored on the tmp folder", async () => {
    const data = await fsp.readFile(
      path.join(buildTestPath("valid-tar"), `${TEST_CID}.tgz`)
    );

    mockUserApi
      .onGet(`${OPS_API_BASE}/users/web3-function/${TEST_CID}`)
      .reply(200, data);

    const expectedPath = `.tmp/${TEST_CID}.tgz`;
    const testPath = await Web3FunctionUploader.fetch(TEST_CID);
    expect(testPath).toMatch(expectedPath);

    await fsp.access(path.join(process.cwd(), expectedPath));
    return;
  });

  test("fetched compressed W3F should be stored on the specified folder", async () => {
    const data = await fsp.readFile(
      path.join(buildTestPath("valid-tar"), `${TEST_CID}.tgz`)
    );

    mockUserApi
      .onGet(`${OPS_API_BASE}/users/web3-function/${TEST_CID}`)
      .reply(200, data);

    const expectedPath = `.tmp/my-test/${TEST_CID}.tgz`;
    const testPath = await Web3FunctionUploader.fetch(
      TEST_CID,
      path.join(process.cwd(), expectedPath)
    );
    expect(testPath).toMatch(expectedPath);

    await fsp.access(path.join(process.cwd(), expectedPath));
    return;
  });

  // Fetch schema
  test("fetching schema should fail for non-existing schema file", async () => {
    const data = await fsp.readFile(
      path.join(buildTestPath("no-schema-tar"), `${TEST_CID}.tgz`)
    );

    mockUserApi
      .onGet(`${OPS_API_BASE}/users/web3-function/${TEST_CID}`)
      .reply(200, data);

    try {
      await Web3FunctionUploader.fetchSchema(TEST_CID);
      fail("W3F with no-schema fetched");
    } catch (error) {
      expect(error.message).toMatch("ENOENT");
    }
  });

  test("fetching schema should fail for malformed schema file", async () => {
    const data = await fsp.readFile(
      path.join(buildTestPath("malformed-schema-tar"), `${TEST_CID}.tgz`)
    );

    mockUserApi
      .onGet(`${OPS_API_BASE}/users/web3-function/${TEST_CID}`)
      .reply(200, data);

    try {
      await Web3FunctionUploader.fetchSchema(TEST_CID);
      fail("W3F with no-schema fetched");
    } catch (error) {
      expect(error.message).toMatch("Unexpected token");
    }
  });

  test("fetched function data should be removed after fetching schema", async () => {
    const data = await fsp.readFile(
      path.join(buildTestPath("valid-tar"), `${TEST_CID}.tgz`)
    );

    mockUserApi
      .onGet(`${OPS_API_BASE}/users/web3-function/${TEST_CID}`)
      .reply(200, data);

    const expectedPath = `.tmp/${TEST_CID}.tgz`;

    const schema = await Web3FunctionUploader.fetchSchema(TEST_CID);

    try {
      await fsp.access(path.join(process.cwd(), expectedPath));
      fail("Fetched W3F not removed after schema");
    } catch (error) {
      expect(error.message).toMatch("ENOENT");
    }

    expect(schema.web3FunctionVersion).toBeDefined();
  });

  // Upload
  test("upload should return the CID of the W3F", async () => {
    const tempPath = await prepareCompressTest("valid-tar");

    mockUserApi.onPost(`${OPS_API_BASE}/users/web3-function`).reply(
      200,
      JSON.stringify({
        cid: "my-cid",
      })
    );

    const cid = await Web3FunctionUploader.upload(
      path.join(tempPath, "schema.json"),
      path.join(tempPath, "index.js"),
      path.join(tempPath, "source.js")
    );

    expect(cid).toBe("my-cid");

    cleanupExtractTest("valid-tar");
  });
});
