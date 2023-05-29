import { Web3Function } from "@gelatonetwork/web3-functions-sdk";
import axios from "axios";

Web3Function.onRun(async () => {
  await axios.get(
    `https://fastly.picsum.photos/id/268/1200/1200.jpg?hmac=mh1FfYIsXh1ZKye-wikMGAwDuae5WB0JgUK3BESzZA0`
  );
  return { canExec: false, message: "Download limit exceeded" };
});
