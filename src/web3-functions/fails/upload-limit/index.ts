import { Web3Function } from "@gelatonetwork/web3-functions-sdk";
import axios from "axios";

Web3Function.onRun(async () => {
  const imageUrl = `https://fastly.picsum.photos/id/268/1200/1200.jpg?hmac=mh1FfYIsXh1ZKye-wikMGAwDuae5WB0JgUK3BESzZA0`;
  const imageBlob = (await axios.get(imageUrl, { responseType: "blob" })).data;

  for (let i = 1; i <= 50; i++) {
    console.log(`Uploading image ${i}...`);
    const postUrl = `https://webhook.site/af768985-f4df-44e9-96b8-1b246df5b4e0?i=${i}`;
    await axios.post(postUrl, imageBlob, {
      headers: { "Content-Type": "image/jpeg" },
    });
  }

  return { canExec: false, message: "Upload limit exceeded" };
});
