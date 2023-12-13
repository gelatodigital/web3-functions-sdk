import { Web3FunctionHttpServer } from "../../../lib/net/Web3FunctionHttpServer";
import { Web3FunctionEvent } from "../../../lib/types/Web3FunctionEvent";

const port = Number(Deno.env.get("WEB3_FUNCTION_SERVER_PORT") ?? 80);
const mountPath = Deno.env.get("WEB3_FUNCTION_MOUNT_PATH");

const onFunctionEvent = async (
  event: Web3FunctionEvent
): Promise<Web3FunctionEvent> => {
  console.log("Custom event handler HERE!");
  if (event?.action === "start") {
    return {} as Web3FunctionEvent;
  } else {
    throw new Error(`Unrecognized parent process event: ${event.action}`);
  }
};

const server = new Web3FunctionHttpServer(
  port,
  mountPath,
  false,
  onFunctionEvent.bind(this)
);
