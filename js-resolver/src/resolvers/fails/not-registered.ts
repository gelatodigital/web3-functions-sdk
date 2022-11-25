import { JsResolverContext } from "@gelatonetwork/js-resolver-sdk";

const main = async (context: JsResolverContext) => {
  return { canExec: false, message: "Sandbox escaped timeout" };
};
