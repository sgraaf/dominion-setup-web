<script lang="ts">
  import { registerSW } from "virtual:pwa-register";
  import CollectionView from "./components/CollectionView.svelte";
  import GameView from "./components/GameView.svelte";
  import HomeView from "./components/HomeView.svelte";
  import Icon from "./components/Icon.svelte";
  import { engine } from "./lib/engine/client";
  import { addRecent, hasGame, removeGame, type RecentGame } from "./lib/recent";
  import { collection, preferences, recentGames, savedGames } from "./lib/settings.svelte";
  import { fromSearchParams, toSearchParams } from "./lib/share";
  import {
    DEFAULT_PREFERENCES,
    type Catalog,
    type Game,
    type Options,
    type SortOrder,
  } from "./lib/types";

  type View =
    | { name: "collection" }
    | { name: "home" }
    | { name: "dealing" }
    | {
        name: "game";
        options: Options;
        version: string;
        game: Game;
        linkVersion: string | null;
      };

  let catalog = $state.raw<Catalog | null>(null);
  let engineError = $state<string | null>(null);
  let error = $state<string | null>(null);
  let view = $state.raw<View>({ name: "home" });

  engine.catalog().then(
    (result) => {
      catalog = result;
      // only now, so that precaching Pyodide does not slow down loading it
      registerSW({ immediate: true });
    },
    (exc) => (engineError = String(exc)),
  );

  const newSeed = () => Math.floor(Math.random() * 1_000_000);

  /** The options for a new game from the user's collection and preferences. */
  function newOptions(): Options {
    // snapshots, as the worker cannot receive state proxies
    const prefs = $state.snapshot(preferences.value);
    const { sets, promos } = $state.snapshot(collection.value) ?? { sets: [], promos: [] };
    return {
      ...prefs,
      black_market_size: prefs.black_market_size || DEFAULT_PREFERENCES.black_market_size,
      sets,
      promos,
      swaps: [],
      seed: newSeed(),
    };
  }

  /** The game, to keep in the recent or saved games. */
  function entry(options: Options, version: string, game: Game): RecentGame {
    const kingdom = game.kingdom.map((card) => card.name);
    return { options, version, dealtAt: Date.now(), kingdom };
  }

  /** Put the game first in the recent games. */
  function remember(options: Options, version: string, game: Game) {
    recentGames.value = addRecent(recentGames.value, entry(options, version, game));
  }

  /** Save the game in view, or remove it from the saved games. */
  function toggleSaved() {
    if (view.name !== "game") return;
    const game = entry(view.options, view.version, view.game);
    savedGames.value = hasGame(savedGames.value, game)
      ? removeGame(savedGames.value, game)
      : [game, ...savedGames.value];
  }

  /** Deal a game, and put its options in the URL (as a new history entry if *push*). */
  async function deal(options: Options, linkVersion: string | null, push: boolean) {
    error = null;
    view = { name: "dealing" };
    // an unexpected error in Python, shown like any other, so that the app does not hang
    const result = await engine.generate(options).catch((exc) => ({ error: String(exc) }));
    if ("error" in result) {
      error = result.error;
      view = { name: "home" };
      history.replaceState(null, "", location.pathname);
      return;
    }
    const url = `?${toSearchParams(options, result.version)}`;
    if (push) history.pushState(null, "", url);
    else history.replaceState(null, "", url);
    view = { name: "game", options, ...result, linkVersion };
    remember(options, result.version, result.game);
    scrollTo({ top: 0 });
  }

  /** Sort the game in view by *sortOrder*: deal it again, as the sort order changes only the order. */
  async function sort(sortOrder: SortOrder) {
    if (view.name !== "game") return;
    preferences.value.sort_order = sortOrder;
    const dealt = view;
    const options = { ...dealt.options, sort_order: sortOrder };
    const result = await engine.generate(options);
    // the same game dealt before, unless the user has moved on since
    if ("error" in result || view !== dealt) return;
    history.replaceState(null, "", `?${toSearchParams(options, result.version)}`);
    view = { ...dealt, options, ...result };
    remember(options, result.version, result.game);
  }

  /** Swap *card* of the game in view for *replacement* (or a random card), as a new history entry. */
  async function swap(card: string, replacement: string | null): Promise<string | null> {
    if (view.name !== "game") return null;
    const dealt = view;
    const swaps: Options["swaps"] = [...dealt.options.swaps, [card, replacement]];
    const options = { ...dealt.options, swaps };
    const result = await engine.generate(options);
    if ("error" in result) return result.error;
    // unless the user has moved on since
    if (view !== dealt) return null;
    history.pushState(null, "", `?${toSearchParams(options, result.version)}`);
    view = { ...dealt, options, ...result };
    remember(options, result.version, result.game);
    return null;
  }

  /** Show the game in the URL, if any, or else the home (or collection) screen. */
  function route() {
    const shared = fromSearchParams(new URLSearchParams(location.search));
    if (shared) deal(shared.options, shared.version, false);
    else view = { name: collection.value ? "home" : "collection" };
  }

  function goHome() {
    history.pushState(null, "", location.pathname);
    view = { name: "home" };
  }

  route();
</script>

<svelte:window onpopstate={route} />

<div class="flex min-h-dvh flex-col">
  <header>
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-6">
      <button
        type="button"
        class="-ml-1 flex h-11 items-center gap-2 rounded-xl px-1"
        onclick={() => (collection.value ? goHome() : undefined)}
      >
        <svg
          class="h-5 w-5.5 text-crown"
          viewBox="8 10 48 44"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M14 42 L11 21 L22.5 30 L32 15 L41.5 30 L53 21 L50 42 Z" />
          <rect x="14" y="44.5" width="36" height="6" rx="2" />
        </svg>
        <h1 class="text-[17px] font-semibold">Dominion Setup</h1>
      </button>
      {#if view.name !== "collection" && collection.value}
        <button
          type="button"
          class="-mr-1.5 inline-flex h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-medium hover:bg-surface-2"
          onclick={() => (view = { name: "collection" })}
          aria-label="Collection"
        >
          <Icon name="collection" />
          <span class="hidden sm:inline">Collection</span>
        </button>
      {/if}
    </div>
  </header>

  <main class="mx-auto w-full max-w-7xl flex-1 px-4 pt-2 pb-8 md:px-6 md:pt-4">
    {#if engineError}
      <div class="rounded-2xl bg-surface p-6 ring-1 ring-danger/50" role="alert">
        <h2 class="text-xl font-extrabold">The cards could not be loaded</h2>
        <p class="mt-2 text-muted">Reload the page to try again.</p>
        <pre class="mt-4 overflow-x-auto text-xs text-danger">{engineError}</pre>
      </div>
    {:else if view.name === "collection"}
      {#if catalog}
        <CollectionView
          {catalog}
          initial={collection.value}
          onsave={(newCollection) => {
            collection.value = newCollection;
            goHome();
          }}
          oncancel={collection.value ? () => (view = { name: "home" }) : undefined}
        />
      {:else}
        {@render loading()}
      {/if}
    {:else if view.name === "home"}
      <HomeView
        {catalog}
        {error}
        ondeal={() => deal(newOptions(), null, true)}
        oneditcollection={() => (view = { name: "collection" })}
        recentGames={recentGames.value}
        savedGames={savedGames.value}
        onremove={(saved: RecentGame) => (savedGames.value = removeGame(savedGames.value, saved))}
        onopen={(recent: RecentGame) => deal($state.snapshot(recent.options), recent.version, true)}
      />
    {:else if view.name === "dealing"}
      {@render loading()}
    {:else}
      <GameView
        seed={view.options.seed}
        sortOrder={view.options.sort_order}
        onsort={sort}
        onswap={swap}
        version={view.version}
        game={view.game}
        linkVersion={view.linkVersion}
        {catalog}
        saved={hasGame(savedGames.value, entry(view.options, view.version, view.game))}
        ontogglesaved={toggleSaved}
        ondealagain={() =>
          view.name === "game" && deal({ ...view.options, swaps: [], seed: newSeed() }, null, true)}
        onback={goHome}
      />
    {/if}
  </main>

  <!-- clear of the bars at the bottom of a phone's screen -->
  <footer class="border-t border-line max-md:pb-28">
    <p class="mx-auto max-w-7xl px-4 py-6 text-xs leading-relaxed text-muted md:px-6">
      Dominion and its card images are © Rio Grande Games and Donald X. Vaccarino. Card data and
      images from the
      <a class="underline" href="https://wiki.dominionstrategy.com/">Dominion Strategy Wiki</a>.
      Setups by
      <a class="underline" href="https://github.com/sgraaf/dominion-setup">dominion-setup</a
      >{catalog ? ` ${catalog.version}` : ""}.
    </p>
  </footer>
</div>

{#snippet loading()}
  <div class="grid min-h-[50vh] place-items-center" role="status">
    <div class="flex flex-col items-center gap-4 text-muted">
      <span class="size-10 animate-spin rounded-full border-4 border-accent border-t-transparent"
      ></span>
      <span class="text-lg font-semibold">Shuffling the cards…</span>
    </div>
  </div>
{/snippet}
