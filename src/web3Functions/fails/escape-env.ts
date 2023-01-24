import {
  JsResolverSdk,
  JsResolverContext,
} from "@gelatonetwork/js-resolver-sdk";

JsResolverSdk.onChecker(async (context: JsResolverContext) => {
  const env = Deno.env.toObject();
  console.log(env);
  return { canExec: false, message: "Sandbox escaped env" };
});
