import { JsResolverSdk } from "../../lib/JsResolverSdk.ts";
const delay = (time: number) => new Promise((res) => setTimeout(res, time));

JsResolverSdk.onChecker(async (context: JsResolverContext) => {
  await delay(1000);
  Deno.exit(0);
});
