import { Web3Function } from "@gelatonetwork/web3-functions-sdk";
import axios from "axios";

Web3Function.onRun(async () => {
  const imageUrl = `https://fastly.picsum.photos/id/268/1200/1200.jpg?hmac=mh1FfYIsXh1ZKye-wikMGAwDuae5WB0JgUK3BESzZA0`;
  const imageBlob = (await axios.get(imageUrl, { responseType: "blob" })).data;

  const webhookUuid = (
    await axios.post<{ uuid: string }>(`https://webhook.site/token`)
  ).data.uuid;

  for (let i = 1; i <= 50; i++) {
    console.log(`Uploading image ${i}...`);
    const postUrl = `https://webhook.site/${webhookUuid}?i=${i}`;
    await axios.post(postUrl, imageBlob, {
      headers: { "Content-Type": "image/jpeg" },
    });
  }

  return { canExec: false, message: "Upload limit exceeded" };
});
