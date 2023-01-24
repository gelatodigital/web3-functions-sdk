import {
  JsResolverSdk,
  JsResolverContext,
} from "@gelatonetwork/js-resolver-sdk";
import { setTimeout as delay } from "timers/promises";

JsResolverSdk.onChecker(async (context: JsResolverContext) => {
  await delay(5_000);
  return { canExec: false, message: "Waiting..." };
});
