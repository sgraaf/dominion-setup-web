/// <reference types="vitest/config" />
import { createReadStream, existsSync, readdirSync, readFileSync } from "node:fs";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const PYODIDE_DIR = new URL("./node_modules/pyodide/", import.meta.url);
// the files loadPyodide() fetches from its indexURL
const PYODIDE_FILES = new Map([
  ["pyodide.asm.mjs", "text/javascript"],
  ["pyodide.asm.wasm", "application/wasm"],
  ["python_stdlib.zip", "application/zip"],
  ["pyodide-lock.json", "application/json"],
]);

// the dominion-setup wheel put there by `npm run sync-wheel`
const WHEEL_FILE =
  (existsSync("public/wheels") &&
    readdirSync("public/wheels").find((file) => file.endsWith(".whl"))) ||
  "";

/** Serve the Pyodide files at /pyodide/ in development, and emit them there in the build. */
function pyodideFiles(): Plugin {
  return {
    name: "pyodide-files",
    configureServer(server) {
      server.middlewares.use("/pyodide/", (req, res, next) => {
        const file = req.url?.slice(1).split("?")[0] ?? "";
        const contentType = PYODIDE_FILES.get(file);
        if (!contentType) return next();
        res.setHeader("Content-Type", contentType);
        createReadStream(new URL(file, PYODIDE_DIR)).pipe(res);
      });
    },
    generateBundle() {
      for (const file of PYODIDE_FILES.keys()) {
        this.emitFile({
          type: "asset",
          fileName: `pyodide/${file}`,
          source: readFileSync(new URL(file, PYODIDE_DIR)),
        });
      }
    },
  };
}

export default defineConfig({
  // e.g. "/dominion-setup-web/" on GitHub Pages
  base: process.env.BASE_PATH ?? "/",
  define: {
    __WHEEL_FILE__: JSON.stringify(WHEEL_FILE),
  },
  optimizeDeps: { exclude: ["pyodide"] },
  worker: { format: "es" },
  // a DOM, so Svelte modules are compiled for the browser (where effects run)
  test: { include: ["tests/unit/**/*.test.ts"], environment: "happy-dom" },
  plugins: [
    svelte(),
    tailwindcss(),
    pyodideFiles(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Dominion Setup",
        short_name: "Dominion Setup",
        description: "Deal a Kingdom and set up a game of Dominion.",
        theme_color: "#17151f",
        background_color: "#17151f",
        display: "standalone",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // the app shell, Pyodide and the wheel; card images are cached as they are shown
        globPatterns: ["**/*.{html,js,mjs,css,woff2,svg,png,wasm,zip,json,whl}"],
        globIgnores: ["cards/**"],
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes("/cards/"),
            handler: "CacheFirst",
            options: { cacheName: "card-images", expiration: { maxEntries: 2000 } },
          },
        ],
      },
    }),
  ],
});
