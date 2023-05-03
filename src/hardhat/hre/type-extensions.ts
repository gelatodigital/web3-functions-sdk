import "hardhat/types/config";
import "hardhat/types/runtime";
import { W3fUserConfig, W3fHardhatConfig } from "../types";

import { W3fHardhatPlugin } from "./W3fHardhatPlugin";

declare module "hardhat/types/config" {
  export interface HardhatUserConfig {
    w3f: Partial<W3fUserConfig>;
  }

  export interface HardhatConfig {
    w3f: W3fHardhatConfig;
  }
}

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    w3f: W3fHardhatPlugin;
  }
}
