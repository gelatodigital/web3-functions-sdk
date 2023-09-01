const scriptPath = Deno.args[0] /* `script=/a/b.ts` */
  .split("=")[1];

try {
  // Here's where we run user code
  await import(scriptPath);
} catch (e) {
  console.error(e);
}
