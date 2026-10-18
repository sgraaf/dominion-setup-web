# dominion-setup-web

*dominion-setup-web* sets up a game of Dominion in your browser. It deals a Kingdom from the sets you own, and lists every pile, token and setup step, ready for the table.

**Use it at <https://sgraaf.github.io/dominion-setup-web/>.**

It runs [dominion-setup](https://github.com/sgraaf/dominion-setup), the Python library, in the browser with [Pyodide](https://pyodide.org/). So it is a static site, with no server, and once loaded it works offline and installs on a phone like an app.

## Features

- **Your collection**: pick the sets (and editions) and the Promos you own, once. It is kept in your browser.
- **A whole setup**: the Kingdom, Landscapes, Ally, Prophecy, extra piles, Black Market deck and basic Supply, with pile sizes for 2 to 6 players.
- **A checklist** of the mats and tokens to get out and the setup steps.
- **Options**: requirements (+Buys, Trashing, …), cards to always or never deal, Colony and Shelters, and how many Landscapes.
- **Share links**: a game's options and seed are in its URL, so whoever opens the link gets the same game, as with `dominion-setup generate --seed`.
- **Card images**, each with its set's icon, and pictures of the mats and tokens to get out. Tiles in the colours of the cards' types stand in for missing images.

## Development

You need [uv](https://docs.astral.sh/uv/) and [Node.js](https://nodejs.org/) 24 or later.

```sh
uv sync                        # Python: dominion-setup, and tools for the scripts and tests
npm install
npm run dev                    # puts the dominion-setup wheel in public/wheels/, and starts Vite
```

### How it works

- `py/bridge.py` is the Python side: `catalog()` lists the sets and cards, and `generate(options)` deals a game, as JSON. It does what `dominion-setup generate` does, so a seed gives the same game in the app as on the command line.
- `src/lib/engine/worker.ts` starts Pyodide in a web worker, unpacks the dominion-setup wheel into it, and imports the bridge. The page talks to it with [Comlink](https://github.com/GoogleChromeLabs/comlink).
- The rest of `src/` is a [Svelte](https://svelte.dev/) app, styled with [Tailwind CSS](https://tailwindcss.com/).

### Updating dominion-setup

The app runs the dominion-setup version in `uv.lock`. `npm run sync-wheel` (run by `npm run dev` and `npm run build`) downloads its wheel into `public/wheels/`, or builds it if `[tool.uv.sources]` points at a local checkout.

```sh
uv lock --upgrade-package dominion-setup
```

### Card images

The images come from the [Dominion Strategy Wiki](https://wiki.dominionstrategy.com/) and are not in the repository. `scripts/fetch_images.py` fetches them into `public/cards/`: the cards as WebP, 320 and 640 pixels wide, and the sets' icons and the mats and tokens in `icons/` and `materials/`. It skips the images that are already there. The end-to-end tests need them.

```sh
uv run playwright install chromium   # once
uv run scripts/fetch_images.py
```

CI does the same, and keeps `public/cards/` in the GitHub Actions cache, so it only fetches new images. Build with `VITE_CARD_IMAGES=false` to show tiles instead of images, and no icons.

### Tests

```sh
uv run pytest                  # the bridge gives the same games as the CLI
npm test                       # unit tests
npm run build && npm run test:e2e   # end-to-end tests, in Chromium
uv run prek run --all-files    # linters and formatters
```

## Deployment

Every push to `main` is tested and deployed to GitHub Pages by `.github/workflows/deploy.yml`.
