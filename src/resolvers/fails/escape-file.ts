import { JsResolverSdk } from "../../lib/JsResolverSdk.ts";

JsResolverSdk.onChecker(async (context) => {
  const conf = await Deno.readTextFile("./.env");
  console.log(conf);
  return { canExec: false, message: "Sandbox escaped file system" };
});
