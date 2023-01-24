import {
  JsResolverSdk,
  JsResolverContext,
} from "@gelatonetwork/js-resolver-sdk";

JsResolverSdk.onChecker(async (context: JsResolverContext) => {
  const proc = Deno.run({ cmd: ["whoami"] });
  console.log(proc);
  return { canExec: false, message: "Sandbox escaped cpu" };
});
