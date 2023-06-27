import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

function generateByteString(n: number): string {
  const encoder = new TextEncoder();
  const byteBuffer = new Uint8Array(n);
  byteBuffer.fill(encoder.encode("x"));
  return new TextDecoder().decode(byteBuffer);
}

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { storage } = context;

  const randomMessage = generateByteString(1025);

  await storage.set("myLastMessage", randomMessage);

  return {
    canExec: false,
    message: "Updated message",
  };
});
