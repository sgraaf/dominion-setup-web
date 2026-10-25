# AGENTS.md

This file provides guidance to Claude Code / Codex / Pi / OpenCode or similar when working with code in this repository.

## What this is

A static Svelte 5 + Tailwind v4 site that runs [dominion-setup](https://github.com/sgraaf/dominion-setup) (a Python library) in the browser via Pyodide. No server, and it works offline as a PWA. Deployed to GitHub Pages on every push to `main`. Requires uv and Node.js 24+.

## Commands

```sh
uv sync && npm install           # setup
npm run dev                      # sync-wheel, then Vite dev server
npm run build                    # sync-wheel, then production build into dist/
npm run check                    # svelte-check (TypeScript + Svelte)
npm run format                   # prettier --write

uv run pytest                    # bridge parity tests (tests/py)
npm test                         # vitest unit tests (tests/unit, happy-dom)
npm run build && npm run test:e2e   # Playwright, desktop + mobile projects
uv run prek run --all-files      # all linters/formatters (ruff, ty, prettier, svelte-check, codespell, …)
```

Single tests:

```sh
uv run pytest tests/py/test_bridge.py -k catalog
npx vitest run tests/unit/share.test.ts -t "round-trip"
npx playwright test -g "share link" --project=desktop
```

E2E tests run against `vite preview` of `dist/` on port 4173, so rebuild before running them after changes. They also shell out to `uv run dominion-setup generate` to compare the app's Kingdom against the CLI's.

## Architecture

**Python ↔ browser pipeline** (read these together):

1. `py/bridge.py` exposes `catalog()` and `generate(options_json)`, both JSON-in/JSON-out. It is not a package; it is imported in the worker as a raw string (`?raw`) and written into Pyodide's site-packages at runtime.
2. `scripts/sync_wheel.py` (run by `npm run dev`/`build`) puts the dominion-setup wheel matching `uv.lock` into `public/wheels/`. It downloads from PyPI or runs `uv build` if `[tool.uv.sources]` points at a local checkout. `vite.config.ts` reads that filename **at config load** and injects it as the `__WHEEL_FILE__` define, so the wheel must exist before Vite starts.
3. `vite.config.ts`'s `pyodideFiles` plugin serves the Pyodide runtime files from `node_modules/pyodide` at `/pyodide/` in dev and emits them into the build.
4. `src/lib/engine/worker.ts` loads Pyodide in a module web worker, unpacks the wheel, and writes and imports the bridge. `src/lib/engine/client.ts` wraps it with Comlink. Importing `client.ts` starts the Python load immediately.

**Parity invariant**: for a given seed and options, the app must deal exactly what `dominion-setup generate --seed` deals. `tests/py/test_bridge.py` and the first e2e test enforce this. Option keys are `generate_game`'s parameter names (plus `sets` and `seed`), and set keys are the CLI's `--set` choices (`SET_EDITION_CHOICES`, e.g. `base_2e`).

**Adding or changing a game option** touches all of: `Options`/`DEFAULT_PREFERENCES` in `src/lib/types.ts`, `generate()` in `py/bridge.py`, both directions in `src/lib/share.ts` (defaults are omitted from share URLs; invalid values fall back to defaults), the options UI, and the py/unit tests.

**Types mirror Python**: `src/lib/types.ts` hand-mirrors the JSON from dominion-setup's `Game.to_dict`/`Pile.to_dict`. Check those after upgrading dominion-setup (`uv lock --upgrade-package dominion-setup`).

**App state** (`src/App.svelte`): a single `view` state machine (collection → home → dealing → game). Routing is just the query string. A URL with `seed=` is a share link and gets dealt on load and on `popstate`. The collection and preferences persist to localStorage via `persisted()` in `src/lib/settings.svelte.ts`, which tolerates storage being unavailable. Values sent to the worker must be `$state.snapshot`ted, since Comlink cannot clone Svelte proxies.

**Games are kept as options, not as dealt games.** Swapping a card (`swap()` in `App.svelte`) adds it to `options.swaps` and deals again. That is `generate_game`'s `swaps`, the CLI's `--swap` and `swap=` in share links, so the CLI can still reproduce a swapped game. The recent and saved games (`src/lib/recent.ts`) store each game's options and version, like a share link. A newer dominion-setup may deal another game from them.

**Card images**: `public/cards/` is gitignored, filled by `uv run scripts/fetch_images.py` (needs `uv run playwright install chromium` once, because the wiki has an anti-bot challenge), which skips images already there. Besides the cards, it fetches the sets' icons (`icons/`), the coins, Potion and Debt of the costs (`costs/`, named after the wiki's files, e.g. `Coin7star`) and the mats and tokens (`materials/`), mapped to the wiki's files by `SET_ICONS` and `MATERIAL_IMAGES`; `tests/py/test_fetch_images.py` checks that these cover every `display_set` and `Material`, so extend them when dominion-setup adds a set or material. One e2e test needs the images. In CI, `ci.yml` keeps `public/cards/` in the Actions cache keyed on `uv.lock` and the script, and fetches only on a miss; `deploy.yml`'s build job restores that same key, so the two must match. The filename schemes live in two places that must stay in sync: `path()`, `icon_path()`, `cost_images()`/`cost_path()` and `material_path()` in `scripts/fetch_images.py`, and `imageUrl()`, `setIconUrl()`, `costImages()` and `materialUrl()` in `src/lib/cards.ts` (the py and unit tests check the same examples). `CardImage.svelte` falls back to type-coloured tiles if an image fails to load or when built with `VITE_CARD_IMAGES=false`, which also leaves out the icons and the pictures of mats and tokens. `Cost.svelte` falls back to shapes like the coin, Potion and Debt in the same cases.

**PWA**: the service worker is registered only after the catalog loads, so that precaching Pyodide doesn't compete with loading it. Workbox precaches the shell, Pyodide and the wheel; card images are runtime-cached (CacheFirst). `BASE_PATH` sets Vite's `base` for GitHub Pages; use `import.meta.env.BASE_URL` for asset URLs, not absolute `/` paths.

## Conventions

- Colours are CSS variables in `src/app.css`, redefined for dark mode and exposed to Tailwind via `@theme inline`. Use the token utilities (`bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-accent`, …) rather than raw colours.
- Prettier at 100 columns, 2-space indent for web files. Python is Ruff with `select = ["ALL"]`, Google docstrings, and `ty` type-checking (`py/`, `scripts/`, `tests/py/`).
- Comments, docstrings, UI copy and the README use short, plain sentences. Dominion terms are capitalised as in the game: Kingdom, Landscapes, Supply, Promos, Black Market.
