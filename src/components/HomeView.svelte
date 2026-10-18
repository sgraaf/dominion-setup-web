<!-- Choose the options, and deal a Kingdom, or open a saved or recent game. -->
<script lang="ts">
  import type { RecentGame } from "../lib/recent";
  import { collection, preferences } from "../lib/settings.svelte";
  import { DEFAULT_PREFERENCES, REQUIREMENTS, type Catalog, type Requirement } from "../lib/types";
  import CardPicker from "./CardPicker.svelte";
  import Icon from "./Icon.svelte";
  import OptionRow from "./OptionRow.svelte";
  import Segmented from "./Segmented.svelte";

  let {
    catalog,
    error,
    ondeal,
    oneditcollection,
    recentGames,
    savedGames,
    onopen,
    onremove,
  }: {
    /** The catalog, or `null` while the engine loads. */
    catalog: Catalog | null;
    error: string | null;
    ondeal: () => void;
    oneditcollection: () => void;
    recentGames: RecentGame[];
    savedGames: RecentGame[];
    onopen: (game: RecentGame) => void;
    /** Remove a saved game. */
    onremove: (game: RecentGame) => void;
  } = $props();

  const prefs = $derived(preferences.value);
  const setNames = $derived.by(() => {
    if (!catalog || !collection.value) return [];
    const keys = new Set(collection.value.sets);
    return [...new Set(catalog.sets.filter((set) => keys.has(set.key)).map((set) => set.name))];
  });
  const promoCount = $derived(collection.value?.promos.length ?? 0);

  const TRISTATE = [
    { value: null, label: "Random" },
    { value: true, label: "Always" },
    { value: false, label: "Never" },
  ];

  const tristate = (value: boolean | null) =>
    TRISTATE.find((choice) => choice.value === value)?.label ?? "";
  const cardCount = (n: number) => (n === 0 ? "No cards" : n === 1 ? "1 card" : `${n} cards`);

  const dealtAt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

  function toggleRequirement(requirement: Requirement) {
    prefs.requirements = prefs.requirements.includes(requirement)
      ? prefs.requirements.filter((other) => other !== requirement)
      : [...prefs.requirements, requirement];
  }
</script>

{#snippet gameList(
  id: string,
  title: string,
  games: RecentGame[],
  remove?: (game: RecentGame) => void,
)}
  {#if games.length}
    <h3 class="mt-10 text-xl font-extrabold" {id}>{title}</h3>
    <ul
      aria-labelledby={id}
      class="mt-3 divide-y divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-edge"
    >
      {#each games as game (game.dealtAt)}
        <li class="flex items-center">
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-surface-2"
            onclick={() => onopen(game)}
          >
            <span class="min-w-0 flex-1">
              <span class="block text-sm text-muted">{dealtAt.format(game.dealtAt)}</span>
              <span class="block truncate text-[15px] font-medium">{game.kingdom.join(", ")}</span>
            </span>
            {#if !remove}<Icon name="next" class="size-4 shrink-0 text-muted" />{/if}
          </button>
          {#if remove}
            <button
              type="button"
              class="grid size-11 shrink-0 place-items-center self-stretch text-muted hover:bg-surface-2 hover:text-ink"
              onclick={() => remove(game)}
              aria-label="Remove"
            >
              <Icon name="close" class="size-4" />
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
{/snippet}

<section class="mx-auto max-w-xl">
  <h2 class="text-[30px] leading-tight font-extrabold">New game</h2>

  <ul aria-label="Your sets" class="mt-5 flex flex-wrap items-center gap-2">
    {#each setNames as name (name)}
      <li
        class="inline-flex h-8.5 items-center rounded-full bg-surface-2 px-3.5 text-[15px] font-medium"
      >
        {name}
      </li>
    {/each}
    {#if promoCount}
      <li
        class="inline-flex h-8.5 items-center rounded-full bg-surface-2 px-3.5 text-[15px] font-medium"
      >
        {promoCount} Promos
      </li>
    {/if}
    <li>
      <button
        type="button"
        class="inline-flex h-8.5 items-center gap-1 rounded-full border-[1.5px] border-muted/45 pr-2.5 pl-3.5 text-[15px] font-semibold hover:bg-surface-2"
        onclick={oneditcollection}
      >
        Change sets
        <Icon name="next" class="size-4" />
      </button>
    </li>
  </ul>

  <div class="mt-6">
    <Segmented
      label="Players"
      choices={[
        { value: null, label: "Any" },
        ...[2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) })),
      ]}
      bind:value={prefs.players}
    />
  </div>

  <div class="mt-6 overflow-hidden rounded-2xl bg-surface ring-1 ring-edge">
    <OptionRow
      label="Landscapes"
      value={prefs.max_landscapes ? `Up to ${prefs.max_landscapes}` : "None"}
    >
      <Segmented
        label="Landscapes (Events, Projects, …), at most"
        hideLabel
        choices={[0, 1, 2, 3, 4].map((n) => ({ value: n, label: String(n) }))}
        bind:value={prefs.max_landscapes}
      />
    </OptionRow>
    <OptionRow label="Colony and Platinum" value={tristate(prefs.use_colony)}>
      <Segmented
        label="Colony and Platinum"
        hideLabel
        choices={TRISTATE}
        bind:value={prefs.use_colony}
      />
    </OptionRow>
    <OptionRow label="Shelters" value={tristate(prefs.use_shelters)}>
      <Segmented label="Shelters" hideLabel choices={TRISTATE} bind:value={prefs.use_shelters} />
    </OptionRow>
    <OptionRow
      label="Must have"
      value={prefs.requirements.map((requirement) => REQUIREMENTS[requirement]).join(", ") ||
        "Anything"}
    >
      <fieldset>
        <legend class="sr-only">The Kingdom must have a card with</legend>
        <div class="flex flex-wrap gap-2">
          {#each Object.entries(REQUIREMENTS) as [requirement, label] (requirement)}
            {@const required = prefs.requirements.includes(requirement as Requirement)}
            <button
              type="button"
              class={[
                "h-10 rounded-full px-4 text-[15px] font-semibold transition-colors",
                required ? "bg-accent text-on-accent" : "bg-track text-muted hover:text-ink",
              ]}
              aria-pressed={required}
              onclick={() => toggleRequirement(requirement as Requirement)}
            >
              {label}
            </button>
          {/each}
        </div>
      </fieldset>
    </OptionRow>
    <OptionRow label="Always deal" value={cardCount(prefs.include.length)}>
      {#if catalog}
        <CardPicker
          label="Always deal these cards"
          hideLabel
          cards={catalog.cards}
          bind:selected={prefs.include}
        />
      {/if}
    </OptionRow>
    <OptionRow label="Never deal" value={cardCount(prefs.exclude.length)}>
      {#if catalog}
        <CardPicker
          label="Never deal these cards"
          hideLabel
          cards={catalog.cards}
          bind:selected={prefs.exclude}
        />
      {/if}
    </OptionRow>
    <OptionRow
      label="Black Market deck"
      value={cardCount(prefs.black_market_size || DEFAULT_PREFERENCES.black_market_size)}
    >
      <label class="flex items-center gap-3 text-[15px] text-muted">
        <input
          type="number"
          min="1"
          max="60"
          bind:value={prefs.black_market_size}
          class="h-11 w-24 rounded-xl bg-track px-3.5 text-ink focus:outline-2 focus:outline-accent"
        />
        cards, if Black Market is dealt
      </label>
    </OptionRow>
  </div>

  <button
    type="button"
    class="mt-3 px-1 text-sm font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
    onclick={() => (preferences.value = structuredClone(DEFAULT_PREFERENCES))}
  >
    Reset all options
  </button>

  {#if error}
    <p
      class="mt-5 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger ring-1 ring-danger/40"
      role="alert"
    >
      {error}
    </p>
  {/if}

  {@render gameList("saved-games", "Saved games", savedGames, onremove)}
  {@render gameList("recent-games", "Recent games", recentGames)}

  <!-- under the thumb on a phone -->
  <div
    class="fixed inset-x-0 bottom-0 z-20 bg-bg px-4 pt-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] md:static md:mt-8 md:bg-transparent md:p-0"
  >
    <button
      type="button"
      class="flex h-15 w-full items-center justify-center gap-2.5 rounded-2xl bg-accent text-[19px] font-extrabold text-on-accent ring-1 ring-accent-edge transition ring-inset hover:bg-accent-strong active:scale-[0.98] disabled:cursor-wait disabled:opacity-80"
      disabled={!catalog}
      onclick={ondeal}
    >
      {#if catalog}
        <Icon name="shuffle" class="size-5.5" />
        Deal a Kingdom
      {:else}
        <span class="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
        ></span>
        Shuffling the cards…
      {/if}
    </button>
  </div>
</section>
