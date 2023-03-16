import { extendEnvironment } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";

import { W3fHardhatPlugin } from "./W3fHardhatPlugin";
// This import is needed to let the TypeScript compiler know that it should include your type
// extensions in your npm package's types file.
import "./type-extensions";

extendEnvironment((hre) => {
  // We add a field to the Hardhat Runtime Environment here.
  // We use lazyObject to avoid initializing things until they are actually
  // needed.
  hre.w3f = lazyObject(() => new W3fHardhatPlugin(hre));
});
