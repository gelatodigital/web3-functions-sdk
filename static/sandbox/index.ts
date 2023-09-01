const scriptPath = Deno.args[0] /* `script=/path/to/script.ts` */
  .split("=")[1];

import "../polyfill/XMLHttpRequest.ts";

// Run the user code
await import(scriptPath);
