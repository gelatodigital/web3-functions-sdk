import {
  JsResolverSdk,
  JsResolverContext,
} from "@gelatonetwork/js-resolver-sdk";
import { setTimeout as delay } from "timers/promises";

JsResolverSdk.onChecker(async (context: JsResolverContext) => {
  await delay(3600_000);
  return { canExec: false, message: "Sandbox escaped timeout" };
});
