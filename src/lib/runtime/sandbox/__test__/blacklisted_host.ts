try {
  let resp = await fetch("http://gelato.network");
  console.log("Failed");
} catch {
  console.log("Passed");
}
