import {
  JsResolverSdk,
  JsResolverContext,
} from "@gelatonetwork/js-resolver-sdk";

JsResolverSdk.onChecker(async (context: JsResolverContext) => {
  const conf = await Deno.readTextFile("./.env");
  console.log(conf);
  return { canExec: false, message: "Sandbox escaped file system" };
});
