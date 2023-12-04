const array = new Uint8Array(5 * 1024 * 1024);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await delay(2000);
