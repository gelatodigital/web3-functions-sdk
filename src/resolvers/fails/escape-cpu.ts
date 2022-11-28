import { JsResolverSdk } from "../../lib/JsResolverSdk.ts";

JsResolverSdk.onChecker(async (context) => {
  const proc = Deno.run({ cmd: ["whoami"] });
  console.log(proc);
  return { canExec: false, message: "Sandbox escaped cpu" };
});
