import * as Comlink from "comlink";
import type { Engine } from "./worker";

/** The engine in its web worker, which starts loading Python as soon as it is imported. */
export const engine = Comlink.wrap<Engine>(
  new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }),
);
