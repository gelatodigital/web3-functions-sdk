import { JsResolverSdk } from "nothing";

JsResolverSdk.onChecker(async (context) => {
  return { canExec: false, message: "Malformed import" };
});
