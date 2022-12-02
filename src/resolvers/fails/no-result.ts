import {
  JsResolverSdk,
  JsResolverContext,
} from "@gelatonetwork/js-resolver-sdk";

const delay = (time: number) => new Promise((res) => setTimeout(res, time));

JsResolverSdk.onChecker(async (_context: JsResolverContext) => {
  await delay(1000);
  Deno.exit(0);
  return { canExec: false, message: "Exit before result" };
});
