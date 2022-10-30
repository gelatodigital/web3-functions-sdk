export type JsResolverResult =
  | { canExec: true; callData: string }
  | { canExec: false; message: string };
