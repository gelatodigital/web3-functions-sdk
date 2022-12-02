import {
  JsResolverSdk,
  JsResolverContext,
} from "@gelatonetwork/js-resolver-sdk";

JsResolverSdk.onChecker(async (context: JsResolverContext) => {
  const os = await Deno.osRelease();
  console.log(os);
  return { canExec: false, message: "Sandbox escaped os" };
});
