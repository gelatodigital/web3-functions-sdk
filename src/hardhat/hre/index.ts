import path from "path";
import { extendConfig, extendEnvironment } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import { HardhatConfig, HardhatUserConfig } from "hardhat/types";

import { W3f_ROOT_DIR } from "../constants/index";
import { W3fHardhatPlugin } from "./W3fHardhatPlugin";

// This import is needed to let the TypeScript compiler know that it should include your type
// extensions in your npm package's types file.
import "./type-extensions";

extendConfig(
  (config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    // set up root dir
    const usrRootDir = userConfig.w3f.rootDir;

    let w3fRootDir: string;
    if (usrRootDir === undefined) {
      w3fRootDir = path.join(config.paths.root, W3f_ROOT_DIR);
    } else {
      if (path.isAbsolute(usrRootDir)) {
        w3fRootDir = usrRootDir;
      } else {
        w3fRootDir = path.normalize(path.join(config.paths.root, usrRootDir));
      }
    }
    config.w3f.rootDir = w3fRootDir;

    // set up w3f networks for multi chain provider
    const usrW3fNetworks = userConfig.w3f.networks;
    const defaultNetwork =
      userConfig.defaultNetwork ?? config.defaultNetwork ?? "hardhat";

    let networks: Set<string>;
    if (!usrW3fNetworks || usrW3fNetworks.length === 0) {
      networks = new Set(defaultNetwork);
    } else {
      networks = new Set([...usrW3fNetworks, defaultNetwork]);
    }

    config.w3f.networks = Array.from(networks);
  }
);

extendEnvironment((hre) => {
  // We add a field to the Hardhat Runtime Environment here.
  // We use lazyObject to avoid initializing things until they are actually
  // needed.
  hre.w3f = lazyObject(() => new W3fHardhatPlugin(hre));
});
