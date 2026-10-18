<!-- The dealt game: the Kingdom, everything else on the table, and the setup checklist. -->
<script lang="ts">
  import { prefersReducedMotion } from "svelte/motion";
  import { SvelteSet } from "svelte/reactivity";
  import {
    cardNames,
    groupKingdom,
    isLandscape,
    isSwappable,
    mergeZombies,
    setIconUrl,
    swapReplacements,
  } from "../lib/cards";
  import { preferences } from "../lib/settings.svelte";
  import { SORT_ORDERS, type Card, type Catalog, type Game, type SortOrder } from "../lib/types";
  import CardSheet from "./CardSheet.svelte";
  import Checklist from "./Checklist.svelte";
  import Cost from "./Cost.svelte";
  import Icon from "./Icon.svelte";
  import PileCard from "./PileCard.svelte";
  import Segmented from "./Segmented.svelte";

  let {
    seed,
    sortOrder,
    version,
    game,
    linkVersion,
    catalog,
    saved,
    onsort,
    onswap,
    ontogglesaved,
    ondealagain,
    onback,
  }: {
    seed: number;
    /** How the Kingdom is sorted, and so grouped. */
    sortOrder: SortOrder;
    version: string;
    game: Game;
    /** The dominion-setup version of the share link this game was opened from, if any. */
    linkVersion: string | null;
    catalog: Catalog | null;
    /** Whether the user saved this game. */
    saved: boolean;
    onsort: (sortOrder: SortOrder) => void;
    /** Swap *card* for *replacement* (or a random card); returns the error, if any. */
    onswap: (card: string, replacement: string | null) => Promise<string | null>;
    ontogglesaved: () => void;
    ondealagain: () => void;
    onback: () => void;
  } = $props();

  let openCard = $state<Card | null>(null);
  let copied = $state(false);
  let namesCopied = $state(false);
  // the mats, tokens and setup steps ticked off (a new game gets a new view)
  const done = new SvelteSet<string>();

  const selectable = $derived(new Set(catalog?.cards.map((card) => card.name)));
  const extras = $derived(
    [...game.landscapes, game.ally, game.prophecy].filter((card) => card !== null),
  );
  const excluded = $derived(openCard !== null && preferences.value.exclude.includes(openCard.name));
  // the groups, with the position of each one's first card in the deal
  const groups = $derived.by(() => {
    let start = 0;
    return groupKingdom(game.kingdom, sortOrder).map((group) => {
      const positioned = { ...group, start };
      start += group.cards.length;
      return positioned;
    });
  });
  const showIcons = import.meta.env.VITE_CARD_IMAGES !== "false";
  const setupCount = $derived(game.materials.length + game.setup.length);
  const sections = $derived([
    { id: "kingdom", label: "Kingdom", count: "" },
    ...(extras.length ? [{ id: "landscapes", label: "Landscapes", count: "" }] : []),
    { id: "supply", label: "Supply", count: "" },
    ...(game.non_supply.length ? [{ id: "non-supply", label: "Non-Supply", count: "" }] : []),
    ...(game.black_market.length ? [{ id: "black-market", label: "Black Market", count: "" }] : []),
    ...(setupCount ? [{ id: "setup", label: "Setup", count: `${done.size}/${setupCount}` }] : []),
  ]);

  const open = (card: Card) => (openCard = card);

  function jump(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: prefersReducedMotion.current ? "instant" : "smooth" });
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "A Dominion Kingdom",
          text: cardNames(game),
          url: location.href,
        });
      } catch {
        // the user closed the share sheet
      }
      return;
    }
    await navigator.clipboard.writeText(location.href);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  // e.g. to paste into dominion.games
  async function copyNames() {
    await navigator.clipboard.writeText(cardNames(game));
    namesCopied = true;
    setTimeout(() => (namesCopied = false), 2000);
  }

  async function swap(replacement: string | null): Promise<string | null> {
    if (!openCard) return null;
    const error = await onswap(openCard.name, replacement);
    if (!error) openCard = null;
    return error;
  }

  function toggleExclude() {
    if (!openCard) return;
    const name = openCard.name;
    const prefs = preferences.value;
    prefs.exclude = prefs.exclude.includes(name)
      ? prefs.exclude.filter((other) => other !== name)
      : [...prefs.exclude, name];
  }
</script>

{#snippet heading(id: string, title: string)}
  <h3 {id} class="px-0.5 text-[15px] font-semibold text-muted">{title}</h3>
{/snippet}

{#snippet piles(id: string, title: string, cards: Card[], size: boolean)}
  <section {id} aria-labelledby="{id}-heading" class="scroll-mt-20">
    {@render heading(`${id}-heading`, title)}
    <ul
      aria-label={title}
      class="mt-2.5 grid grid-cols-3 gap-2.5 md:grid-cols-[repeat(auto-fill,minmax(5rem,1fr))]"
    >
      {#each cards as card (card.name)}
        <li>
          <PileCard
            {card}
            small
            icon={!size}
            {size}
            index={game.kingdom.length + extras.length}
            sizes={isLandscape(card)
              ? "(min-width: 768px) 11.25rem, 48vw"
              : "(min-width: 768px) 7rem, 30vw"}
            onopen={open}
          />
        </li>
      {/each}
    </ul>
  </section>
{/snippet}

<div class="flex items-center justify-between gap-2">
  <button
    type="button"
    class="-ml-2 inline-flex h-11 items-center gap-1 rounded-xl pr-3 pl-1.5 font-medium text-muted hover:bg-surface-2 hover:text-ink"
    onclick={onback}
  >
    <Icon name="back" />
    Options
  </button>
  <div class="flex gap-2.5">
    <button
      type="button"
      class="inline-flex h-11 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-surface-2 md:h-12 md:bg-surface md:px-4.5 md:ring-1 md:ring-edge"
      onclick={ontogglesaved}
      aria-label={saved ? "Saved" : "Save game"}
    >
      <Icon name={saved ? "bookmarked" : "bookmark"} />
      <span class="hidden md:inline">{saved ? "Saved" : "Save"}</span>
    </button>
    <button
      type="button"
      class="inline-flex h-11 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-surface-2 md:h-12 md:bg-surface md:px-4.5 md:ring-1 md:ring-edge"
      onclick={copyNames}
      aria-label={namesCopied ? "Names copied" : "Copy card names"}
    >
      <Icon name={namesCopied ? "check" : "copy"} />
      <span class="hidden md:inline">{namesCopied ? "Names copied" : "Copy names"}</span>
    </button>
    <button
      type="button"
      class="inline-flex h-11 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-surface-2 md:h-12 md:bg-surface md:px-4.5 md:ring-1 md:ring-edge"
      onclick={share}
      aria-label={copied ? "Link copied" : "Share"}
    >
      <Icon name={copied ? "check" : "share"} />
      <span class="hidden md:inline">{copied ? "Link copied" : "Share"}</span>
    </button>
    <button
      type="button"
      class="hidden h-12 items-center gap-2 rounded-xl bg-accent px-5.5 font-extrabold text-on-accent ring-1 ring-accent-edge ring-inset hover:bg-accent-strong md:inline-flex"
      onclick={ondealagain}
    >
      <Icon name="shuffle" />
      Deal again
    </button>
  </div>
</div>

<header class="mt-1">
  <h2 class="text-[28px] leading-tight font-extrabold md:text-[34px]">Your Kingdom</h2>
  <p class="mt-1.5 text-[15px] leading-relaxed text-muted">
    Seed {seed}{game.players ? `, for ${game.players} players` : ""}. {game.sets.join(", ")}.
  </p>
</header>

{#if linkVersion && linkVersion !== version}
  <p class="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm" role="status">
    This link was made with a different card list ({linkVersion}, now {version}), so the Kingdom may
    differ from the one that was shared.
  </p>
{/if}

<!-- buttons to each section, on a phone -->
<nav
  aria-label="Sections"
  class="sticky top-0 z-10 -mx-4 mt-3 flex gap-1.5 overflow-x-auto bg-bg/95 px-4 py-2 backdrop-blur md:hidden"
>
  {#each sections as section (section.id)}
    <button
      type="button"
      class="inline-flex h-11 flex-auto items-center justify-center gap-1.5 rounded-xl bg-surface px-2.5 text-sm font-semibold whitespace-nowrap ring-1 ring-edge"
      onclick={() => jump(section.id)}
    >
      {section.label}
      {#if section.count}<span class="font-medium text-muted tabular-nums">{section.count}</span
        >{/if}
    </button>
  {/each}
</nav>

<div class="mt-4 flex flex-col gap-7 md:mt-7 lg:flex-row lg:items-start lg:gap-8">
  <div class="flex min-w-0 flex-1 flex-col gap-7">
    <section id="kingdom" aria-labelledby="kingdom-heading" class="scroll-mt-20">
      <div class="flex items-center justify-between gap-3">
        {@render heading("kingdom-heading", "Kingdom")}
        <Segmented
          label="Sort the Kingdom by"
          hideLabel
          choices={Object.entries(SORT_ORDERS).map(([value, label]) => ({
            value: value as SortOrder,
            label,
          }))}
          bind:value={() => sortOrder, onsort}
        />
      </div>
      <!-- the groups in a column, each with its label at the side, on a phone; side by side, each
           with its label above, on a larger screen -->
      <ul
        aria-label="Kingdom"
        class="mt-2.5 flex flex-col gap-3.5 md:flex-row md:flex-wrap md:gap-x-7 md:gap-y-6"
      >
        {#each groups as group, i (i)}
          <li class="flex items-start gap-2.5 md:max-w-full md:flex-col">
            {#if group.key}
              <div
                class="flex w-11 shrink-0 justify-center pt-0.5 md:h-8 md:w-full md:items-center md:justify-start md:gap-2.5 md:pt-0"
              >
                {#if sortOrder === "cost"}
                  <Cost
                    card={group.cards[0]!}
                    class="text-[19px] max-md:flex-wrap max-md:justify-center md:text-[17px]"
                  />
                {:else if showIcons}
                  <span
                    class="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 md:size-8"
                  >
                    <img
                      src={setIconUrl(group.cards[0]!.set)}
                      alt=""
                      class="size-5.5 object-contain brightness-0 md:size-5 dark:invert"
                      onerror={(event) => event.currentTarget.classList.add("hidden")}
                    />
                  </span>
                  <span class="sr-only text-[15px] font-semibold whitespace-nowrap md:not-sr-only">
                    {group.key}
                  </span>
                {:else}
                  <span
                    class="text-sm font-semibold max-md:[writing-mode:vertical-rl] md:text-[15px]"
                  >
                    {group.key}
                  </span>
                {/if}
                <span aria-hidden="true" class="hidden h-px min-w-3 flex-1 bg-muted/25 md:block"
                ></span>
              </div>
            {/if}
            <ul class="grid min-w-0 flex-1 grid-cols-2 gap-2.5 md:flex md:flex-wrap md:gap-3">
              {#each group.cards as card, j (card.name)}
                <li class="md:w-38">
                  <PileCard
                    {card}
                    index={group.start + j}
                    icon={sortOrder !== "set"}
                    sizes="(min-width: 768px) 152px, 42vw"
                    onopen={open}
                  />
                </li>
              {/each}
            </ul>
          </li>
        {/each}
      </ul>
    </section>

    {#if extras.length}
      <section id="landscapes" aria-labelledby="landscapes-heading" class="scroll-mt-20">
        {@render heading("landscapes-heading", "Landscapes")}
        <!-- on a larger screen as wide as a Kingdom card is tall -->
        <ul aria-label="Landscapes" class="mt-2.5 grid gap-2.5 md:flex md:flex-wrap md:gap-3">
          {#each extras as card, i (card.name)}
            <li class="md:w-60">
              <PileCard
                {card}
                index={game.kingdom.length + i}
                sizes="(min-width: 768px) 240px, 92vw"
                onopen={open}
              />
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if game.druid_boons.length}
      <section aria-labelledby="druid-boons-heading">
        {@render heading("druid-boons-heading", "Druid's Boons")}
        <ul
          aria-label="Druid's Boons"
          class="mt-2.5 grid grid-cols-2 gap-2.5 md:flex md:flex-wrap md:gap-3"
        >
          {#each game.druid_boons as card (card.name)}
            <li class="md:w-60">
              <PileCard {card} sizes="(min-width: 768px) 240px, 45vw" onopen={open} />
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {@render piles("supply", "Basic Supply", game.basic_supply, true)}
    {#if game.non_supply.length}
      {@render piles("non-supply", "Non-Supply piles", mergeZombies(game.non_supply), true)}
    {/if}
    {#if game.black_market.length}
      {@render piles("black-market", "Black Market deck", game.black_market, false)}
    {/if}
  </div>

  {#if setupCount}
    <!-- separate cards on a phone, one panel at the side on a larger screen -->
    <aside
      id="setup"
      aria-labelledby="setup-heading"
      class="flex scroll-mt-20 flex-col gap-2.5 lg:w-88 lg:shrink-0 lg:gap-4 lg:rounded-2xl lg:bg-surface lg:p-5 lg:ring-1 lg:ring-edge"
    >
      <div class="flex items-baseline justify-between gap-3 px-0.5">
        <h3
          id="setup-heading"
          class="text-[15px] font-semibold text-muted lg:text-xl lg:font-extrabold lg:text-ink"
        >
          Setup
        </h3>
        <span class="text-[15px] text-muted tabular-nums">{done.size} of {setupCount} done</span>
      </div>
      <div
        class="mb-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-label="Setup"
        aria-valuemin={0}
        aria-valuemax={setupCount}
        aria-valuenow={done.size}
      >
        <div
          class="h-full rounded-full bg-accent transition-[width]"
          style:width="{(done.size / setupCount) * 100}%"
        ></div>
      </div>
      {#if game.materials.length}
        <Checklist title="Get out" items={game.materials} {done} images />
      {/if}
      {#if game.setup.length}
        <Checklist title="Set up" items={game.setup} {done} />
      {/if}
    </aside>
  {/if}
</div>

<!-- under the thumb on a phone -->
<div
  class="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bar px-4 pt-3.5 pb-[max(1.75rem,env(safe-area-inset-bottom))] md:hidden"
>
  <button
    type="button"
    class="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-accent text-lg font-extrabold text-on-accent ring-1 ring-accent-edge ring-inset active:scale-[0.98]"
    onclick={ondealagain}
  >
    <Icon name="shuffle" class="size-5.5" />
    Deal again
  </button>
</div>

<CardSheet
  card={openCard}
  onclose={() => (openCard = null)}
  {excluded}
  ontoggleexclude={openCard && selectable.has(openCard.name) ? toggleExclude : undefined}
  replacements={openCard && catalog ? swapReplacements(catalog.cards, game, openCard) : []}
  onswap={openCard && isSwappable(game, openCard) ? swap : undefined}
/>
