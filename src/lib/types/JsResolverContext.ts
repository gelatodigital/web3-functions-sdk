import { BigNumber } from "ethers";

export interface JsResolverContextData {
  gelatoArgs: {
    blockTime: number;
    chainId: number;
    gasPrice: string;
    taskId?: string;
  };
  userArgs: {
    [key: string]: string | number | boolean | string[] | number[] | boolean[];
  };
  secrets: { [key: string]: string | undefined };
  storage: { [key: string]: string | undefined };
}

export interface JsResolverContext {
  gelatoArgs: {
    blockTime: number;
    chainId: number;
    gasPrice: BigNumber;
    taskId?: string;
  };
  userArgs: {
    [key: string]: string | number | boolean | string[] | number[] | boolean[];
  };
  secrets: {
    get(key: string): Promise<string | undefined>;
  };
  storage: {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
}
