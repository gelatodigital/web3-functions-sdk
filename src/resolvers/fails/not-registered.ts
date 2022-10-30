import { JsResolverSdk, JsResolverContext } from "../../lib";

const main = async (context: JsResolverContext) => {
  return { canExec: false, message: "Sandbox escaped timeout" };
};
