import "hardhat/types/config";
import "hardhat/types/runtime";

import { W3fHardhatPlugin } from "./W3fHardhatPlugin";

interface W3fConfig {
  functions: { [name: string]: { path: string } };
  debug: boolean;
}

declare module "hardhat/types/config" {
  export interface HardhatUserConfig {
    w3f: Partial<W3fConfig>;
  }

  export interface HardhatConfig {
    w3f: W3fConfig;
  }
}

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    w3f: W3fHardhatPlugin;
  }
}
