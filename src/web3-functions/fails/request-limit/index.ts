import { Web3Function } from "@gelatonetwork/web3-functions-sdk";
import axios from "axios";

Web3Function.onRun(async () => {
  const totalRequests = Array.from({ length: 111 }, () =>
    axios.get(`https://zenquotes.io/api/random`)
  );
  await Promise.all(totalRequests);

  return { canExec: false, message: "Request limit exceeded" };
});
