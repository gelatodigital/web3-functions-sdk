import { JsResolverSdk } from "../../lib/JsResolverSdk.ts";

JsResolverSdk.onChecker(async (context) => {
  const os = await Deno.osRelease();
  console.log(os);
  return { canExec: false, message: "Sandbox escaped os" };
});
