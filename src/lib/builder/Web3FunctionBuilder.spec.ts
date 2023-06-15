import path from "node:path";
import { Web3FunctionBuilder } from "./Web3FunctionBuilder";

describe("Web3FunctionBuilder.build", () => {
  const TEST_FOLDER_BASE = path.join(
    process.cwd(),
    "src/lib/builder/__test__/"
  );

  const buildTestPath = (folder: string): string => {
    return path.join(TEST_FOLDER_BASE, folder);
  };

  const buildSchemaPath = (folder: string): string => {
    return path.join(buildTestPath(folder), "index.ts");
  };

  test("should fail when input path does not exist", async () => {
    const res = await Web3FunctionBuilder.build(
      buildSchemaPath("not-existing")
    );

    expect(res.success).toBeFalsy();
    if (res.success === false) {
      expect(
        res.error.message.includes("Missing Web3Function schema")
      ).toBeTruthy();
    }
  });

  test("should fail when input path does not have schema.json", async () => {
    const res = await Web3FunctionBuilder.build(buildSchemaPath("no-schema"));

    expect(res.success).toBeFalsy();
    if (res.success === false) {
      expect(
        res.error.message.includes("Missing Web3Function schema")
      ).toBeTruthy();
    }
  });

  test("should fail when schema is missing a required field", async () => {
    const res = await Web3FunctionBuilder.build(
      buildSchemaPath("missing-required-field")
    );

    expect(res.success).toBeFalsy();
    if (res.success === false) {
      expect(
        res.error.message.includes("must have required property")
      ).toBeTruthy();
    }
  });

  test("should fail when schema major version does not match with the SDK version", async () => {
    const res = await Web3FunctionBuilder.build(
      buildSchemaPath("invalid-schema-version")
    );

    expect(res.success).toBeFalsy();
    if (res.success === false) {
      expect(
        res.error.message.includes(
          "must match the major version of the installed sdk"
        )
      ).toBeTruthy();
    }
  });

  test("should fail when schema memory config is invalid", async () => {
    const res = await Web3FunctionBuilder.build(
      buildSchemaPath("invalid-schema-memory")
    );

    expect(res.success).toBeFalsy();
    if (res.success === false) {
      expect(
        res.error.message.includes(
          "'memory' must be equal to one of the allowed values"
        )
      ).toBeTruthy();
    }
  });

  test("should fail when schema runtime config is invalid", async () => {
    const res = await Web3FunctionBuilder.build(
      buildSchemaPath("invalid-schema-runtime")
    );

    expect(res.success).toBeFalsy();
    if (res.success === false) {
      expect(
        res.error.message.includes(
          "'runtime' must be equal to one of the allowed values"
        )
      ).toBeTruthy();
    }
  });

  test("should fail when schema timeout is invalid", async () => {
    const res = await Web3FunctionBuilder.build(
      buildSchemaPath("invalid-schema-timeout")
    );

    expect(res.success).toBeFalsy();
    if (res.success === false) {
      expect(res.error.message.includes("'timeout' must be")).toBeTruthy();
    }
  });

  test("should fail when schema userArgs include unknown types", async () => {
    const res = await Web3FunctionBuilder.build(
      buildSchemaPath("invalid-schema-userargs")
    );

    expect(res.success).toBeFalsy();
    if (res.success === false) {
      expect(
        res.error.message.includes("must be equal to one of the allowed values")
      ).toBeTruthy();
    }
  });

  test("should pass when schema is valid", async () => {
    const filePath = path.join(buildTestPath("valid-schema"), "index.js");
    const res = await Web3FunctionBuilder.build(
      buildSchemaPath("valid-schema"),
      {
        filePath,
        sourcePath: path.join(buildTestPath("valid-schema"), "source.js"),
      }
    );

    expect(res.success).toBeTruthy();
    if (res.success) {
      expect(res.filePath).toEqual(filePath);
    }
  });
});
