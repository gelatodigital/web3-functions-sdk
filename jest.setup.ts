import { dirname } from "path";
import { fileURLToPath } from "url";

// Mimic __dirname behavior in ES modules for Jest
const currentFolder = dirname(fileURLToPath(import.meta.url));

// web3-functions-sdk/src/lib/builder/Web3FunctionBuilder.ts
const __dirname = `${currentFolder}/src/lib/builder/`;

global.__dirname = __dirname;
