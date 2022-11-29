import {
  JsResolverSdk,
  JsResolverContext,
} from "@gelatonetwork/js-resolver-sdk";
import { setTimeout as delay } from "timers/promises";

JsResolverSdk.onChecker(async (context: JsResolverContext) => {
  await delay(1000);
  process.exit(0);
});
