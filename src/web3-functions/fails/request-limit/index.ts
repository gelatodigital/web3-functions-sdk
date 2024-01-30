import { Web3Function } from "@gelatonetwork/web3-functions-sdk";
import axios from "axios";

Web3Function.onRun(async () => {
  for (let i = 0; i < 50; i++) {
    const totalRequests = Array.from({ length: 10 }, async () => {
      try {
        const r = await axios.get(`http://localhost`);
      } catch {}
    });

    await Promise.all(totalRequests);
  }

  return { canExec: false, message: "Request limit exceeded" };
});
