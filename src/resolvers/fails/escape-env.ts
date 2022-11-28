import { JsResolverSdk } from "../../lib/JsResolverSdk.ts";

JsResolverSdk.onChecker(async (context) => {
  const env = Deno.env.toObject();
  console.log(env);
  return { canExec: false, message: "Sandbox escaped env" };
});
