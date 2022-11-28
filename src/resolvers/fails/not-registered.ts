import { JsResolverContext } from "../../lib/types/JsResolverContext.ts";

const main = async (context: JsResolverContext) => {
  return { canExec: false, message: "Sandbox escaped timeout" };
};
