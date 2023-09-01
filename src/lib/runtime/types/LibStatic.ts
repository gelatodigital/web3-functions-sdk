import path from "path";

export const STATIC_FOLDER = path.join(__dirname, "../../../../static");

export const SANDBOX_SCRIPT = path.join(STATIC_FOLDER, "./sandbox/index.ts");
export const POLYFILL_FOLDER = path.join(STATIC_FOLDER, "./polyfill/");
