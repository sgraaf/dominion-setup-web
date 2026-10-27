// Runs dominion-setup in Pyodide, off the main thread.

import * as Comlink from "comlink";
import { loadPyodide } from "pyodide";
import bridgeSource from "../../../py/bridge.py?raw";
import type { Catalog, GenerateResult, Options, SetUpOptions } from "../types";

const baseUrl = new URL(import.meta.env.BASE_URL, self.location.origin);

/** Start Python, install the dominion-setup wheel and py/bridge.py, and import the bridge. */
async function loadBridge() {
  if (!__WHEEL_FILE__) {
    throw new Error("The dominion-setup wheel is missing: run `npm run sync-wheel`");
  }
  // fetched while Pyodide loads
  const wheel = fetch(new URL(`wheels/${__WHEEL_FILE__}`, baseUrl)).then((response) =>
    response.arrayBuffer(),
  );
  const pyodide = await loadPyodide({ indexURL: new URL("pyodide/", baseUrl).href });
  const sitePackages: string = pyodide.runPython("import site; site.getsitepackages()[0]");
  pyodide.unpackArchive(await wheel, "wheel", { extractDir: sitePackages });
  pyodide.FS.writeFile(`${sitePackages}/bridge.py`, bridgeSource);
  return pyodide.pyimport("bridge");
}

const bridge = loadBridge();

const api = {
  async catalog(): Promise<Catalog> {
    return JSON.parse((await bridge).catalog());
  },
  async generate(options: Options, seed: number): Promise<GenerateResult> {
    return JSON.parse((await bridge).generate(JSON.stringify({ ...options, seed })));
  },
  async setUp(code: string, options: SetUpOptions): Promise<GenerateResult> {
    return JSON.parse((await bridge).set_up(code, JSON.stringify(options)));
  },
};

export type Engine = typeof api;

Comlink.expose(api);
