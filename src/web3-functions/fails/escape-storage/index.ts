import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

function generateByteString(n: number): string {
  console.log("Generating byte string...", n);
  const encoder = new TextEncoder();
  const byteBuffer = new Uint8Array(n);
  byteBuffer.fill(encoder.encode("x"));
  return new TextDecoder().decode(byteBuffer);
}

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { storage } = context;

  const randomMessage = generateByteString(5 * 1024 * 1024);

  console.log("Writing to storage...");

  await storage.set("myLastMessage", randomMessage);

  console.log("Returning...");

  return {
    canExec: false,
    message: "Updated message",
  };
});
