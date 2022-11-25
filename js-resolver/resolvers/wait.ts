import { JsResolverSdk, JsResolverContext } from "../lib";
import { setTimeout as delay } from "timers/promises";

JsResolverSdk.onChecker(async (context: JsResolverContext) => {
  await delay(5_000);
  return { canExec: false, message: "Waiting..." };
});
