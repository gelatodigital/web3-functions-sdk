try {
  console.log(Deno.env.get("HTTP_PROXY"));
} catch {
  console.log("Passed");
}
