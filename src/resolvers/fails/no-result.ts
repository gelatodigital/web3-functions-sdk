import { JsResolverSdk } from "../../lib";
import { setTimeout as delay } from "timers/promises";

JsResolverSdk.onChecker(async (context) => {
  await delay(1000);
  process.exit(0);
});
