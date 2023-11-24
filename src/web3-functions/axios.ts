import axios from "axios";

import { Web3Function } from "@gelatonetwork/web3-functions-sdk";

Web3Function.onRun(async () => {
  try {
    console.log("Sending zenquote API request");
    const res = await axios.get(`https://zenquotes.io/api/random`, {
      timeout: 1000,
    });
    const quote = res.data[0].q;
    return { canExec: false, message: `Zen quote: ${quote}` };
  } catch (err) {
    return { canExec: false, message: `Axios error: ${err.message}` };
  }
});
