import { Web3Function } from "@gelatonetwork/web3-functions-sdk";
import axios from "axios";

Web3Function.onRun(async () => {
  await axios.get("http://testblacklistedhost.com", {
    timeout: 1000,
  });

  return { canExec: false, message: "Accessed to blacklisted url" };
});
