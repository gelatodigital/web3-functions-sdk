// Minimalistic deno global types declaration
declare global {
  const window: any;
  const Deno: {
    env: { get: (key: string) => string; toObject: () => any };
    exit: (code: number) => void;
    serve: (options: any) => any;
    run: (opt: { cmd: string[] }) => any;
    readTextFile: (file: string) => string;
    osRelease: () => any;
  };
  const fetch: any;
  class Response {
    constructor(s: string, options?: { status: number });
  }
  class Request {
    constructor(e: string, o: any);
    method: string;
    json: () => any;
    body: any;
  }
  class EventTarget {
    dispatchEvent(evt: ProgressEvent);
  }
  class Event {
    constructor(e: string);
    type: any;
    cancelable: any;
    defaultPrevented: any;
  }
  class ProgressEvent {
    constructor(e: string, o: { loaded: any; total: any });
    type: any;
  }
  class DOMException {
    constructor(e: string, f: string);
  }
  class Blob {
    constructor(e: Uint8Array[], o: any);
  }
  class Headers {
    append(s: string, v: string);
  }
  class TextDecoder {
    constructor(s?: string);
    decode(s: Uint8Array): string;
  }
}
export {};
