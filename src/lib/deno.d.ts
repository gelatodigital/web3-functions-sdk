// Minimalistic deno global types declaration
declare global {
  const Deno: {
    env: { get: (key: string) => string; toObject: () => any };
    exit: (code: number) => void;
    serve: (options: any) => any;
    run: (opt: { cmd: string[] }) => any;
    readTextFile: (file: string) => string;
    osRelease: () => any;
  };
  class Response {
    constructor(s: string, options?: { status: number });
  }
  class Request {
    method: string;
    json: () => any;
  }
}
export {};
