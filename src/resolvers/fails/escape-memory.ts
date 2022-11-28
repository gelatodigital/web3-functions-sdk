import { JsResolverSdk } from "../../lib/JsResolverSdk.ts";
import { JsResolverContext } from "../../lib/types/JsResolverContext.ts";

JsResolverSdk.onChecker(async (context: JsResolverContext) => {
  const arr: string[] = [];
  while (arr.length < 1_000_000_000) {
    arr.push(`Do we have access to infinite memory?`);
  }
  return { canExec: false, message: "Sandbox escaped Memory" };
});
